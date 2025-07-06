import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateDynamicAlbumDto,
  DynamicAlbumFilterDto,
  DynamicAlbumResponseDto,
  ShareDynamicAlbumDto,
  UpdateDynamicAlbumDto,
  UpdateDynamicAlbumShareDto,
} from 'src/dtos/dynamic-album.dto';
import { AssetOrder, DynamicAlbumFilterOperator, DynamicAlbumFilterType, DynamicAlbumUserRole } from 'src/enum';

describe('DynamicAlbum DTOs', () => {
  describe('DynamicAlbumFilterDto', () => {
    it('should validate a valid filter', async () => {
      const filterData = {
        type: DynamicAlbumFilterType.TAG,
        value: { tagIds: ['tag-1', 'tag-2'], operator: DynamicAlbumFilterOperator.AND },
      };

      const filter = plainToInstance(DynamicAlbumFilterDto, filterData);
      const errors = await validate(filter);

      expect(errors).toHaveLength(0);
      expect(filter.type).toBe(DynamicAlbumFilterType.TAG);
      expect(filter.value).toEqual(filterData.value);
    });

    it('should fail validation with missing type', async () => {
      const filterData = {
        value: { tagIds: ['tag-1'], operator: DynamicAlbumFilterOperator.AND },
      };

      const filter = plainToInstance(DynamicAlbumFilterDto, filterData);
      const errors = await validate(filter);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'type')).toBe(true);
    });

    it('should fail validation with missing value', async () => {
      const filterData = {
        type: DynamicAlbumFilterType.TAG,
      };

      const filter = plainToInstance(DynamicAlbumFilterDto, filterData);
      const errors = await validate(filter);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'value')).toBe(true);
    });

    it('should fail validation with invalid value type', async () => {
      const filterData = {
        type: DynamicAlbumFilterType.TAG,
        value: 'invalid-value', // Should be an object
      };

      const filter = plainToInstance(DynamicAlbumFilterDto, filterData);
      const errors = await validate(filter);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'value')).toBe(true);
    });
  });

  describe('CreateDynamicAlbumDto', () => {
    it('should validate a valid create DTO', async () => {
      const createData = {
        name: 'Test Dynamic Album',
        description: 'A test dynamic album',
        filters: [
          {
            type: DynamicAlbumFilterType.TAG,
            value: { tagIds: ['tag-1'], operator: DynamicAlbumFilterOperator.AND },
          },
        ],
        order: AssetOrder.ASC,
        isActivityEnabled: true,
      };

      const createDto = plainToInstance(CreateDynamicAlbumDto, createData);
      const errors = await validate(createDto);

      expect(errors).toHaveLength(0);
      expect(createDto.name).toBe(createData.name);
      expect(createDto.description).toBe(createData.description);
      expect(createDto.filters).toHaveLength(1);
      expect(createDto.order).toBe(createData.order);
      expect(createDto.isActivityEnabled).toBe(createData.isActivityEnabled);
    });

    it('should validate with minimal required fields', async () => {
      const createData = {
        name: 'Minimal Album',
        filters: [],
      };

      const createDto = plainToInstance(CreateDynamicAlbumDto, createData);
      const errors = await validate(createDto);

      expect(errors).toHaveLength(0);
      expect(createDto.name).toBe(createData.name);
      expect(createDto.filters).toHaveLength(0);
    });

    it('should fail validation with missing name', async () => {
      const createData = {
        filters: [],
      };

      const createDto = plainToInstance(CreateDynamicAlbumDto, createData);
      const errors = await validate(createDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'name')).toBe(true);
    });

    it('should fail validation with empty name', async () => {
      const createData = {
        name: '',
        filters: [],
      };

      const createDto = plainToInstance(CreateDynamicAlbumDto, createData);
      const errors = await validate(createDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'name')).toBe(true);
    });

    it('should fail validation with missing filters', async () => {
      const createData = {
        name: 'Test Album',
      };

      const createDto = plainToInstance(CreateDynamicAlbumDto, createData);
      const errors = await validate(createDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'filters')).toBe(true);
    });

    it('should fail validation with invalid filter in array', async () => {
      const createData = {
        name: 'Test Album',
        filters: [
          {
            type: DynamicAlbumFilterType.TAG,
            value: { tagIds: ['tag-1'], operator: DynamicAlbumFilterOperator.AND },
          },
          {
            // Invalid filter - missing type
            value: { tagIds: ['tag-2'], operator: DynamicAlbumFilterOperator.AND },
          },
        ],
      };

      const createDto = plainToInstance(CreateDynamicAlbumDto, createData);
      const errors = await validate(createDto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateDynamicAlbumDto', () => {
    it('should validate a valid update DTO', async () => {
      const updateData = {
        name: 'Updated Album Name',
        description: 'Updated description',
        filters: [
          {
            type: DynamicAlbumFilterType.PERSON,
            value: { personIds: ['person-1'], operator: DynamicAlbumFilterOperator.OR },
          },
        ],
        order: AssetOrder.DESC,
        isActivityEnabled: false,
      };

      const updateDto = plainToInstance(UpdateDynamicAlbumDto, updateData);
      const errors = await validate(updateDto);

      expect(errors).toHaveLength(0);
      expect(updateDto.name).toBe(updateData.name);
      expect(updateDto.description).toBe(updateData.description);
      expect(updateDto.filters).toHaveLength(1);
      expect(updateDto.order).toBe(updateData.order);
      expect(updateDto.isActivityEnabled).toBe(updateData.isActivityEnabled);
    });

    it('should validate with partial fields', async () => {
      const updateData = {
        name: 'Updated Name Only',
      };

      const updateDto = plainToInstance(UpdateDynamicAlbumDto, updateData);
      const errors = await validate(updateDto);

      expect(errors).toHaveLength(0);
      expect(updateDto.name).toBe(updateData.name);
      expect(updateDto.description).toBeUndefined();
      expect(updateDto.filters).toBeUndefined();
    });

    it('should fail validation with empty name', async () => {
      const updateData = {
        name: '',
      };

      const updateDto = plainToInstance(UpdateDynamicAlbumDto, updateData);
      const errors = await validate(updateDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'name')).toBe(true);
    });

    it('should fail validation with invalid filter in array', async () => {
      const updateData = {
        name: 'Test Album',
        filters: [
          {
            // Invalid filter - missing type
            value: { tagIds: ['tag-1'], operator: DynamicAlbumFilterOperator.AND },
          },
        ],
      };

      const updateDto = plainToInstance(UpdateDynamicAlbumDto, updateData);
      const errors = await validate(updateDto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ShareDynamicAlbumDto', () => {
    it('should validate a valid share DTO', async () => {
      const shareData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: DynamicAlbumUserRole.VIEWER,
      };

      const shareDto = plainToInstance(ShareDynamicAlbumDto, shareData);
      const errors = await validate(shareDto);

      expect(errors).toHaveLength(0);
      expect(shareDto.userId).toBe(shareData.userId);
      expect(shareDto.role).toBe(shareData.role);
    });

    it('should fail validation with missing userId', async () => {
      const shareData = {
        role: DynamicAlbumUserRole.VIEWER,
      };

      const shareDto = plainToInstance(ShareDynamicAlbumDto, shareData);
      const errors = await validate(shareDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'userId')).toBe(true);
    });

    it('should fail validation with missing role', async () => {
      const shareData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const shareDto = plainToInstance(ShareDynamicAlbumDto, shareData);
      const errors = await validate(shareDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'role')).toBe(true);
    });

    it('should fail validation with invalid UUID', async () => {
      const shareData = {
        userId: 'invalid-uuid',
        role: DynamicAlbumUserRole.VIEWER,
      };

      const shareDto = plainToInstance(ShareDynamicAlbumDto, shareData);
      const errors = await validate(shareDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'userId')).toBe(true);
    });
  });

  describe('UpdateDynamicAlbumShareDto', () => {
    it('should validate a valid update share DTO', async () => {
      const updateShareData = {
        role: DynamicAlbumUserRole.EDITOR,
      };

      const updateShareDto = plainToInstance(UpdateDynamicAlbumShareDto, updateShareData);
      const errors = await validate(updateShareDto);

      expect(errors).toHaveLength(0);
      expect(updateShareDto.role).toBe(updateShareData.role);
    });

    it('should fail validation with missing role', async () => {
      const updateShareData = {};

      const updateShareDto = plainToInstance(UpdateDynamicAlbumShareDto, updateShareData);
      const errors = await validate(updateShareDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'role')).toBe(true);
    });
  });

  describe('DynamicAlbumResponseDto', () => {
    it('should validate a valid response DTO', async () => {
      const responseData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Album',
        description: 'Test Description',
        ownerId: '123e4567-e89b-12d3-a456-426614174001',
        filters: [
          {
            type: DynamicAlbumFilterType.TAG,
            value: { tagIds: ['tag-1'], operator: DynamicAlbumFilterOperator.AND },
          },
        ],
        assetCount: 5,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        albumThumbnailAssetId: '123e4567-e89b-12d3-a456-426614174002',
        order: AssetOrder.DESC,
        isActivityEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        sharedUsers: [
          {
            userId: '123e4567-e89b-12d3-a456-426614174003',
            role: DynamicAlbumUserRole.VIEWER,
            createdAt: new Date(),
          },
        ],
      };

      const responseDto = plainToInstance(DynamicAlbumResponseDto, responseData);
      const errors = await validate(responseDto);

      expect(errors).toHaveLength(0);
      expect(responseDto.id).toBe(responseData.id);
      expect(responseDto.name).toBe(responseData.name);
      expect(responseDto.description).toBe(responseData.description);
      expect(responseDto.ownerId).toBe(responseData.ownerId);
      expect(responseDto.filters).toHaveLength(1);
      expect(responseDto.assetCount).toBe(responseData.assetCount);
      expect(responseDto.order).toBe(responseData.order);
      expect(responseDto.isActivityEnabled).toBe(responseData.isActivityEnabled);
      expect(responseDto.sharedUsers).toHaveLength(1);
    });

    it('should validate with optional fields as undefined', async () => {
      const responseData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Album',
        description: 'Test Description',
        ownerId: '123e4567-e89b-12d3-a456-426614174001',
        filters: [],
        assetCount: 0,
        order: AssetOrder.DESC,
        isActivityEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        sharedUsers: [],
      };

      const responseDto = plainToInstance(DynamicAlbumResponseDto, responseData);
      const errors = await validate(responseDto);

      expect(errors).toHaveLength(0);
      expect(responseDto.startDate).toBeUndefined();
      expect(responseDto.endDate).toBeUndefined();
      expect(responseDto.albumThumbnailAssetId).toBeUndefined();
    });

    it('should fail validation with missing required fields', async () => {
      const responseData = {
        name: 'Test Album',
        // Missing id, ownerId, filters, assetCount, order, isActivityEnabled, createdAt, updatedAt, sharedUsers
      };

      const responseDto = plainToInstance(DynamicAlbumResponseDto, responseData);
      const errors = await validate(responseDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'id')).toBe(true);
      expect(errors.some((error) => error.property === 'ownerId')).toBe(true);
      expect(errors.some((error) => error.property === 'filters')).toBe(true);
      expect(errors.some((error) => error.property === 'assetCount')).toBe(true);
      expect(errors.some((error) => error.property === 'order')).toBe(true);
      expect(errors.some((error) => error.property === 'isActivityEnabled')).toBe(true);
      expect(errors.some((error) => error.property === 'createdAt')).toBe(true);
      expect(errors.some((error) => error.property === 'updatedAt')).toBe(true);
      expect(errors.some((error) => error.property === 'sharedUsers')).toBe(true);
    });
  });
});
