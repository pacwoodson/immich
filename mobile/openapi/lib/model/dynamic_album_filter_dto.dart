//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class DynamicAlbumFilterDto {
  /// Returns a new [DynamicAlbumFilterDto] instance.
  DynamicAlbumFilterDto({
    required this.type,
    this.value = const {},
  });

  DynamicAlbumFilterDtoTypeEnum type;

  Map<String, Object> value;

  @override
  bool operator ==(Object other) => identical(this, other) || other is DynamicAlbumFilterDto &&
    other.type == type &&
    _deepEquality.equals(other.value, value);

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (type.hashCode) +
    (value.hashCode);

  @override
  String toString() => 'DynamicAlbumFilterDto[type=$type, value=$value]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'type'] = this.type;
      json[r'value'] = this.value;
    return json;
  }

  /// Returns a new [DynamicAlbumFilterDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static DynamicAlbumFilterDto? fromJson(dynamic value) {
    upgradeDto(value, "DynamicAlbumFilterDto");
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return DynamicAlbumFilterDto(
        type: DynamicAlbumFilterDtoTypeEnum.fromJson(json[r'type'])!,
        value: mapCastOfType<String, Object>(json, r'value')!,
      );
    }
    return null;
  }

  static List<DynamicAlbumFilterDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <DynamicAlbumFilterDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = DynamicAlbumFilterDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, DynamicAlbumFilterDto> mapFromJson(dynamic json) {
    final map = <String, DynamicAlbumFilterDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = DynamicAlbumFilterDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of DynamicAlbumFilterDto-objects as value to a dart map
  static Map<String, List<DynamicAlbumFilterDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<DynamicAlbumFilterDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = DynamicAlbumFilterDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'type',
    'value',
  };
}


class DynamicAlbumFilterDtoTypeEnum {
  /// Instantiate a new enum with the provided [value].
  const DynamicAlbumFilterDtoTypeEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const tag = DynamicAlbumFilterDtoTypeEnum._(r'tag');
  static const person = DynamicAlbumFilterDtoTypeEnum._(r'person');
  static const location = DynamicAlbumFilterDtoTypeEnum._(r'location');
  static const dateRange = DynamicAlbumFilterDtoTypeEnum._(r'date_range');
  static const assetType = DynamicAlbumFilterDtoTypeEnum._(r'asset_type');
  static const metadata = DynamicAlbumFilterDtoTypeEnum._(r'metadata');

  /// List of all possible values in this [enum][DynamicAlbumFilterDtoTypeEnum].
  static const values = <DynamicAlbumFilterDtoTypeEnum>[
    tag,
    person,
    location,
    dateRange,
    assetType,
    metadata,
  ];

  static DynamicAlbumFilterDtoTypeEnum? fromJson(dynamic value) => DynamicAlbumFilterDtoTypeEnumTypeTransformer().decode(value);

  static List<DynamicAlbumFilterDtoTypeEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <DynamicAlbumFilterDtoTypeEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = DynamicAlbumFilterDtoTypeEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [DynamicAlbumFilterDtoTypeEnum] to String,
/// and [decode] dynamic data back to [DynamicAlbumFilterDtoTypeEnum].
class DynamicAlbumFilterDtoTypeEnumTypeTransformer {
  factory DynamicAlbumFilterDtoTypeEnumTypeTransformer() => _instance ??= const DynamicAlbumFilterDtoTypeEnumTypeTransformer._();

  const DynamicAlbumFilterDtoTypeEnumTypeTransformer._();

  String encode(DynamicAlbumFilterDtoTypeEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a DynamicAlbumFilterDtoTypeEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  DynamicAlbumFilterDtoTypeEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'tag': return DynamicAlbumFilterDtoTypeEnum.tag;
        case r'person': return DynamicAlbumFilterDtoTypeEnum.person;
        case r'location': return DynamicAlbumFilterDtoTypeEnum.location;
        case r'date_range': return DynamicAlbumFilterDtoTypeEnum.dateRange;
        case r'asset_type': return DynamicAlbumFilterDtoTypeEnum.assetType;
        case r'metadata': return DynamicAlbumFilterDtoTypeEnum.metadata;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [DynamicAlbumFilterDtoTypeEnumTypeTransformer] instance.
  static DynamicAlbumFilterDtoTypeEnumTypeTransformer? _instance;
}


