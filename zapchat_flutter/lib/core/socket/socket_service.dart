import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  static const String _serverUrl = 'http://localhost:5000';
  // For Chrome/Web use: localhost:5000
  // For Android Emulator use: http://10.0.2.2:5000
  // For real device on same WiFi: http://192.168.1.X:5000

  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  IO.Socket? _socket;
  bool _isConnected = false;
  String? _userId;

  SocketService._internal();

  bool get isConnected => _isConnected;

  void connect(String userId, String token) {
    if (_isConnected && _userId == userId) return;
    _userId = userId;

    _socket = IO.io(
      _serverUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(1000)
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      _socket!.emit('user_online', {'userId': userId});
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
    });

    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _isConnected = false;
    _userId = null;
  }

  // ─── Emit Events ─────────────────────────────────────────────────────────────
  void sendMessage(Map<String, dynamic> data) {
    _socket?.emit('send_message', data);
  }

  void sendGroupMessage(Map<String, dynamic> data) {
    _socket?.emit('send_group_message', data);
  }

  void sendTyping(String receiverId, String senderId) {
    _socket?.emit('typing', {'to': receiverId, 'from': senderId});
  }

  void sendStopTyping(String receiverId, String senderId) {
    _socket?.emit('stop_typing', {'to': receiverId, 'from': senderId});
  }

  void markRead(String senderId, String receiverId) {
    _socket?.emit('message_read', {'senderId': senderId, 'receiverId': receiverId});
  }

  void joinRoom(String roomId) {
    _socket?.emit('join_room', roomId);
  }

  // ─── Listen Events ────────────────────────────────────────────────────────────
  void onMessage(Function(Map<String, dynamic>) callback) {
    _socket?.on('receive_message', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void onGroupMessage(Function(Map<String, dynamic>) callback) {
    _socket?.on('receive_group_message', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void onTyping(Function(Map<String, dynamic>) callback) {
    _socket?.on('typing', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void onStopTyping(Function(Map<String, dynamic>) callback) {
    _socket?.on('stop_typing', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void onUserOnline(Function(String) callback) {
    _socket?.on('user_online', (data) => callback(data['userId'] ?? data.toString()));
  }

  void onUserOffline(Function(String) callback) {
    _socket?.on('user_offline', (data) => callback(data['userId'] ?? data.toString()));
  }

  void onMessageRead(Function(Map<String, dynamic>) callback) {
    _socket?.on('message_read', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void onMessageDelivered(Function(Map<String, dynamic>) callback) {
    _socket?.on('message_delivered', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void onCallIncoming(Function(Map<String, dynamic>) callback) {
    _socket?.on('call_incoming', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void off(String event) {
    _socket?.off(event);
  }

  void offAll() {
    _socket?.clearListeners();
  }
}
