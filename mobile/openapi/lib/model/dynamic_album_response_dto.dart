//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class DynamicAlbumResponseDto {
  /// Returns a new [DynamicAlbumResponseDto] instance.
  DynamicAlbumResponseDto({
    this.albumThumbnailAssetId,
    required this.assetCount,
    required this.createdAt,
    required this.description,
    this.endDate,
    this.filters = const [],
    required this.id,
    required this.isActivityEnabled,
    required this.name,
    required this.order,
    required this.ownerId,
    this.sharedUsers = const [],
    this.startDate,
    required this.updatedAt,
  });

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? albumThumbnailAssetId;

  num assetCount;

  DateTime createdAt;

  String description;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  DateTime? endDate;

  List<DynamicAlbumFilterDto> filters;

  String id;

  bool isActivityEnabled;

  String name;

  DynamicAlbumResponseDtoOrderEnum order;

  String ownerId;

  List<DynamicAlbumShareDto> sharedUsers;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  DateTime? startDate;

  DateTime updatedAt;

  @override
  bool operator ==(Object other) => identical(this, other) || other is DynamicAlbumResponseDto &&
    other.albumThumbnailAssetId == albumThumbnailAssetId &&
    other.assetCount == assetCount &&
    other.createdAt == createdAt &&
    other.description == description &&
    other.endDate == endDate &&
    _deepEquality.equals(other.filters, filters) &&
    other.id == id &&
    other.isActivityEnabled == isActivityEnabled &&
    other.name == name &&
    other.order == order &&
    other.ownerId == ownerId &&
    _deepEquality.equals(other.sharedUsers, sharedUsers) &&
    other.startDate == startDate &&
    other.updatedAt == updatedAt;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (albumThumbnailAssetId == null ? 0 : albumThumbnailAssetId!.hashCode) +
    (assetCount.hashCode) +
    (createdAt.hashCode) +
    (description.hashCode) +
    (endDate == null ? 0 : endDate!.hashCode) +
    (filters.hashCode) +
    (id.hashCode) +
    (isActivityEnabled.hashCode) +
    (name.hashCode) +
    (order.hashCode) +
    (ownerId.hashCode) +
    (sharedUsers.hashCode) +
    (startDate == null ? 0 : startDate!.hashCode) +
    (updatedAt.hashCode);

  @override
  String toString() => 'DynamicAlbumResponseDto[albumThumbnailAssetId=$albumThumbnailAssetId, assetCount=$assetCount, createdAt=$createdAt, description=$description, endDate=$endDate, filters=$filters, id=$id, isActivityEnabled=$isActivityEnabled, name=$name, order=$order, ownerId=$ownerId, sharedUsers=$sharedUsers, startDate=$startDate, updatedAt=$updatedAt]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
    if (this.albumThumbnailAssetId != null) {
      json[r'albumThumbnailAssetId'] = this.albumThumbnailAssetId;
    } else {
    //  json[r'albumThumbnailAssetId'] = null;
    }
      json[r'assetCount'] = this.assetCount;
      json[r'createdAt'] = this.createdAt.toUtc().toIso8601String();
      json[r'description'] = this.description;
    if (this.endDate != null) {
      json[r'endDate'] = this.endDate!.toUtc().toIso8601String();
    } else {
    //  json[r'endDate'] = null;
    }
      json[r'filters'] = this.filters;
      json[r'id'] = this.id;
      json[r'isActivityEnabled'] = this.isActivityEnabled;
      json[r'name'] = this.name;
      json[r'order'] = this.order;
      json[r'ownerId'] = this.ownerId;
      json[r'sharedUsers'] = this.sharedUsers;
    if (this.startDate != null) {
      json[r'startDate'] = this.startDate!.toUtc().toIso8601String();
    } else {
    //  json[r'startDate'] = null;
    }
      json[r'updatedAt'] = this.updatedAt.toUtc().toIso8601String();
    return json;
  }

  /// Returns a new [DynamicAlbumResponseDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static DynamicAlbumResponseDto? fromJson(dynamic value) {
    upgradeDto(value, "DynamicAlbumResponseDto");
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return DynamicAlbumResponseDto(
        albumThumbnailAssetId: mapValueOfType<String>(json, r'albumThumbnailAssetId'),
        assetCount: num.parse('${json[r'assetCount']}'),
        createdAt: mapDateTime(json, r'createdAt', r'')!,
        description: mapValueOfType<String>(json, r'description')!,
        endDate: mapDateTime(json, r'endDate', r''),
        filters: DynamicAlbumFilterDto.listFromJson(json[r'filters']),
        id: mapValueOfType<String>(json, r'id')!,
        isActivityEnabled: mapValueOfType<bool>(json, r'isActivityEnabled')!,
        name: mapValueOfType<String>(json, r'name')!,
        order: DynamicAlbumResponseDtoOrderEnum.fromJson(json[r'order'])!,
        ownerId: mapValueOfType<String>(json, r'ownerId')!,
        sharedUsers: DynamicAlbumShareDto.listFromJson(json[r'sharedUsers']),
        startDate: mapDateTime(json, r'startDate', r''),
        updatedAt: mapDateTime(json, r'updatedAt', r'')!,
      );
    }
    return null;
  }

  static List<DynamicAlbumResponseDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <DynamicAlbumResponseDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = DynamicAlbumResponseDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, DynamicAlbumResponseDto> mapFromJson(dynamic json) {
    final map = <String, DynamicAlbumResponseDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = DynamicAlbumResponseDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of DynamicAlbumResponseDto-objects as value to a dart map
  static Map<String, List<DynamicAlbumResponseDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<DynamicAlbumResponseDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = DynamicAlbumResponseDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'assetCount',
    'createdAt',
    'description',
    'filters',
    'id',
    'isActivityEnabled',
    'name',
    'order',
    'ownerId',
    'sharedUsers',
    'updatedAt',
  };
}


