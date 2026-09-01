import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/message.dart';
import '../models/user.dart';
import '../core/api/api_service.dart';
import '../core/socket/socket_service.dart';
import '../core/database/local_db_helper.dart';
import '../core/network/nearby_service.dart';
import '../core/network/sync_service.dart';

class ChatProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  final SocketService _socket = SocketService();
  final LocalDbHelper _db = LocalDbHelper();
  final NearbyService _nearby = NearbyService();
  final SyncService _sync = SyncService();
  final Uuid _uuid = const Uuid();

  // Chat list
  List<Chat> _chats = [];
  bool _chatsLoading = false;

  // Current chat
  String? _currentChatId;
  bool _isGroup = false;
  List<Message> _messages = [];
  bool _messagesLoading = false;
  bool _isTyping = false;
  String? _typingUserId;

  // Nearby P2P Mesh State
  List<String> get connectedMeshPeers => _nearby.connectedPeers.values.toList();
  bool get isMeshAdvertising => _nearby.isAdvertising;
  bool get isMeshDiscovering => _nearby.isDiscovering;

  // Search
  List<User> _searchResults = [];
  bool _searching = false;

  List<Chat> get chats => _chats;
  bool get chatsLoading => _chatsLoading;
  List<Message> get messages => _messages;
  bool get messagesLoading => _messagesLoading;
  bool get isTyping => _isTyping;
  String? get typingUserId => _typingUserId;
  List<User> get searchResults => _searchResults;
  bool get searching => _searching;

  ChatProvider() {
    // Start background sync scheduler when provider is instantiated
    _sync.startSyncScheduler();

    // Hook up P2P Mesh incoming messages
    _nearby.onMessageReceived = (peerEndpointId, msgData) async {
      final msg = Message.fromJson(msgData);
      
      // Save locally to SQLite
      await _db.insertMessage(msgData);

      // If the incoming message belongs to current open chat, append to UI list
      if ((msg.senderId == _currentChatId && !_isGroup) ||
          (msg.groupId == _currentChatId && _isGroup)) {
        _messages.add(msg);
        notifyListeners();
      }
      
      // Trigger chat list update
      _updateChatLastMessage(msg, msg.receiverId ?? '');
    };

    _nearby.onPeersChanged = () {
      notifyListeners();
    };
  }

  @override
  void dispose() {
    _sync.stopSyncScheduler();
    _nearby.stopAll();
    super.dispose();
  }

  // Mesh Network Controls
  Future<void> toggleMeshAdvertising(String userName) async {
    if (_nearby.isAdvertising) {
      await _nearby.stopAdvertising();
    } else {
      await _nearby.startP2PAdvertising(userName);
    }
    notifyListeners();
  }

  Future<void> toggleMeshDiscovery(String userName) async {
    if (_nearby.isDiscovering) {
      await _nearby.stopDiscovery();
    } else {
      await _nearby.startP2PDiscovery(userName);
    }
    notifyListeners();
  }

  Future<void> stopMeshAll() async {
    await _nearby.stopAll();
    notifyListeners();
  }

  void setupSocketListeners(String currentUserId) {
    _socket.onMessage((data) async {
      final msg = Message.fromJson(data);
      
      // Cache message locally in SQLite
      await _db.insertMessage(data);

      // Add to messages if current chat
      if ((msg.senderId == _currentChatId && !_isGroup) ||
          (msg.groupId == _currentChatId && _isGroup)) {
        _messages.add(msg);
        notifyListeners();
      }
      // Update chat list
      _updateChatLastMessage(msg, currentUserId);
    });

    _socket.onGroupMessage((data) async {
      final msg = Message.fromJson(data);
      
      // Cache group message locally in SQLite
      await _db.insertMessage(data);

      if (msg.groupId == _currentChatId && _isGroup) {
        _messages.add(msg);
        notifyListeners();
      }
      _updateChatLastMessage(msg, currentUserId);
    });

    _socket.onTyping((data) {
      if (data['from'] == _currentChatId) {
        _isTyping = true;
        _typingUserId = data['from'];
        notifyListeners();
        Future.delayed(const Duration(seconds: 3), () {
          _isTyping = false;
          notifyListeners();
        });
      }
    });

    _socket.onStopTyping((data) {
      if (data['from'] == _currentChatId) {
        _isTyping = false;
        notifyListeners();
      }
    });

    _socket.onUserOnline((userId) {
      final idx = _chats.indexWhere((c) => c.id == userId);
      if (idx != -1) {
        _chats[idx] = Chat(
          id: _chats[idx].id,
          name: _chats[idx].name,
          avatar: _chats[idx].avatar,
          lastMessage: _chats[idx].lastMessage,
          lastMessageTime: _chats[idx].lastMessageTime,
          unreadCount: _chats[idx].unreadCount,
          isOnline: true,
          isGroup: _chats[idx].isGroup,
        );
        notifyListeners();
      }
    });

    _socket.onUserOffline((userId) {
      final idx = _chats.indexWhere((c) => c.id == userId);
      if (idx != -1) {
        _chats[idx] = Chat(
          id: _chats[idx].id,
          name: _chats[idx].name,
          avatar: _chats[idx].avatar,
          lastMessage: _chats[idx].lastMessage,
          lastMessageTime: _chats[idx].lastMessageTime,
          unreadCount: _chats[idx].unreadCount,
          isOnline: false,
          isGroup: _chats[idx].isGroup,
        );
        notifyListeners();
      }
    });
  }

  void _updateChatLastMessage(Message msg, String currentUserId) {
    final chatId = msg.groupId ?? msg.senderId;
    final idx = _chats.indexWhere((c) => c.id == chatId);
    if (idx != -1) {
      final old = _chats[idx];
      _chats[idx] = Chat(
        id: old.id,
        name: old.name,
        avatar: old.avatar,
        lastMessage: msg.isDeleted ? 'This message was deleted' : msg.content,
        lastMessageTime: msg.createdAt,
        unreadCount: chatId != _currentChatId ? old.unreadCount + 1 : 0,
        isOnline: old.isOnline,
        isGroup: old.isGroup,
      );
      // Move to top
      final updated = _chats.removeAt(idx);
      _chats.insert(0, updated);
      notifyListeners();
    }
  }

  // ─── Load Chats ───────────────────────────────────────────────────────────────
  Future<void> loadChats(String currentUserId) async {
    _chatsLoading = true;
    notifyListeners();

    // First load from local SQLite (Offline fallback)
    try {
      final cachedChats = await _db.getAllChats();
      if (cachedChats.isNotEmpty) {
        _chats = cachedChats.map((c) {
          return Chat(
            id: c['id'],
            name: c['name'],
            avatar: c['avatar'],
            lastMessage: c['last_message'] ?? '',
            lastMessageTime: DateTime.fromMillisecondsSinceEpoch(c['last_message_time']),
            unreadCount: c['unread_count'] ?? 0,
            isOnline: c['is_online'] == 1,
            isGroup: c['is_group'] == 1,
          );
        }).toList();
        notifyListeners();
      }
    } catch (_) {}

    // Next fetch live from Node.js server to update DB cache
    try {
      final contacts = await _api.getContacts();
      final groups = await _api.getGroups();

      final contactChats = contacts.map((c) {
        final other = c['user'] ?? c;
        final msgs = c['lastMessage'];
        final chatData = {
          'id': other['_id'] ?? other['id'] ?? '',
          'name': other['name'] ?? '',
          'avatar': other['profilePicture'] ?? other['avatar'],
          'lastMessage': msgs != null ? (msgs['content'] ?? '') : 'Say hello 👋',
          'lastMessageTime': msgs != null
              ? DateTime.tryParse(msgs['createdAt'] ?? '') ?? DateTime.now()
              : DateTime.now(),
          'unreadCount': c['unreadCount'] ?? 0,
          'isOnline': other['isOnline'] ?? false,
          'isGroup': false,
        };

        // Cache in SQLite
        _db.insertOrUpdateChat(chatData);

        return Chat(
          id: chatData['id'],
          name: chatData['name'],
          avatar: chatData['avatar'],
          lastMessage: chatData['lastMessage'],
          lastMessageTime: chatData['lastMessageTime'],
          unreadCount: chatData['unreadCount'],
          isOnline: chatData['isOnline'],
          isGroup: false,
        );
      }).toList();

      final groupChats = groups.map((g) {
        final msgs = g['lastMessage'];
        final chatData = {
          'id': g['_id'] ?? g['id'] ?? '',
          'name': g['name'] ?? 'Group',
          'avatar': g['avatar'] ?? g['groupPicture'],
          'lastMessage': msgs != null ? (msgs['content'] ?? '') : 'Group created',
          'lastMessageTime': msgs != null
              ? DateTime.tryParse(msgs['createdAt'] ?? '') ?? DateTime.now()
              : DateTime.now(),
          'unreadCount': 0,
          'isOnline': false,
          'isGroup': true,
        };

        // Cache in SQLite
        _db.insertOrUpdateChat(chatData);

        return Chat(
          id: chatData['id'],
          name: chatData['name'],
          avatar: chatData['avatar'],
          lastMessage: chatData['lastMessage'],
          lastMessageTime: chatData['lastMessageTime'],
          unreadCount: 0,
          isOnline: false,
          isGroup: true,
        );
      }).toList();

      _chats = [...contactChats, ...groupChats];
      _chats.sort((a, b) => b.lastMessageTime.compareTo(a.lastMessageTime));
    } catch (e) {
      debugPrint('Load chats error: $e');
    }

    _chatsLoading = false;
    notifyListeners();
  }

  // ─── Load Messages ────────────────────────────────────────────────────────────
  Future<void> loadMessages(String chatId, {bool isGroup = false, required String currentUserId}) async {
    _currentChatId = chatId;
    _isGroup = isGroup;
    _messagesLoading = true;
    _messages = [];
    notifyListeners();

    // First load from local SQLite (Offline fallback)
    try {
      final cachedMsgs = await _db.getMessagesForChat(chatId);
      if (cachedMsgs.isNotEmpty) {
        _messages = cachedMsgs.map((m) {
          return Message(
            id: m['id'],
            senderId: m['sender_id'],
            receiverId: m['receiver_id'],
            groupId: m['is_group'] == 1 ? m['chat_id'] : null,
            content: m['content'] ?? '',
            type: MessageType.text,
            status: m['status'] == 'pending'
                ? MessageStatus.sending
                : (m['status'] == 'delivered' ? MessageStatus.delivered : MessageStatus.sent),
            createdAt: DateTime.fromMillisecondsSinceEpoch(m['timestamp']),
          );
        }).toList();
        notifyListeners();
      }
    } catch (_) {}

    // Next fetch live from Node.js server to update DB cache
    try {
      List<dynamic> data;
      if (isGroup) {
        data = await _api.getGroupMessages(chatId);
      } else {
        data = await _api.getMessages(chatId);
        _api.markMessagesRead(chatId);
      }
      
      // Update local SQLite cache
      for (final m in data) {
        final rawMsg = Message.fromJson(m);
        await _db.insertMessage({
          'id': rawMsg.id,
          'chatId': chatId,
          'senderId': rawMsg.senderId,
          'receiverId': rawMsg.receiverId,
          'content': rawMsg.content,
          'timestamp': rawMsg.createdAt.millisecondsSinceEpoch,
          'status': rawMsg.status.name,
          'is_synced': 1,
          'isGroup': isGroup,
        });
      }

      _messages = data.map((m) => Message.fromJson(m)).toList();
    } catch (e) {
      debugPrint('Load messages error: $e');
    }

    _messagesLoading = false;
    notifyListeners();
  }

  // ─── Send Message ─────────────────────────────────────────────────────────────
  Future<void> sendMessage({
    required String content,
    required String senderId,
    String type = 'text',
    String? mediaUrl,
  }) async {
    if (_currentChatId == null) return;

    final msgId = _uuid.v4(); // Unique UUID generated locally
    final timestamp = DateTime.now();

    // Create Message instance
    final tempMsg = Message(
      id: msgId,
      senderId: senderId,
      receiverId: _isGroup ? null : _currentChatId,
      groupId: _isGroup ? _currentChatId : null,
      content: content,
      type: MessageType.text,
      status: MessageStatus.sending, // Displays 🕒 pending indicator
      createdAt: timestamp,
    );

    // Optimistically add to UI list
    _messages.add(tempMsg);
    notifyListeners();

    // Prepare JSON payload for DB & Mesh
    final messageJson = {
      'id': msgId,
      'chatId': _currentChatId,
      'senderId': senderId,
      'receiverId': _isGroup ? null : _currentChatId,
      'groupId': _isGroup ? _currentChatId : null,
      'content': content,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'status': 'pending',
      'is_synced': 0,
      'isGroup': _isGroup,
    };

    // 1. Broadcast over Mesh Network if P2P peers are connected
    if (connectedMeshPeers.isNotEmpty) {
      await _nearby.broadcastMessage(messageJson);
      // Update local database with 'sent' status for local mesh delivery
      messageJson['status'] = 'delivered'; // Will display as 📡 or delivered
      await _db.insertMessage(messageJson);

      // Update local UI
      final idx = _messages.indexWhere((m) => m.id == tempMsg.id);
      if (idx != -1) {
        _messages[idx] = Message(
          id: msgId,
          senderId: senderId,
          receiverId: tempMsg.receiverId,
          groupId: tempMsg.groupId,
          content: content,
          status: MessageStatus.delivered,
          createdAt: timestamp,
        );
      }
      notifyListeners();
      return;
    }

    // Save offline-first to Local DB
    await _db.insertMessage(messageJson);

    // 2. Try online Node.js server delivery
    try {
      Map<String, dynamic> result;
      if (_isGroup) {
        result = await _api.sendGroupMessage(
          groupId: _currentChatId!,
          content: content,
          type: type,
          mediaUrl: mediaUrl,
        );
        _socket.sendGroupMessage({
          'groupId': _currentChatId,
          'senderId': senderId,
          'content': content,
          'type': type,
        });
      } else {
        result = await _api.sendMessage(
          receiverId: _currentChatId!,
          content: content,
          type: type,
          mediaUrl: mediaUrl,
        );
        _socket.sendMessage({
          'to': _currentChatId,
          'from': senderId,
          'content': content,
          'type': type,
          'messageId': result['_id'] ?? result['id'],
        });
      }

      // Mark as synced in local SQLite
      await _db.markMessageSynced(msgId);

      // Update in UI list
      final idx = _messages.indexWhere((m) => m.id == tempMsg.id);
      if (idx != -1) {
        _messages[idx] = Message.fromJson(result['message'] ?? result);
      }
    } catch (e) {
      // Offline fallback: Leave as is_synced = 0 in SQLite, sync_service will upload later.
      debugPrint('Offline/Local send only, will sync later: $e');
    }
    notifyListeners();
  }

  // ─── Search Users ─────────────────────────────────────────────────────────────
  Future<void> searchUsers(String query) async {
    if (query.isEmpty) {
      _searchResults = [];
      notifyListeners();
      return;
    }
    _searching = true;
    notifyListeners();
    try {
      final data = await _api.searchUsers(query);
      _searchResults = data.map((u) => User.fromJson(u)).toList();
    } catch (_) {}
    _searching = false;
    notifyListeners();
  }

  // ─── Typing ───────────────────────────────────────────────────────────────────
  void sendTyping(String senderId) {
    if (_currentChatId != null) {
      _socket.sendTyping(_currentChatId!, senderId);
    }
  }

  void sendStopTyping(String senderId) {
    if (_currentChatId != null) {
      _socket.sendStopTyping(_currentChatId!, senderId);
    }
  }

  void clearCurrentChat() {
    _currentChatId = null;
    _messages = [];
    _isTyping = false;
    notifyListeners();
  }
}
