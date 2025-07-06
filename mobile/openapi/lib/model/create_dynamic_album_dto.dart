//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class CreateDynamicAlbumDto {
  /// Returns a new [CreateDynamicAlbumDto] instance.
  CreateDynamicAlbumDto({
    this.description,
    this.filters = const [],
    this.isActivityEnabled,
    required this.name,
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

  String name;

  CreateDynamicAlbumDtoOrderEnum? order;

  @override
  bool operator ==(Object other) => identical(this, other) || other is CreateDynamicAlbumDto &&
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
    (name.hashCode) +
    (order == null ? 0 : order!.hashCode);

  @override
  String toString() => 'CreateDynamicAlbumDto[description=$description, filters=$filters, isActivityEnabled=$isActivityEnabled, name=$name, order=$order]';

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
      json[r'name'] = this.name;
    if (this.order != null) {
      json[r'order'] = this.order;
    } else {
    //  json[r'order'] = null;
    }
    return json;
  }

  /// Returns a new [CreateDynamicAlbumDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static CreateDynamicAlbumDto? fromJson(dynamic value) {
    upgradeDto(value, "CreateDynamicAlbumDto");
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return CreateDynamicAlbumDto(
        description: mapValueOfType<String>(json, r'description'),
        filters: DynamicAlbumFilterDto.listFromJson(json[r'filters']),
        isActivityEnabled: mapValueOfType<bool>(json, r'isActivityEnabled'),
        name: mapValueOfType<String>(json, r'name')!,
        order: CreateDynamicAlbumDtoOrderEnum.fromJson(json[r'order']),
      );
    }
    return null;
  }

  static List<CreateDynamicAlbumDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <CreateDynamicAlbumDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = CreateDynamicAlbumDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, CreateDynamicAlbumDto> mapFromJson(dynamic json) {
    final map = <String, CreateDynamicAlbumDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = CreateDynamicAlbumDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of CreateDynamicAlbumDto-objects as value to a dart map
  static Map<String, List<CreateDynamicAlbumDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<CreateDynamicAlbumDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = CreateDynamicAlbumDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'filters',
    'name',
  };
}


class CreateDynamicAlbumDtoOrderEnum {
  /// Instantiate a new enum with the provided [value].
  const CreateDynamicAlbumDtoOrderEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const asc = CreateDynamicAlbumDtoOrderEnum._(r'asc');
  static const desc = CreateDynamicAlbumDtoOrderEnum._(r'desc');

  /// List of all possible values in this [enum][CreateDynamicAlbumDtoOrderEnum].
  static const values = <CreateDynamicAlbumDtoOrderEnum>[
    asc,
    desc,
  ];

  static CreateDynamicAlbumDtoOrderEnum? fromJson(dynamic value) => CreateDynamicAlbumDtoOrderEnumTypeTransformer().decode(value);

  static List<CreateDynamicAlbumDtoOrderEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <CreateDynamicAlbumDtoOrderEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = CreateDynamicAlbumDtoOrderEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [CreateDynamicAlbumDtoOrderEnum] to String,
/// and [decode] dynamic data back to [CreateDynamicAlbumDtoOrderEnum].
class CreateDynamicAlbumDtoOrderEnumTypeTransformer {
  factory CreateDynamicAlbumDtoOrderEnumTypeTransformer() => _instance ??= const CreateDynamicAlbumDtoOrderEnumTypeTransformer._();

  const CreateDynamicAlbumDtoOrderEnumTypeTransformer._();

  String encode(CreateDynamicAlbumDtoOrderEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a CreateDynamicAlbumDtoOrderEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  CreateDynamicAlbumDtoOrderEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'asc': return CreateDynamicAlbumDtoOrderEnum.asc;
        case r'desc': return CreateDynamicAlbumDtoOrderEnum.desc;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [CreateDynamicAlbumDtoOrderEnumTypeTransformer] instance.
  static CreateDynamicAlbumDtoOrderEnumTypeTransformer? _instance;
}


