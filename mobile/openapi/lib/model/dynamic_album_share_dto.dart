//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class DynamicAlbumShareDto {
  /// Returns a new [DynamicAlbumShareDto] instance.
  DynamicAlbumShareDto({
    required this.createdAt,
    required this.role,
    required this.userId,
  });

  DateTime createdAt;

  DynamicAlbumShareDtoRoleEnum role;

  String userId;

  @override
  bool operator ==(Object other) => identical(this, other) || other is DynamicAlbumShareDto &&
    other.createdAt == createdAt &&
    other.role == role &&
    other.userId == userId;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (createdAt.hashCode) +
    (role.hashCode) +
    (userId.hashCode);

  @override
  String toString() => 'DynamicAlbumShareDto[createdAt=$createdAt, role=$role, userId=$userId]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'createdAt'] = this.createdAt.toUtc().toIso8601String();
      json[r'role'] = this.role;
      json[r'userId'] = this.userId;
    return json;
  }

  /// Returns a new [DynamicAlbumShareDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static DynamicAlbumShareDto? fromJson(dynamic value) {
    upgradeDto(value, "DynamicAlbumShareDto");
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return DynamicAlbumShareDto(
        createdAt: mapDateTime(json, r'createdAt', r'')!,
        role: DynamicAlbumShareDtoRoleEnum.fromJson(json[r'role'])!,
        userId: mapValueOfType<String>(json, r'userId')!,
      );
    }
    return null;
  }

  static List<DynamicAlbumShareDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <DynamicAlbumShareDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = DynamicAlbumShareDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, DynamicAlbumShareDto> mapFromJson(dynamic json) {
    final map = <String, DynamicAlbumShareDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = DynamicAlbumShareDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of DynamicAlbumShareDto-objects as value to a dart map
  static Map<String, List<DynamicAlbumShareDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<DynamicAlbumShareDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = DynamicAlbumShareDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'createdAt',
    'role',
    'userId',
  };
}


class DynamicAlbumShareDtoRoleEnum {
  /// Instantiate a new enum with the provided [value].
  const DynamicAlbumShareDtoRoleEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const viewer = DynamicAlbumShareDtoRoleEnum._(r'viewer');
  static const editor = DynamicAlbumShareDtoRoleEnum._(r'editor');
  static const admin = DynamicAlbumShareDtoRoleEnum._(r'admin');

  /// List of all possible values in this [enum][DynamicAlbumShareDtoRoleEnum].
  static const values = <DynamicAlbumShareDtoRoleEnum>[
    viewer,
    editor,
    admin,
  ];

  static DynamicAlbumShareDtoRoleEnum? fromJson(dynamic value) => DynamicAlbumShareDtoRoleEnumTypeTransformer().decode(value);

  static List<DynamicAlbumShareDtoRoleEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <DynamicAlbumShareDtoRoleEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = DynamicAlbumShareDtoRoleEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [DynamicAlbumShareDtoRoleEnum] to String,
/// and [decode] dynamic data back to [DynamicAlbumShareDtoRoleEnum].
class DynamicAlbumShareDtoRoleEnumTypeTransformer {
  factory DynamicAlbumShareDtoRoleEnumTypeTransformer() => _instance ??= const DynamicAlbumShareDtoRoleEnumTypeTransformer._();

  const DynamicAlbumShareDtoRoleEnumTypeTransformer._();

  String encode(DynamicAlbumShareDtoRoleEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a DynamicAlbumShareDtoRoleEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  DynamicAlbumShareDtoRoleEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'viewer': return DynamicAlbumShareDtoRoleEnum.viewer;
        case r'editor': return DynamicAlbumShareDtoRoleEnum.editor;
        case r'admin': return DynamicAlbumShareDtoRoleEnum.admin;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [DynamicAlbumShareDtoRoleEnumTypeTransformer] instance.
  static DynamicAlbumShareDtoRoleEnumTypeTransformer? _instance;
}


