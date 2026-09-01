import 'dart:async';
import 'package:dio/dio.dart';
import '../../core/api/api_service.dart';
import '../database/local_db_helper.dart';

class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  Timer? _syncTimer;
  bool _isSyncing = false;

  void startSyncScheduler() {
    _syncTimer?.cancel();
    // Periodically run sync every 15 seconds
    _syncTimer = Timer.periodic(const Duration(seconds: 15), (_) => triggerSync());
  }

  void stopSyncScheduler() {
    _syncTimer?.cancel();
  }

  Future<void> triggerSync() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final db = LocalDbHelper();
      final api = ApiService();

      // Check if we can make a test connection to API
      final token = await api.getToken();
      if (token == null) {
        _isSyncing = false;
        return;
      }

      // Fetch unsynced messages from local database
      final unsynced = await db.getUnsyncedMessages();
      if (unsynced.isEmpty) {
        _isSyncing = false;
        return;
      }

      for (final msg in unsynced) {
        try {
          // Send message to Node.js backend
          await api.sendMessage(
            receiverId: msg['receiver_id'],
            content: msg['content'],
            type: 'text',
          );
          
          // Mark as synced locally
          await db.markMessageSynced(msg['id']);
        } on DioException catch (e) {
          // If server is unreachable or bad network, abort loop and try later
          if (e.type == DioExceptionType.connectionTimeout ||
              e.type == DioExceptionType.sendTimeout ||
              e.type == DioExceptionType.receiveTimeout) {
            break;
          }
        } catch (_) {}
      }
    } catch (_) {}

    _isSyncing = false;
  }
}