class DynamicAlbumResponseDtoOrderEnum {
  /// Instantiate a new enum with the provided [value].
  const DynamicAlbumResponseDtoOrderEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const asc = DynamicAlbumResponseDtoOrderEnum._(r'asc');
  static const desc = DynamicAlbumResponseDtoOrderEnum._(r'desc');

  /// List of all possible values in this [enum][DynamicAlbumResponseDtoOrderEnum].
  static const values = <DynamicAlbumResponseDtoOrderEnum>[
    asc,
    desc,
  ];

  static DynamicAlbumResponseDtoOrderEnum? fromJson(dynamic value) => DynamicAlbumResponseDtoOrderEnumTypeTransformer().decode(value);

  static List<DynamicAlbumResponseDtoOrderEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <DynamicAlbumResponseDtoOrderEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = DynamicAlbumResponseDtoOrderEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [DynamicAlbumResponseDtoOrderEnum] to String,
/// and [decode] dynamic data back to [DynamicAlbumResponseDtoOrderEnum].
class DynamicAlbumResponseDtoOrderEnumTypeTransformer {
  factory DynamicAlbumResponseDtoOrderEnumTypeTransformer() => _instance ??= const DynamicAlbumResponseDtoOrderEnumTypeTransformer._();

  const DynamicAlbumResponseDtoOrderEnumTypeTransformer._();

  String encode(DynamicAlbumResponseDtoOrderEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a DynamicAlbumResponseDtoOrderEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  DynamicAlbumResponseDtoOrderEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'asc': return DynamicAlbumResponseDtoOrderEnum.asc;
        case r'desc': return DynamicAlbumResponseDtoOrderEnum.desc;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [DynamicAlbumResponseDtoOrderEnumTypeTransformer] instance.
  static DynamicAlbumResponseDtoOrderEnumTypeTransformer? _instance;
}


