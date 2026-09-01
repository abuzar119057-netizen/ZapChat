import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static const String _baseUrl = 'http://localhost:5000/api';
  // Note: For Chrome/Web use localhost:5000
  // For Android Emulator use: http://10.0.2.2:5000/api
  // For real device on same WiFi: http://192.168.1.X:5000/api

  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        return handler.next(error);
      },
    ));
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'jwt_token', value: token);
  }

  Future<void> deleteToken() async {
    await _storage.delete(key: 'jwt_token');
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    final response = await _dio.post('/auth/register', data: {
      'name': name,
      'email': email,
      'password': password,
      if (phone != null) 'phone': phone,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> getProfile() async {
    final response = await _dio.get('/auth/profile');
    return response.data;
  }

  // ─── Contacts ────────────────────────────────────────────────────────────────
  Future<List<dynamic>> getContacts() async {
    final response = await _dio.get('/contacts');
    return response.data;
  }

  Future<List<dynamic>> searchUsers(String query) async {
    final response = await _dio.get('/contacts/search', queryParameters: {'q': query});
    return response.data;
  }

  Future<void> addContact(String userId) async {
    await _dio.post('/contacts/add', data: {'userId': userId});
  }

  // ─── Messages ────────────────────────────────────────────────────────────────
  Future<List<dynamic>> getMessages(String contactId, {int page = 1}) async {
    final response = await _dio.get('/messages/$contactId', queryParameters: {'page': page});
    return response.data is List ? response.data : response.data['messages'] ?? [];
  }

  Future<Map<String, dynamic>> sendMessage({
    required String receiverId,
    required String content,
    String type = 'text',
    String? mediaUrl,
    String? replyToId,
  }) async {
    final response = await _dio.post('/messages/send', data: {
      'receiver': receiverId,
      'content': content,
      'type': type,
      if (mediaUrl != null) 'mediaUrl': mediaUrl,
      if (replyToId != null) 'replyTo': replyToId,
    });
    return response.data;
  }

  Future<List<dynamic>> getGroupMessages(String groupId, {int page = 1}) async {
    final response = await _dio.get('/messages/group/$groupId', queryParameters: {'page': page});
    return response.data is List ? response.data : response.data['messages'] ?? [];
  }

  Future<Map<String, dynamic>> sendGroupMessage({
    required String groupId,
    required String content,
    String type = 'text',
    String? mediaUrl,
  }) async {
    final response = await _dio.post('/messages/group/send', data: {
      'groupId': groupId,
      'content': content,
      'type': type,
      if (mediaUrl != null) 'mediaUrl': mediaUrl,
    });
    return response.data;
  }

  // ─── Groups ───────────────────────────────────────────────────────────────────
  Future<List<dynamic>> getGroups() async {
    final response = await _dio.get('/groups');
    return response.data is List ? response.data : response.data['groups'] ?? [];
  }

  Future<Map<String, dynamic>> createGroup({
    required String name,
    required List<String> members,
    String? description,
  }) async {
    final response = await _dio.post('/groups/create', data: {
      'name': name,
      'members': members,
      if (description != null) 'description': description,
    });
    return response.data;
  }

  // ─── Stories ─────────────────────────────────────────────────────────────────
  Future<List<dynamic>> getStories() async {
    final response = await _dio.get('/stories');
    return response.data is List ? response.data : response.data['stories'] ?? [];
  }

  Future<Map<String, dynamic>> postStory({
    required String mediaUrl,
    required String mediaType,
    String? caption,
  }) async {
    final response = await _dio.post('/stories', data: {
      'mediaUrl': mediaUrl,
      'mediaType': mediaType,
      if (caption != null) 'caption': caption,
    });
    return response.data;
  }

  // ─── File Upload ─────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> uploadFile(String filePath, String fileName) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: fileName),
    });
    final response = await _dio.post('/files/upload', data: formData);
    return response.data;
  }

  // ─── Update Profile ───────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> updateProfile({
    String? name,
    String? about,
    String? profilePicture,
  }) async {
    final response = await _dio.put('/auth/profile', data: {
      if (name != null) 'name': name,
      if (about != null) 'about': about,
      if (profilePicture != null) 'profilePicture': profilePicture,
    });
    return response.data;
  }

  // ─── Mark Messages Read ───────────────────────────────────────────────────────
  Future<void> markMessagesRead(String contactId) async {
    try {
      await _dio.put('/messages/read/$contactId');
    } catch (_) {}
  }
}
