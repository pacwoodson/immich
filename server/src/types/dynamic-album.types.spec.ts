import {
  DateRangeFilter,
  DynamicAlbumFilters,
  isDynamicAlbumFilters,
  isDateRangeFilter,
  isLocationFilter,
  isMetadataFilter,
  LocationFilter,
  MetadataFilter,
  sanitizeDynamicAlbumFilters,
  validateDynamicAlbumFilters,
} from './dynamic-album.types';

describe('DynamicAlbumTypes', () => {
  describe('isLocationFilter', () => {
    it('should return true for valid LocationFilter with city', () => {
      expect(isLocationFilter({ city: 'San Francisco' })).toBe(true);
    });

    it('should return true for valid LocationFilter with state', () => {
      expect(isLocationFilter({ state: 'California' })).toBe(true);
    });

    it('should return true for valid LocationFilter with country', () => {
      expect(isLocationFilter({ country: 'USA' })).toBe(true);
    });

    it('should return true for valid LocationFilter with all fields', () => {
      expect(isLocationFilter({ city: 'San Francisco', state: 'California', country: 'USA' })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isLocationFilter(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isLocationFilter(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isLocationFilter({})).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isLocationFilter('string')).toBe(false);
      expect(isLocationFilter(123)).toBe(false);
      expect(isLocationFilter(true)).toBe(false);
    });

    it('should return false for invalid field types', () => {
      expect(isLocationFilter({ city: 123 })).toBe(false);
      expect(isLocationFilter({ state: true })).toBe(false);
      expect(isLocationFilter({ country: null })).toBe(false);
    });
  });

  describe('isDateRangeFilter', () => {
    it('should return true for valid DateRangeFilter with Date objects', () => {
      expect(isDateRangeFilter({ start: new Date('2024-01-01'), end: new Date('2024-12-31') })).toBe(true);
    });

    it('should return true for valid DateRangeFilter with date strings', () => {
      expect(isDateRangeFilter({ start: '2024-01-01', end: '2024-12-31' })).toBe(true);
    });

    it('should return true for mixed Date objects and strings', () => {
      expect(isDateRangeFilter({ start: new Date('2024-01-01'), end: '2024-12-31' })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isDateRangeFilter(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isDateRangeFilter(undefined)).toBe(false);
    });

    it('should return false for missing start', () => {
      expect(isDateRangeFilter({ end: '2024-12-31' })).toBe(false);
    });

    it('should return false for missing end', () => {
      expect(isDateRangeFilter({ start: '2024-01-01' })).toBe(false);
    });

    it('should return false for invalid date strings', () => {
      expect(isDateRangeFilter({ start: 'invalid', end: '2024-12-31' })).toBe(false);
      expect(isDateRangeFilter({ start: '2024-01-01', end: 'invalid' })).toBe(false);
    });

    it('should return false for non-date values', () => {
      expect(isDateRangeFilter({ start: 123, end: '2024-12-31' })).toBe(false);
      expect(isDateRangeFilter({ start: '2024-01-01', end: true })).toBe(false);
    });

    it('should return false for invalid Date objects', () => {
      expect(isDateRangeFilter({ start: new Date('invalid'), end: new Date('2024-12-31') })).toBe(false);
    });
  });

  describe('isMetadataFilter', () => {
    it('should return true for empty metadata object', () => {
      expect(isMetadataFilter({})).toBe(true);
    });

    it('should return true for valid isFavorite', () => {
      expect(isMetadataFilter({ isFavorite: true })).toBe(true);
      expect(isMetadataFilter({ isFavorite: false })).toBe(true);
    });

    it('should return true for valid make', () => {
      expect(isMetadataFilter({ make: 'Sony' })).toBe(true);
    });

    it('should return true for valid model', () => {
      expect(isMetadataFilter({ model: 'A7III' })).toBe(true);
    });

    it('should return true for valid lensModel', () => {
      expect(isMetadataFilter({ lensModel: 'FE 24-70mm F2.8 GM' })).toBe(true);
    });

    it('should return true for valid rating', () => {
      expect(isMetadataFilter({ rating: 0 })).toBe(true);
      expect(isMetadataFilter({ rating: 3 })).toBe(true);
      expect(isMetadataFilter({ rating: 5 })).toBe(true);
    });

    it('should return true for all valid fields', () => {
      expect(
        isMetadataFilter({
          isFavorite: true,
          make: 'Sony',
          model: 'A7III',
          lensModel: 'FE 24-70mm',
          rating: 5,
        }),
      ).toBe(true);
    });

    it('should return false for null', () => {
      expect(isMetadataFilter(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isMetadataFilter(undefined)).toBe(false);
    });

    it('should return false for invalid isFavorite type', () => {
      expect(isMetadataFilter({ isFavorite: 'true' })).toBe(false);
      expect(isMetadataFilter({ isFavorite: 1 })).toBe(false);
    });

    it('should return false for invalid string field types', () => {
      expect(isMetadataFilter({ make: 123 })).toBe(false);
      expect(isMetadataFilter({ model: true })).toBe(false);
      expect(isMetadataFilter({ lensModel: null })).toBe(false);
    });

    it('should return false for invalid rating', () => {
      expect(isMetadataFilter({ rating: -1 })).toBe(false);
      expect(isMetadataFilter({ rating: 6 })).toBe(false);
      expect(isMetadataFilter({ rating: 3.5 })).toBe(true); // Decimals are valid
      expect(isMetadataFilter({ rating: 'three' })).toBe(false);
    });
  });

  describe('isDynamicAlbumFilters', () => {
    it('should return true for empty filters', () => {
      expect(isDynamicAlbumFilters({})).toBe(true);
    });

    it('should return true for valid tags', () => {
      expect(isDynamicAlbumFilters({ tags: ['tag1', 'tag2'] })).toBe(true);
    });

    it('should return true for valid people', () => {
      expect(isDynamicAlbumFilters({ people: ['person1', 'person2'] })).toBe(true);
    });

    it('should return true for valid location string', () => {
      expect(isDynamicAlbumFilters({ location: 'San Francisco' })).toBe(true);
    });

    it('should return true for valid LocationFilter', () => {
      expect(isDynamicAlbumFilters({ location: { city: 'San Francisco' } })).toBe(true);
    });

    it('should return true for valid dateRange', () => {
      expect(isDynamicAlbumFilters({ dateRange: { start: '2024-01-01', end: '2024-12-31' } })).toBe(true);
    });

    it('should return true for valid assetType', () => {
      expect(isDynamicAlbumFilters({ assetType: 'IMAGE' })).toBe(true);
      expect(isDynamicAlbumFilters({ assetType: 'VIDEO' })).toBe(true);
    });

    it('should return true for valid metadata', () => {
      expect(isDynamicAlbumFilters({ metadata: { make: 'Sony', rating: 5 } })).toBe(true);
    });

    it('should return true for valid operator', () => {
      expect(isDynamicAlbumFilters({ operator: 'and' })).toBe(true);
      expect(isDynamicAlbumFilters({ operator: 'or' })).toBe(true);
    });

    it('should return true for all valid filters', () => {
      const filters: DynamicAlbumFilters = {
        tags: ['tag1'],
        people: ['person1'],
        location: { city: 'SF' },
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        assetType: 'IMAGE',
        metadata: { isFavorite: true },
        operator: 'and',
      };
      expect(isDynamicAlbumFilters(filters)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isDynamicAlbumFilters(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isDynamicAlbumFilters(undefined)).toBe(false);
    });

    it('should return false for non-array tags', () => {
      expect(isDynamicAlbumFilters({ tags: 'tag1' })).toBe(false);
    });

    it('should return false for tags with non-string elements', () => {
      expect(isDynamicAlbumFilters({ tags: ['tag1', 123] })).toBe(false);
    });

    it('should return false for non-array people', () => {
      expect(isDynamicAlbumFilters({ people: 'person1' })).toBe(false);
    });

    it('should return false for people with non-string elements', () => {
      expect(isDynamicAlbumFilters({ people: ['person1', true] })).toBe(false);
    });

    it('should return false for invalid location', () => {
      expect(isDynamicAlbumFilters({ location: 123 })).toBe(false);
      expect(isDynamicAlbumFilters({ location: {} })).toBe(false);
    });

    it('should return false for invalid dateRange', () => {
      expect(isDynamicAlbumFilters({ dateRange: 'invalid' })).toBe(false);
      expect(isDynamicAlbumFilters({ dateRange: { start: 'invalid' } })).toBe(false);
    });

    it('should return false for invalid assetType', () => {
      expect(isDynamicAlbumFilters({ assetType: 'AUDIO' })).toBe(false);
      expect(isDynamicAlbumFilters({ assetType: 'image' })).toBe(false); // case-sensitive
    });

    it('should return false for invalid metadata', () => {
      expect(isDynamicAlbumFilters({ metadata: { rating: 10 } })).toBe(false);
    });

    it('should return false for invalid operator', () => {
      expect(isDynamicAlbumFilters({ operator: 'xor' })).toBe(false);
      expect(isDynamicAlbumFilters({ operator: 'AND' })).toBe(false); // case-sensitive
    });
  });

  describe('validateDynamicAlbumFilters', () => {
    it('should validate empty filters with warning', () => {
      const result = validateDynamicAlbumFilters({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContain('No filters specified - dynamic album will include all assets');
    });

    it('should validate valid filters', () => {
      const filters: DynamicAlbumFilters = {
        tags: ['tag1', 'tag2'],
        people: ['person1'],
        location: 'San Francisco',
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        assetType: 'IMAGE',
        metadata: { isFavorite: true, make: 'Sony' },
        operator: 'and',
      };
      const result = validateDynamicAlbumFilters(filters);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object filters', () => {
      const result = validateDynamicAlbumFilters('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('filters');
      expect(result.errors[0].message).toBe('Filters must be an object');
    });

    it('should reject non-array tags', () => {
      const result = validateDynamicAlbumFilters({ tags: 'tag1' });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('tags');
    });

    it('should warn about empty tags array', () => {
      const result = validateDynamicAlbumFilters({ tags: [] });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Tags array is empty');
    });

    it('should reject tags with non-string elements', () => {
      const result = validateDynamicAlbumFilters({ tags: ['tag1', 123] });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('tags');
    });

    it('should warn about duplicate tags', () => {
      const result = validateDynamicAlbumFilters({ tags: ['tag1', 'tag1', 'tag2'] });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Tags array contains duplicates');
    });

    it('should reject non-array people', () => {
      const result = validateDynamicAlbumFilters({ people: 'person1' });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('people');
    });

    it('should warn about empty people array', () => {
      const result = validateDynamicAlbumFilters({ people: [] });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('People array is empty');
    });

    it('should warn about duplicate people', () => {
      const result = validateDynamicAlbumFilters({ people: ['person1', 'person1'] });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('People array contains duplicates');
    });

    it('should reject empty location string', () => {
      const result = validateDynamicAlbumFilters({ location: '   ' });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('location');
    });

    it('should accept valid location string', () => {
      const result = validateDynamicAlbumFilters({ location: 'Paris' });
      expect(result.isValid).toBe(true);
    });

    it('should accept valid LocationFilter', () => {
      const result = validateDynamicAlbumFilters({ location: { city: 'Paris' } });
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid LocationFilter', () => {
      const result = validateDynamicAlbumFilters({ location: { city: 123 } });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('location');
    });

    it('should reject missing dateRange.start', () => {
      const result = validateDynamicAlbumFilters({ dateRange: { end: '2024-12-31' } });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'dateRange.start')).toBe(true);
    });

    it('should reject missing dateRange.end', () => {
      const result = validateDynamicAlbumFilters({ dateRange: { start: '2024-01-01' } });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'dateRange.end')).toBe(true);
    });

    it('should reject invalid dateRange.start', () => {
      const result = validateDynamicAlbumFilters({ dateRange: { start: 'invalid', end: '2024-12-31' } });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'dateRange.start')).toBe(true);
    });

    it('should reject invalid dateRange.end', () => {
      const result = validateDynamicAlbumFilters({ dateRange: { start: '2024-01-01', end: 'invalid' } });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'dateRange.end')).toBe(true);
    });

    it('should reject dateRange where start > end', () => {
      const result = validateDynamicAlbumFilters({ dateRange: { start: '2024-12-31', end: '2024-01-01' } });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'dateRange')).toBe(true);
    });

    it('should accept dateRange where start equals end', () => {
      const result = validateDynamicAlbumFilters({ dateRange: { start: '2024-01-01', end: '2024-01-01' } });
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid assetType', () => {
      const result = validateDynamicAlbumFilters({ assetType: 'AUDIO' });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('assetType');
    });

    it('should accept valid assetTypes', () => {
      expect(validateDynamicAlbumFilters({ assetType: 'IMAGE' }).isValid).toBe(true);
      expect(validateDynamicAlbumFilters({ assetType: 'VIDEO' }).isValid).toBe(true);
    });

    it('should reject non-object metadata', () => {
      const result = validateDynamicAlbumFilters({ metadata: 'invalid' });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('metadata');
    });

    it('should reject invalid metadata.isFavorite', () => {
      const result = validateDynamicAlbumFilters({ metadata: { isFavorite: 'true' } });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('metadata.isFavorite');
    });

    it('should reject invalid metadata.rating', () => {
      const result = validateDynamicAlbumFilters({ metadata: { rating: 10 } });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('metadata.rating');
    });

    it('should reject invalid operator', () => {
      const result = validateDynamicAlbumFilters({ operator: 'xor' });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('operator');
    });

    it('should handle multiple errors', () => {
      const result = validateDynamicAlbumFilters({
        tags: 'invalid',
        people: 123,
        assetType: 'AUDIO',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  describe('sanitizeDynamicAlbumFilters', () => {
    it('should return default filters for non-object input', () => {
      expect(sanitizeDynamicAlbumFilters(null)).toEqual({ operator: 'or' });
      expect(sanitizeDynamicAlbumFilters(undefined)).toEqual({ operator: 'or' });
      expect(sanitizeDynamicAlbumFilters('invalid')).toEqual({ operator: 'or' });
    });

    it('should sanitize tags by removing non-strings and duplicates', () => {
      const result = sanitizeDynamicAlbumFilters({
        tags: ['tag1', 'tag2', 'tag1', 123, '', '  ', 'tag3'],
      });
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should remove empty tags array', () => {
      const result = sanitizeDynamicAlbumFilters({ tags: [] });
      expect(result.tags).toBeUndefined();
    });

    it('should sanitize people by removing non-strings and duplicates', () => {
      const result = sanitizeDynamicAlbumFilters({
        people: ['person1', 'person2', 'person1', null, '', 'person3'],
      });
      expect(result.people).toEqual(['person1', 'person2', 'person3']);
    });

    it('should trim and preserve valid location strings', () => {
      const result = sanitizeDynamicAlbumFilters({ location: '  San Francisco  ' });
      expect(result.location).toBe('San Francisco');
    });

    it('should remove empty location strings', () => {
      const result = sanitizeDynamicAlbumFilters({ location: '   ' });
      expect(result.location).toBeUndefined();
    });

    it('should sanitize LocationFilter', () => {
      const result = sanitizeDynamicAlbumFilters({
        location: {
          city: '  San Francisco  ',
          state: 'California',
          country: '  ',
        },
      });
      expect(result.location).toEqual({
        city: 'San Francisco',
        state: 'California',
      });
    });

    it('should remove empty LocationFilter', () => {
      const result = sanitizeDynamicAlbumFilters({
        location: { city: '  ', state: '', country: '  ' },
      });
      expect(result.location).toBeUndefined();
    });

    it('should sanitize valid dateRange', () => {
      const result = sanitizeDynamicAlbumFilters({
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
      });
      expect(result.dateRange?.start).toBeInstanceOf(Date);
      expect(result.dateRange?.end).toBeInstanceOf(Date);
    });

    it('should remove invalid dateRange', () => {
      const result = sanitizeDynamicAlbumFilters({
        dateRange: { start: 'invalid', end: '2024-12-31' },
      });
      expect(result.dateRange).toBeUndefined();
    });

    it('should preserve valid assetType', () => {
      expect(sanitizeDynamicAlbumFilters({ assetType: 'IMAGE' }).assetType).toBe('IMAGE');
      expect(sanitizeDynamicAlbumFilters({ assetType: 'VIDEO' }).assetType).toBe('VIDEO');
    });

    it('should remove invalid assetType', () => {
      const result = sanitizeDynamicAlbumFilters({ assetType: 'AUDIO' });
      expect(result.assetType).toBeUndefined();
    });

    it('should sanitize metadata', () => {
      const result = sanitizeDynamicAlbumFilters({
        metadata: {
          isFavorite: true,
          make: '  Sony  ',
          model: 'A7III',
          lensModel: '  ',
          rating: 5,
          invalid: 'field',
        },
      });
      expect(result.metadata).toEqual({
        isFavorite: true,
        make: 'Sony',
        model: 'A7III',
        rating: 5,
      });
    });

    it('should remove empty metadata', () => {
      const result = sanitizeDynamicAlbumFilters({
        metadata: { make: '  ', lensModel: '' },
      });
      expect(result.metadata).toBeUndefined();
    });

    it('should remove invalid metadata fields', () => {
      const result = sanitizeDynamicAlbumFilters({
        metadata: {
          isFavorite: 'true',
          rating: 10,
        },
      });
      expect(result.metadata).toBeUndefined();
    });

    it('should default operator to "or"', () => {
      expect(sanitizeDynamicAlbumFilters({}).operator).toBe('or');
      expect(sanitizeDynamicAlbumFilters({ operator: 'invalid' }).operator).toBe('or');
    });

    it('should preserve valid operator', () => {
      expect(sanitizeDynamicAlbumFilters({ operator: 'and' }).operator).toBe('and');
      expect(sanitizeDynamicAlbumFilters({ operator: 'or' }).operator).toBe('or');
    });

    it('should handle complete filter sanitization', () => {
      const result = sanitizeDynamicAlbumFilters({
        tags: ['tag1', 'tag1', '', 'tag2'],
        people: ['person1', null, 'person2'],
        location: '  Paris  ',
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        assetType: 'IMAGE',
        metadata: {
          isFavorite: true,
          make: '  Canon  ',
          invalid: 'field',
        },
        operator: 'and',
        extraField: 'ignored',
      });

      expect(result).toMatchObject({
        tags: ['tag1', 'tag2'],
        people: ['person1', 'person2'],
        location: 'Paris',
        assetType: 'IMAGE',
        metadata: {
          isFavorite: true,
          make: 'Canon',
        },
        operator: 'and',
      });
      expect(result.dateRange).toBeDefined();
      expect(result).not.toHaveProperty('extraField');
      expect(result).not.toHaveProperty('invalid');
    });
  });
});
