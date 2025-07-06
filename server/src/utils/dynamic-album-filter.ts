import { Kysely, SelectQueryBuilder, sql } from 'kysely';
import { DynamicAlbumFilterOperator, DynamicAlbumFilterType } from 'src/enum';
import { DB } from 'src/schema';
import { hasTags, withDefaultVisibility } from 'src/utils/database';

export interface DynamicAlbumFilter {
  type: DynamicAlbumFilterType;
  value: any;
}

export interface DynamicAlbumFilterOptions {
  userId: string;
  skip?: number;
  take?: number;
  order?: 'asc' | 'desc';
}

export function buildDynamicAlbumAssetQuery(
  db: Kysely<DB>,
  filters: DynamicAlbumFilter[],
  options: DynamicAlbumFilterOptions,
) {
  let query = db
    .selectFrom('assets')
    .selectAll('assets')
    .$call(withDefaultVisibility)
    .where('assets.ownerId', '=', options.userId)
    .where('assets.deletedAt', 'is', null);

  // Apply filters
  for (const filter of filters) {
    query = applyFilter(query, filter);
  }

  // Apply pagination and ordering
  if (options.skip !== undefined) {
    query = query.offset(options.skip);
  }
  if (options.take !== undefined) {
    query = query.limit(options.take);
  }
  if (options.order) {
    query = query.orderBy('assets.fileCreatedAt', options.order);
  }

  return query;
}

function applyFilter<O>(
  qb: SelectQueryBuilder<DB, 'assets', O>,
  filter: DynamicAlbumFilter,
): SelectQueryBuilder<DB, 'assets', O> {
  switch (filter.type) {
    case DynamicAlbumFilterType.TAG: {
      return applyTagFilter(qb, filter.value);
    }
    case DynamicAlbumFilterType.PERSON: {
      return applyPersonFilter(qb, filter.value);
    }
    case DynamicAlbumFilterType.LOCATION: {
      return applyLocationFilter(qb, filter.value);
    }
    case DynamicAlbumFilterType.DATE_RANGE: {
      return applyDateRangeFilter(qb, filter.value);
    }
    case DynamicAlbumFilterType.ASSET_TYPE: {
      return applyAssetTypeFilter(qb, filter.value);
    }
    case DynamicAlbumFilterType.METADATA: {
      return applyMetadataFilter(qb, filter.value);
    }
    default: {
      return qb;
    }
  }
}

function applyTagFilter<O>(
  qb: SelectQueryBuilder<DB, 'assets', O>,
  value: { tagIds: string[]; operator: DynamicAlbumFilterOperator },
): SelectQueryBuilder<DB, 'assets', O> {
  if (!value.tagIds || value.tagIds.length === 0) {
    return qb;
  }

  return value.operator === DynamicAlbumFilterOperator.AND
    ? hasTags(qb, value.tagIds) // All tags must be present
    : qb.where((eb) =>
        eb.exists(
          eb
            .selectFrom('tag_asset')
            .innerJoin('tags_closure', 'tag_asset.tagsId', 'tags_closure.id_descendant')
            .whereRef('tag_asset.assetsId', '=', 'assets.id')
            .where('tags_closure.id_ancestor', 'in', value.tagIds),
        ),
      ); // Any tag can be present (OR logic)
}

function applyPersonFilter<O>(
  qb: SelectQueryBuilder<DB, 'assets', O>,
  value: { personIds: string[]; operator: DynamicAlbumFilterOperator },
): SelectQueryBuilder<DB, 'assets', O> {
  if (!value.personIds || value.personIds.length === 0) {
    return qb;
  }

  return value.operator === DynamicAlbumFilterOperator.AND
    ? qb.where((eb) =>
        eb.exists(
          eb
            .selectFrom('asset_faces')
            .whereRef('asset_faces.assetId', '=', 'assets.id')
            .where('asset_faces.personId', 'in', value.personIds)
            .groupBy('asset_faces.assetId')
            .having(sql`count(distinct asset_faces.personId)`, '>=', value.personIds.length),
        ),
      ) // All people must be present
    : qb.where((eb) =>
        eb.exists(
          eb
            .selectFrom('asset_faces')
            .whereRef('asset_faces.assetId', '=', 'assets.id')
            .where('asset_faces.personId', 'in', value.personIds),
        ),
      ); // Any person can be present (OR logic)
}

function applyLocationFilter<O>(
  qb: SelectQueryBuilder<DB, 'assets', O>,
  value: { cities?: string[]; countries?: string[]; states?: string[] },
): SelectQueryBuilder<DB, 'assets', O> {
  const conditions: any[] = [];

  if (value.cities && value.cities.length > 0) {
    conditions.push(sql`exif.city = any(${value.cities})`);
  }
  if (value.countries && value.countries.length > 0) {
    conditions.push(sql`exif.country = any(${value.countries})`);
  }
  if (value.states && value.states.length > 0) {
    conditions.push(sql`exif.state = any(${value.states})`);
  }

  if (conditions.length === 0) {
    return qb;
  }

  return qb.innerJoin('exif', 'assets.id', 'exif.assetId').where((eb) => eb.or(conditions));
}

function applyDateRangeFilter<O>(
  qb: SelectQueryBuilder<DB, 'assets', O>,
  value: { startDate: string; endDate: string; field: 'capture' | 'upload' },
): SelectQueryBuilder<DB, 'assets', O> {
  const startDate = new Date(value.startDate);
  const endDate = new Date(value.endDate);

  return value.field === 'capture'
    ? qb.where('assets.fileCreatedAt', '>=', startDate).where('assets.fileCreatedAt', '<=', endDate)
    : qb.where('assets.createdAt', '>=', startDate).where('assets.createdAt', '<=', endDate);
}

function applyAssetTypeFilter<O>(
  qb: SelectQueryBuilder<DB, 'assets', O>,
  value: { types?: string[]; favorites?: boolean | null },
): SelectQueryBuilder<DB, 'assets', O> {
  if (value.types && value.types.length > 0) {
    qb = qb.where('assets.type', 'in', value.types);
  }

  if (value.favorites !== null && value.favorites !== undefined) {
    qb = qb.where('assets.isFavorite', '=', value.favorites);
  }

  return qb;
}

function applyMetadataFilter<O>(
  qb: SelectQueryBuilder<DB, 'assets', O>,
  _value: any,
): SelectQueryBuilder<DB, 'assets', O> {
  // Placeholder for metadata filters
  // This can be extended based on specific metadata requirements
  return qb;
}

export function buildDynamicAlbumAssetCountQuery(db: Kysely<DB>, filters: DynamicAlbumFilter[], userId: string) {
  let query = db
    .selectFrom('assets')
    .select((eb) => [
      eb.fn.count('assets.id').as('assetCount'),
      eb.fn.min('assets.fileCreatedAt').as('startDate'),
      eb.fn.max('assets.fileCreatedAt').as('endDate'),
    ])
    .$call(withDefaultVisibility)
    .where('assets.ownerId', '=', userId)
    .where('assets.deletedAt', 'is', null);

  // Apply filters
  for (const filter of filters) {
    query = applyFilter(query, filter);
  }

  return query;
}
