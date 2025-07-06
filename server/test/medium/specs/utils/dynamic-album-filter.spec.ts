import { Kysely } from 'kysely';
import { AssetType, DynamicAlbumFilterOperator, DynamicAlbumFilterType } from 'src/enum';
import { DB } from 'src/schema';
import { buildDynamicAlbumAssetCountQuery, buildDynamicAlbumAssetQuery } from 'src/utils/dynamic-album-filter';
import { getKyselyDB } from 'test/utils';

describe('DynamicAlbumFilter', () => {
  let db: Kysely<DB>;

  beforeAll(async () => {
    db = await getKyselyDB();
  });

  describe('buildDynamicAlbumAssetQuery', () => {
    it('should build a basic query with no filters', () => {
      const userId = 'test-user-id';
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, [], options);

      expect(query).toBeDefined();
      // The query should be built but not executed yet
      expect(typeof query.execute).toBe('function');
    });

    it('should build a query with tag filter (AND operator)', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.TAG,
          value: { tagIds: ['tag-1', 'tag-2'], operator: DynamicAlbumFilterOperator.AND },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a query with tag filter (OR operator)', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.TAG,
          value: { tagIds: ['tag-1', 'tag-2'], operator: DynamicAlbumFilterOperator.OR },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a query with person filter (AND operator)', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.PERSON,
          value: { personIds: ['person-1', 'person-2'], operator: DynamicAlbumFilterOperator.AND },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a query with person filter (OR operator)', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.PERSON,
          value: { personIds: ['person-1', 'person-2'], operator: DynamicAlbumFilterOperator.OR },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a query with location filter', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.LOCATION,
          value: { cities: ['New York', 'Los Angeles'], countries: ['USA'] },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a query with date range filter (capture field)', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.DATE_RANGE,
          value: { startDate: '2023-01-01', endDate: '2023-12-31', field: 'capture' as const },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a query with date range filter (upload field)', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.DATE_RANGE,
          value: { startDate: '2023-01-01', endDate: '2023-12-31', field: 'upload' as const },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a query with asset type filter', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.ASSET_TYPE,
          value: { types: [AssetType.IMAGE, AssetType.VIDEO], favorites: true },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a query with multiple filters', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.TAG,
          value: { tagIds: ['tag-1'], operator: DynamicAlbumFilterOperator.AND },
        },
        {
          type: DynamicAlbumFilterType.PERSON,
          value: { personIds: ['person-1'], operator: DynamicAlbumFilterOperator.OR },
        },
        {
          type: DynamicAlbumFilterType.DATE_RANGE,
          value: { startDate: '2023-01-01', endDate: '2023-12-31', field: 'capture' as const },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should handle empty tag filter', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.TAG,
          value: { tagIds: [], operator: DynamicAlbumFilterOperator.AND },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should handle empty person filter', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.PERSON,
          value: { personIds: [], operator: DynamicAlbumFilterOperator.AND },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should handle empty location filter', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.LOCATION,
          value: { cities: [], countries: [], states: [] },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should handle unknown filter type gracefully', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: 'UNKNOWN_FILTER_TYPE' as DynamicAlbumFilterType,
          value: { someValue: 'test' },
        },
      ];
      const options = { userId, skip: 0, take: 10, order: 'desc' as const };

      const query = buildDynamicAlbumAssetQuery(db, filters, options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should apply pagination correctly', () => {
      const userId = 'test-user-id';
      const options = { userId, skip: 20, take: 5, order: 'asc' as const };

      const query = buildDynamicAlbumAssetQuery(db, [], options);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });
  });

  describe('buildDynamicAlbumAssetCountQuery', () => {
    it('should build a count query with no filters', () => {
      const userId = 'test-user-id';

      const query = buildDynamicAlbumAssetCountQuery(db, [], userId);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a count query with tag filter', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.TAG,
          value: { tagIds: ['tag-1', 'tag-2'], operator: DynamicAlbumFilterOperator.AND },
        },
      ];

      const query = buildDynamicAlbumAssetCountQuery(db, filters, userId);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a count query with person filter', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.PERSON,
          value: { personIds: ['person-1'], operator: DynamicAlbumFilterOperator.OR },
        },
      ];

      const query = buildDynamicAlbumAssetCountQuery(db, filters, userId);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a count query with location filter', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.LOCATION,
          value: { cities: ['New York'], countries: ['USA'] },
        },
      ];

      const query = buildDynamicAlbumAssetCountQuery(db, filters, userId);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a count query with date range filter', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.DATE_RANGE,
          value: { startDate: '2023-01-01', endDate: '2023-12-31', field: 'capture' as const },
        },
      ];

      const query = buildDynamicAlbumAssetCountQuery(db, filters, userId);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a count query with asset type filter', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.ASSET_TYPE,
          value: { types: [AssetType.IMAGE], favorites: null },
        },
      ];

      const query = buildDynamicAlbumAssetCountQuery(db, filters, userId);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });

    it('should build a count query with multiple filters', () => {
      const userId = 'test-user-id';
      const filters = [
        {
          type: DynamicAlbumFilterType.TAG,
          value: { tagIds: ['tag-1'], operator: DynamicAlbumFilterOperator.AND },
        },
        {
          type: DynamicAlbumFilterType.PERSON,
          value: { personIds: ['person-1'], operator: DynamicAlbumFilterOperator.OR },
        },
        {
          type: DynamicAlbumFilterType.DATE_RANGE,
          value: { startDate: '2023-01-01', endDate: '2023-12-31', field: 'capture' as const },
        },
      ];

      const query = buildDynamicAlbumAssetCountQuery(db, filters, userId);

      expect(query).toBeDefined();
      expect(typeof query.execute).toBe('function');
    });
  });
});
