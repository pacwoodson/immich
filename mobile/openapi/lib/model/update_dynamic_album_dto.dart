//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class UpdateDynamicAlbumDto {
  /// Returns a new [UpdateDynamicAlbumDto] instance.
  UpdateDynamicAlbumDto({
    this.description,
    this.filters = const [],
    this.isActivityEnabled,
    this.name,
    this.order,
  });

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? description;

  List<DynamicAlbumFilterDto> filters;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  bool? isActivityEnabled;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? name;

  UpdateDynamicAlbumDtoOrderEnum? order;

  @override
  bool operator ==(Object other) => identical(this, other) || other is UpdateDynamicAlbumDto &&
    other.description == description &&
    _deepEquality.equals(other.filters, filters) &&
    other.isActivityEnabled == isActivityEnabled &&
    other.name == name &&
    other.order == order;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (description == null ? 0 : description!.hashCode) +
    (filters.hashCode) +
    (isActivityEnabled == null ? 0 : isActivityEnabled!.hashCode) +
    (name == null ? 0 : name!.hashCode) +
    (order == null ? 0 : order!.hashCode);

  @override
  String toString() => 'UpdateDynamicAlbumDto[description=$description, filters=$filters, isActivityEnabled=$isActivityEnabled, name=$name, order=$order]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
    if (this.description != null) {
      json[r'description'] = this.description;
    } else {
    //  json[r'description'] = null;
    }
      json[r'filters'] = this.filters;
    if (this.isActivityEnabled != null) {
      json[r'isActivityEnabled'] = this.isActivityEnabled;
    } else {
    //  json[r'isActivityEnabled'] = null;
    }
    if (this.name != null) {
      json[r'name'] = this.name;
    } else {
    //  json[r'name'] = null;
    }
    if (this.order != null) {
      json[r'order'] = this.order;
    } else {
    //  json[r'order'] = null;
    }
    return json;
  }

  /// Returns a new [UpdateDynamicAlbumDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static UpdateDynamicAlbumDto? fromJson(dynamic value) {
    upgradeDto(value, "UpdateDynamicAlbumDto");
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return UpdateDynamicAlbumDto(
        description: mapValueOfType<String>(json, r'description'),
        filters: DynamicAlbumFilterDto.listFromJson(json[r'filters']),
        isActivityEnabled: mapValueOfType<bool>(json, r'isActivityEnabled'),
        name: mapValueOfType<String>(json, r'name'),
        order: UpdateDynamicAlbumDtoOrderEnum.fromJson(json[r'order']),
      );
    }
    return null;
  }

  static List<UpdateDynamicAlbumDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <UpdateDynamicAlbumDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = UpdateDynamicAlbumDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, UpdateDynamicAlbumDto> mapFromJson(dynamic json) {
    final map = <String, UpdateDynamicAlbumDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = UpdateDynamicAlbumDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of UpdateDynamicAlbumDto-objects as value to a dart map
  static Map<String, List<UpdateDynamicAlbumDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<UpdateDynamicAlbumDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = UpdateDynamicAlbumDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
  };
}


class UpdateDynamicAlbumDtoOrderEnum {
  /// Instantiate a new enum with the provided [value].
  const UpdateDynamicAlbumDtoOrderEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const asc = UpdateDynamicAlbumDtoOrderEnum._(r'asc');
  static const desc = UpdateDynamicAlbumDtoOrderEnum._(r'desc');

  /// List of all possible values in this [enum][UpdateDynamicAlbumDtoOrderEnum].
  static const values = <UpdateDynamicAlbumDtoOrderEnum>[
    asc,
    desc,
  ];

  static UpdateDynamicAlbumDtoOrderEnum? fromJson(dynamic value) => UpdateDynamicAlbumDtoOrderEnumTypeTransformer().decode(value);

  static List<UpdateDynamicAlbumDtoOrderEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <UpdateDynamicAlbumDtoOrderEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = UpdateDynamicAlbumDtoOrderEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [UpdateDynamicAlbumDtoOrderEnum] to String,
/// and [decode] dynamic data back to [UpdateDynamicAlbumDtoOrderEnum].
class UpdateDynamicAlbumDtoOrderEnumTypeTransformer {
  factory UpdateDynamicAlbumDtoOrderEnumTypeTransformer() => _instance ??= const UpdateDynamicAlbumDtoOrderEnumTypeTransformer._();

  const UpdateDynamicAlbumDtoOrderEnumTypeTransformer._();

  String encode(UpdateDynamicAlbumDtoOrderEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a UpdateDynamicAlbumDtoOrderEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  UpdateDynamicAlbumDtoOrderEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'asc': return UpdateDynamicAlbumDtoOrderEnum.asc;
        case r'desc': return UpdateDynamicAlbumDtoOrderEnum.desc;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [UpdateDynamicAlbumDtoOrderEnumTypeTransformer] instance.
  static UpdateDynamicAlbumDtoOrderEnumTypeTransformer? _instance;
}


