//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class UpdateDynamicAlbumShareDto {
  /// Returns a new [UpdateDynamicAlbumShareDto] instance.
  UpdateDynamicAlbumShareDto({
    required this.role,
  });

  UpdateDynamicAlbumShareDtoRoleEnum role;

  @override
  bool operator ==(Object other) => identical(this, other) || other is UpdateDynamicAlbumShareDto &&
    other.role == role;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (role.hashCode);

  @override
  String toString() => 'UpdateDynamicAlbumShareDto[role=$role]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'role'] = this.role;
    return json;
  }

  /// Returns a new [UpdateDynamicAlbumShareDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static UpdateDynamicAlbumShareDto? fromJson(dynamic value) {
    upgradeDto(value, "UpdateDynamicAlbumShareDto");
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return UpdateDynamicAlbumShareDto(
        role: UpdateDynamicAlbumShareDtoRoleEnum.fromJson(json[r'role'])!,
      );
    }
    return null;
  }

  static List<UpdateDynamicAlbumShareDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <UpdateDynamicAlbumShareDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = UpdateDynamicAlbumShareDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, UpdateDynamicAlbumShareDto> mapFromJson(dynamic json) {
    final map = <String, UpdateDynamicAlbumShareDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = UpdateDynamicAlbumShareDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of UpdateDynamicAlbumShareDto-objects as value to a dart map
  static Map<String, List<UpdateDynamicAlbumShareDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<UpdateDynamicAlbumShareDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = UpdateDynamicAlbumShareDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'role',
  };
}


class UpdateDynamicAlbumShareDtoRoleEnum {
  /// Instantiate a new enum with the provided [value].
  const UpdateDynamicAlbumShareDtoRoleEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const viewer = UpdateDynamicAlbumShareDtoRoleEnum._(r'viewer');
  static const editor = UpdateDynamicAlbumShareDtoRoleEnum._(r'editor');
  static const admin = UpdateDynamicAlbumShareDtoRoleEnum._(r'admin');

  /// List of all possible values in this [enum][UpdateDynamicAlbumShareDtoRoleEnum].
  static const values = <UpdateDynamicAlbumShareDtoRoleEnum>[
    viewer,
    editor,
    admin,
  ];

  static UpdateDynamicAlbumShareDtoRoleEnum? fromJson(dynamic value) => UpdateDynamicAlbumShareDtoRoleEnumTypeTransformer().decode(value);

  static List<UpdateDynamicAlbumShareDtoRoleEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <UpdateDynamicAlbumShareDtoRoleEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = UpdateDynamicAlbumShareDtoRoleEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [UpdateDynamicAlbumShareDtoRoleEnum] to String,
/// and [decode] dynamic data back to [UpdateDynamicAlbumShareDtoRoleEnum].
class UpdateDynamicAlbumShareDtoRoleEnumTypeTransformer {
  factory UpdateDynamicAlbumShareDtoRoleEnumTypeTransformer() => _instance ??= const UpdateDynamicAlbumShareDtoRoleEnumTypeTransformer._();

  const UpdateDynamicAlbumShareDtoRoleEnumTypeTransformer._();

  String encode(UpdateDynamicAlbumShareDtoRoleEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a UpdateDynamicAlbumShareDtoRoleEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  UpdateDynamicAlbumShareDtoRoleEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'viewer': return UpdateDynamicAlbumShareDtoRoleEnum.viewer;
        case r'editor': return UpdateDynamicAlbumShareDtoRoleEnum.editor;
        case r'admin': return UpdateDynamicAlbumShareDtoRoleEnum.admin;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [UpdateDynamicAlbumShareDtoRoleEnumTypeTransformer] instance.
  static UpdateDynamicAlbumShareDtoRoleEnumTypeTransformer? _instance;
}


