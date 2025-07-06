//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class ShareDynamicAlbumDto {
  /// Returns a new [ShareDynamicAlbumDto] instance.
  ShareDynamicAlbumDto({
    required this.role,
    required this.userId,
  });

  ShareDynamicAlbumDtoRoleEnum role;

  String userId;

  @override
  bool operator ==(Object other) => identical(this, other) || other is ShareDynamicAlbumDto &&
    other.role == role &&
    other.userId == userId;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (role.hashCode) +
    (userId.hashCode);

  @override
  String toString() => 'ShareDynamicAlbumDto[role=$role, userId=$userId]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'role'] = this.role;
      json[r'userId'] = this.userId;
    return json;
  }

  /// Returns a new [ShareDynamicAlbumDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static ShareDynamicAlbumDto? fromJson(dynamic value) {
    upgradeDto(value, "ShareDynamicAlbumDto");
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return ShareDynamicAlbumDto(
        role: ShareDynamicAlbumDtoRoleEnum.fromJson(json[r'role'])!,
        userId: mapValueOfType<String>(json, r'userId')!,
      );
    }
    return null;
  }

  static List<ShareDynamicAlbumDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <ShareDynamicAlbumDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = ShareDynamicAlbumDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, ShareDynamicAlbumDto> mapFromJson(dynamic json) {
    final map = <String, ShareDynamicAlbumDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = ShareDynamicAlbumDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of ShareDynamicAlbumDto-objects as value to a dart map
  static Map<String, List<ShareDynamicAlbumDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<ShareDynamicAlbumDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = ShareDynamicAlbumDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'role',
    'userId',
  };
}


class ShareDynamicAlbumDtoRoleEnum {
  /// Instantiate a new enum with the provided [value].
  const ShareDynamicAlbumDtoRoleEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const viewer = ShareDynamicAlbumDtoRoleEnum._(r'viewer');
  static const editor = ShareDynamicAlbumDtoRoleEnum._(r'editor');
  static const admin = ShareDynamicAlbumDtoRoleEnum._(r'admin');

  /// List of all possible values in this [enum][ShareDynamicAlbumDtoRoleEnum].
  static const values = <ShareDynamicAlbumDtoRoleEnum>[
    viewer,
    editor,
    admin,
  ];

  static ShareDynamicAlbumDtoRoleEnum? fromJson(dynamic value) => ShareDynamicAlbumDtoRoleEnumTypeTransformer().decode(value);

  static List<ShareDynamicAlbumDtoRoleEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <ShareDynamicAlbumDtoRoleEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = ShareDynamicAlbumDtoRoleEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [ShareDynamicAlbumDtoRoleEnum] to String,
/// and [decode] dynamic data back to [ShareDynamicAlbumDtoRoleEnum].
class ShareDynamicAlbumDtoRoleEnumTypeTransformer {
  factory ShareDynamicAlbumDtoRoleEnumTypeTransformer() => _instance ??= const ShareDynamicAlbumDtoRoleEnumTypeTransformer._();

  const ShareDynamicAlbumDtoRoleEnumTypeTransformer._();

  String encode(ShareDynamicAlbumDtoRoleEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a ShareDynamicAlbumDtoRoleEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  ShareDynamicAlbumDtoRoleEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'viewer': return ShareDynamicAlbumDtoRoleEnum.viewer;
        case r'editor': return ShareDynamicAlbumDtoRoleEnum.editor;
        case r'admin': return ShareDynamicAlbumDtoRoleEnum.admin;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [ShareDynamicAlbumDtoRoleEnumTypeTransformer] instance.
  static ShareDynamicAlbumDtoRoleEnumTypeTransformer? _instance;
}


