import 'package:flutter/material.dart';
import '../models/user.dart';
import '../core/api/api_service.dart';
import '../core/socket/socket_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  final SocketService _socket = SocketService();

  User? _user;
  AuthStatus _status = AuthStatus.unknown;
  String? _error;
  bool _isLoading = false;

  User? get user => _user;
  AuthStatus get status => _status;
  String? get error => _error;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  Future<void> init() async {
    final token = await _api.getToken();
    if (token == null) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }
    try {
      final data = await _api.getProfile();
      _user = User.fromJson(data);
      _status = AuthStatus.authenticated;
      _socket.connect(_user!.id, token);
    } catch (_) {
      await _api.deleteToken();
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _api.login(email, password);
      final token = data['token'];
      await _api.saveToken(token);
      _user = User.fromJson(data['user'] ?? data);
      _status = AuthStatus.authenticated;
      _socket.connect(_user!.id, token);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = _parseError(e);
      _isLoading = false;
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _api.register(
        name: name,
        email: email,
        password: password,
        phone: phone,
      );
      final token = data['token'];
      await _api.saveToken(token);
      _user = User.fromJson(data['user'] ?? data);
      _status = AuthStatus.authenticated;
      _socket.connect(_user!.id, token);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = _parseError(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _socket.disconnect();
    await _api.deleteToken();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void updateUser(User user) {
    _user = user;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  String _parseError(dynamic e) {
    if (e.toString().contains('401') || e.toString().contains('Invalid')) {
      return 'Invalid email or password';
    } else if (e.toString().contains('Network') || e.toString().contains('connection')) {
      return 'Network error. Make sure backend is running.';
    } else if (e.toString().contains('already')) {
      return 'Email already registered';
    }
    return 'Something went wrong. Please try again.';
  }
}
