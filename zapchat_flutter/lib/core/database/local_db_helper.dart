import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class LocalDbHelper {
  static final LocalDbHelper _instance = LocalDbHelper._internal();
  factory LocalDbHelper() => _instance;
  LocalDbHelper._internal();

  static Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'zapchat_local.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE messages (
            id TEXT PRIMARY KEY,
            chat_id TEXT,
            sender_id TEXT,
            receiver_id TEXT,
            content TEXT,
            timestamp INTEGER,
            status TEXT,
            is_synced INTEGER,
            is_group INTEGER
          )
        ''');
        
        await db.execute('''
          CREATE TABLE chats (
            id TEXT PRIMARY KEY,
            name TEXT,
            avatar TEXT,
            last_message TEXT,
            last_message_time INTEGER,
            unread_count INTEGER,
            is_group INTEGER,
            is_online INTEGER
          )
        ''');
      },
    );
  }

  // --- Messages CRUD ---
  Future<void> insertMessage(Map<String, dynamic> msg) async {
    final db = await database;
    await db.insert(
      'messages',
      {
        'id': msg['id'],
        'chat_id': msg['chatId'] ?? msg['receiverId'] ?? msg['senderId'],
        'sender_id': msg['senderId'] ?? msg['sender'],
        'receiver_id': msg['receiverId'] ?? msg['receiver'],
        'content': msg['content'],
        'timestamp': msg['timestamp'] is int
            ? msg['timestamp']
            : DateTime.tryParse(msg['timestamp'] ?? '')?.millisecondsSinceEpoch ??
                DateTime.now().millisecondsSinceEpoch,
        'status': msg['status'] ?? 'pending',
        'is_synced': msg['is_synced'] ?? 0,
        'is_group': (msg['isGroup'] == true || msg['is_group'] == 1) ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getMessagesForChat(String chatId) async {
    final db = await database;
    final res = await db.query(
      'messages',
      where: 'chat_id = ?',
      whereArgs: [chatId],
      orderBy: 'timestamp ASC',
    );
    return res;
  }

  Future<List<Map<String, dynamic>>> getUnsyncedMessages() async {
    final db = await database;
    return await db.query(
      'messages',
      where: 'is_synced = 0',
    );
  }

  Future<void> markMessageSynced(String id) async {
    final db = await database;
    await db.update(
      'messages',
      {'is_synced': 1, 'status': 'sent'},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // --- Chats CRUD ---
  Future<void> insertOrUpdateChat(Map<String, dynamic> chat) async {
    final db = await database;
    await db.insert(
      'chats',
      {
        'id': chat['id'],
        'name': chat['name'],
        'avatar': chat['avatar'],
        'last_message': chat['lastMessage'],
        'last_message_time': chat['lastMessageTime'] is int
            ? chat['lastMessageTime']
            : DateTime.tryParse(chat['lastMessageTime'] ?? '')?.millisecondsSinceEpoch ??
                DateTime.now().millisecondsSinceEpoch,
        'unread_count': chat['unreadCount'] ?? 0,
        'is_group': (chat['isGroup'] == true || chat['is_group'] == 1) ? 1 : 0,
        'is_online': (chat['isOnline'] == true || chat['is_online'] == 1) ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getAllChats() async {
    final db = await database;
    return await db.query('chats', orderBy: 'last_message_time DESC');
  }
}
