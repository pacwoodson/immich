//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;


class DynamicAlbumsApi {
  DynamicAlbumsApi([ApiClient? apiClient]) : apiClient = apiClient ?? defaultApiClient;

  final ApiClient apiClient;

  /// Performs an HTTP 'POST /dynamic-albums' operation and returns the [Response].
  /// Parameters:
  ///
  /// * [CreateDynamicAlbumDto] createDynamicAlbumDto (required):
  Future<Response> createDynamicAlbumWithHttpInfo(CreateDynamicAlbumDto createDynamicAlbumDto,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/dynamic-albums';

    // ignore: prefer_final_locals
    Object? postBody = createDynamicAlbumDto;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>['application/json'];


    return apiClient.invokeAPI(
      apiPath,
      'POST',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Parameters:
  ///
  /// * [CreateDynamicAlbumDto] createDynamicAlbumDto (required):
  Future<DynamicAlbumResponseDto?> createDynamicAlbum(CreateDynamicAlbumDto createDynamicAlbumDto,) async {
    final response = await createDynamicAlbumWithHttpInfo(createDynamicAlbumDto,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      return await apiClient.deserializeAsync(await _decodeBodyBytes(response), 'DynamicAlbumResponseDto',) as DynamicAlbumResponseDto;
    
    }
    return null;
  }

  /// Performs an HTTP 'DELETE /dynamic-albums/{id}' operation and returns the [Response].
  /// Parameters:
  ///
  /// * [String] id (required):
  Future<Response> deleteDynamicAlbumWithHttpInfo(String id,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/dynamic-albums/{id}'
      .replaceAll('{id}', id);

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      apiPath,
      'DELETE',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Parameters:
  ///
  /// * [String] id (required):
  Future<void> deleteDynamicAlbum(String id,) async {
    final response = await deleteDynamicAlbumWithHttpInfo(id,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
  }

  /// Performs an HTTP 'GET /dynamic-albums' operation and returns the [Response].
  Future<Response> getAllDynamicAlbumsWithHttpInfo() async {
    // ignore: prefer_const_declarations
    final apiPath = r'/dynamic-albums';

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      apiPath,
      'GET',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  Future<List<DynamicAlbumResponseDto>?> getAllDynamicAlbums() async {
    final response = await getAllDynamicAlbumsWithHttpInfo();
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      final responseBody = await _decodeBodyBytes(response);
      return (await apiClient.deserializeAsync(responseBody, 'List<DynamicAlbumResponseDto>') as List)
        .cast<DynamicAlbumResponseDto>()
        .toList(growable: false);

    }
    return null;
  }

  /// Performs an HTTP 'GET /dynamic-albums/{id}/assets/count' operation and returns the [Response].
  /// Parameters:
  ///
  /// * [String] id (required):
  Future<Response> getDynamicAlbumAssetCountWithHttpInfo(String id,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/dynamic-albums/{id}/assets/count'
      .replaceAll('{id}', id);

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      apiPath,
      'GET',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Parameters:
  ///
  /// * [String] id (required):
  Future<num?> getDynamicAlbumAssetCount(String id,) async {
    final response = await getDynamicAlbumAssetCountWithHttpInfo(id,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      return await apiClient.deserializeAsync(await _decodeBodyBytes(response), 'num',) as num;
    
    }
    return null;
  }

  /// Performs an HTTP 'GET /dynamic-albums/{id}/assets' operation and returns the [Response].
  /// Parameters:
  ///
  /// * [String] id (required):
  ///
  /// * [num] skip (required):
  ///
  /// * [num] take (required):
  Future<Response> getDynamicAlbumAssetsWithHttpInfo(String id, num skip, num take,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/dynamic-albums/{id}/assets'
      .replaceAll('{id}', id);

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

      queryParams.addAll(_queryParams('', 'skip', skip));
      queryParams.addAll(_queryParams('', 'take', take));

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      apiPath,
      'GET',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Parameters:
  ///
  /// * [String] id (required):
  ///
  /// * [num] skip (required):
  ///
  /// * [num] take (required):
  Future<List<Object>?> getDynamicAlbumAssets(String id, num skip, num take,) async {
    final response = await getDynamicAlbumAssetsWithHttpInfo(id, skip, take,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      final responseBody = await _decodeBodyBytes(response);
      return (await apiClient.deserializeAsync(responseBody, 'List<Object>') as List)
        .cast<Object>()
        .toList(growable: false);

    }
    return null;
  }

  /// Performs an HTTP 'GET /dynamic-albums/{id}' operation and returns the [Response].
  /// Parameters:
  ///
  /// * [String] id (required):
  Future<Response> getDynamicAlbumInfoWithHttpInfo(String id,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/dynamic-albums/{id}'
      .replaceAll('{id}', id);

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      apiPath,
      'GET',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Parameters:
  ///
  /// * [String] id (required):
  Future<DynamicAlbumResponseDto?> getDynamicAlbumInfo(String id,) async {
    final response = await getDynamicAlbumInfoWithHttpInfo(id,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      return await apiClient.deserializeAsync(await _decodeBodyBytes(response), 'DynamicAlbumResponseDto',) as DynamicAlbumResponseDto;
    
    }
    return null;
  }

  /// Performs an HTTP 'GET /dynamic-albums/shared' operation and returns the [Response].
  Future<Response> getSharedDynamicAlbumsWithHttpInfo() async {
    // ignore: prefer_const_declarations
    final apiPath = r'/dynamic-albums/shared';

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      apiPath,
      'GET',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  Future<List<DynamicAlbumResponseDto>?> getSharedDynamicAlbums() async {
    final response = await getSharedDynamicAlbumsWithHttpInfo();
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      final responseBody = await _decodeBodyBytes(response);
      return (await apiClient.deserializeAsync(responseBody, 'List<DynamicAlbumResponseDto>') as List)
        .cast<DynamicAlbumResponseDto>()
        .toList(growable: false);

    }
    return null;
  }

  /// Performs an HTTP 'DELETE /dynamic-albums/{id}/share/{userId}' operation and returns the [Response].
  /// Parameters:
  ///
  /// * [String] id (required):
  ///
  /// * [String] userId (required):
  Future<Response> removeDynamicAlbumShareWithHttpInfo(String id, String userId,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/dynamic-albums/{id}/share/{userId}'
      .replaceAll('{id}', id)
      .replaceAll('{userId}', userId);

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      apiPath,
      'DELETE',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Parameters:
  ///
  /// * [String] id (required):
  ///
  /// * [String] userId (required):
  Future<void> removeDynamicAlbumShare(String id, String userId,) async {
    final response = await removeDynamicAlbumShareWithHttpInfo(id, userId,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
  }

  /// Performs an HTTP 'POST /dynamic-albums/{id}/share' operation and returns the [Response].
  /// Parameters:
  ///
  /// * [String] id (required):
  ///
  /// * [ShareDynamicAlbumDto] shareDynamicAlbumDto (required):
  Future<Response> shareDynamicAlbumWithHttpInfo(String id, ShareDynamicAlbumDto shareDynamicAlbumDto,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/dynamic-albums/{id}/share'
      .replaceAll('{id}', id);

    // ignore: prefer_final_locals
    Object? postBody = shareDynamicAlbumDto;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>['application/json'];


    return apiClient.invokeAPI(
      apiPath,
      'POST',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Parameters:
  ///
  /// * [String] id (required):
  ///
  /// * [ShareDynamicAlbumDto] shareDynamicAlbumDto (required):
  Future<void> shareDynamicAlbum(String id, ShareDynamicAlbumDto shareDynamicAlbumDto,) async {
    final response = await shareDynamicAlbumWithHttpInfo(id, shareDynamicAlbumDto,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
  }

  /// Performs an HTTP 'PATCH /dynamic-albums/{id}' operation and returns the [Response].
  /// Parameters:
  ///
  /// * [String] id (required):
  ///
  /// * [UpdateDynamicAlbumDto] updateDynamicAlbumDto (required):
  Future<Response> updateDynamicAlbumInfoWithHttpInfo(String id, UpdateDynamicAlbumDto updateDynamicAlbumDto,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/dynamic-albums/{id}'
      .replaceAll('{id}', id);

    // ignore: prefer_final_locals
    Object? postBody = updateDynamicAlbumDto;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>['application/json'];


    return apiClient.invokeAPI(
      apiPath,
      'PATCH',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Parameters:
  ///
  /// * [String] id (required):
  ///
  /// * [UpdateDynamicAlbumDto] updateDynamicAlbumDto (required):
  Future<DynamicAlbumResponseDto?> updateDynamicAlbumInfo(String id, UpdateDynamicAlbumDto updateDynamicAlbumDto,) async {
    final response = await updateDynamicAlbumInfoWithHttpInfo(id, updateDynamicAlbumDto,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      return await apiClient.deserializeAsync(await _decodeBodyBytes(response), 'DynamicAlbumResponseDto',) as DynamicAlbumResponseDto;
    
    }
    return null;
  }

  /// Performs an HTTP 'PUT /dynamic-albums/{id}/share/{userId}' operation and returns the [Response].
  /// Parameters:
  ///
  /// * [String] id (required):
  ///
  /// * [String] userId (required):
  ///
  /// * [UpdateDynamicAlbumShareDto] updateDynamicAlbumShareDto (required):
  Future<Response> updateDynamicAlbumShareWithHttpInfo(String id, String userId, UpdateDynamicAlbumShareDto updateDynamicAlbumShareDto,) async {
    // ignore: prefer_const_declarations
    final apiPath = r'/dynamic-albums/{id}/share/{userId}'
      .replaceAll('{id}', id)
      .replaceAll('{userId}', userId);

    // ignore: prefer_final_locals
    Object? postBody = updateDynamicAlbumShareDto;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>['application/json'];


    return apiClient.invokeAPI(
      apiPath,
      'PUT',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Parameters:
  ///
  /// * [String] id (required):
  ///
  /// * [String] userId (required):
  ///
  /// * [UpdateDynamicAlbumShareDto] updateDynamicAlbumShareDto (required):
  Future<void> updateDynamicAlbumShare(String id, String userId, UpdateDynamicAlbumShareDto updateDynamicAlbumShareDto,) async {
    final response = await updateDynamicAlbumShareWithHttpInfo(id, userId, updateDynamicAlbumShareDto,);
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
  }
}
