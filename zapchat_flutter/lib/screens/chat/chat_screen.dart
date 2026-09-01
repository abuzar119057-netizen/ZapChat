import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'dart:async';
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../models/message.dart';

class ChatScreen extends StatefulWidget {
  final String chatId;
  final String chatName;
  final bool isGroup;
  final String? avatarUrl;

  const ChatScreen({
    super.key,
    required this.chatId,
    required this.chatName,
    this.isGroup = false,
    this.avatarUrl,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  Timer? _typingTimer;
  bool _isTypingLocal = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    if (user != null) {
      context.read<ChatProvider>().loadMessages(
            widget.chatId,
            isGroup: widget.isGroup,
            currentUserId: user.id,
          );
    }
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    _typingTimer?.cancel();
    super.dispose();
  }

  void _onTextChanged(String text) {
    final auth = context.read<AuthProvider>();
    final chat = context.read<ChatProvider>();
    if (auth.user == null) return;

    if (!_isTypingLocal && text.isNotEmpty) {
      _isTypingLocal = true;
      chat.sendTyping(auth.user!.id);
    }

    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(seconds: 2), () {
      if (_isTypingLocal) {
        _isTypingLocal = false;
        chat.sendStopTyping(auth.user!.id);
      }
    });
  }

  void _sendMessage() {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;

    final auth = context.read<AuthProvider>();
    if (auth.user == null) return;

    context.read<ChatProvider>().sendMessage(
          content: text,
          senderId: auth.user!.id,
        );

    _msgCtrl.clear();
    if (_isTypingLocal) {
      _isTypingLocal = false;
      context.read<ChatProvider>().sendStopTyping(auth.user!.id);
    }

    // Scroll to bottom
    Timer(const Duration(milliseconds: 100), () {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _showMeshPanel(BuildContext context, ChatProvider chat, String currentUserName) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgDarkLight,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Consumer<ChatProvider>(
              builder: (context, provider, _) {
                return Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'P2P Offline Mesh Network',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          if (provider.connectedMeshPeers.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.online.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${provider.connectedMeshPeers.length} Connected',
                                style: const TextStyle(color: AppTheme.online, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Chat directly with nearby devices over Bluetooth & Wi-Fi without internet or SIM card.',
                        style: TextStyle(color: AppTheme.textMutedDark, fontSize: 13),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: provider.isMeshAdvertising ? AppTheme.online : AppTheme.bgDark,
                                side: BorderSide(color: provider.isMeshAdvertising ? Colors.transparent : AppTheme.borderDark),
                              ),
                              onPressed: () async {
                                await provider.toggleMeshAdvertising(currentUserName);
                                setModalState(() {});
                              },
                              icon: Icon(
                                provider.isMeshAdvertising ? Icons.wifi_tethering : Icons.wifi_tethering_off,
                                color: Colors.white,
                              ),
                              label: Text(
                                provider.isMeshAdvertising ? 'Advertising...' : 'Advertise',
                                style: const TextStyle(color: Colors.white),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: provider.isMeshDiscovering ? AppTheme.primary : AppTheme.bgDark,
                                side: BorderSide(color: provider.isMeshDiscovering ? Colors.transparent : AppTheme.borderDark),
                              ),
                              onPressed: () async {
                                await provider.toggleMeshDiscovery(currentUserName);
                                setModalState(() {});
                              },
                              icon: Icon(
                                provider.isMeshDiscovering ? Icons.radar : Icons.radar_outlined,
                                color: Colors.white,
                              ),
                              label: Text(
                                provider.isMeshDiscovering ? 'Scanning...' : 'Scan Peers',
                                style: const TextStyle(color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (provider.connectedMeshPeers.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        const Text(
                          'CONNECTED PEERS',
                          style: TextStyle(color: AppTheme.textMutedDark, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                        ),
                        const SizedBox(height: 8),
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: provider.connectedMeshPeers.length,
                          itemBuilder: (context, index) {
                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: const CircleAvatar(
                                radius: 16,
                                backgroundColor: AppTheme.primary,
                                child: Icon(Icons.person, color: Colors.white, size: 16),
                              ),
                              title: Text(
                                provider.connectedMeshPeers[index],
                                style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                              ),
                              trailing: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppTheme.online,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                      const SizedBox(height: 20),
                      Center(
                        child: TextButton(
                          onPressed: () async {
                            await provider.stopMeshAll();
                            Navigator.pop(context);
                          },
                          child: const Text('Stop P2P Services', style: TextStyle(color: AppTheme.decline)),
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final chat = context.watch<ChatProvider>();
    final user = auth.user;

    final messages = chat.messages;
    final isPeerTyping = chat.isTyping && chat.typingUserId == widget.chatId;

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      // ── Chat Header ──
      appBar: AppBar(
        backgroundColor: AppTheme.bgDark,
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppTheme.primary),
          onPressed: () {
            chat.clearCurrentChat();
            Navigator.of(context).pop();
          },
        ),
        title: GestureDetector(
          onTap: () {},
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppTheme.bgDarkLight,
                backgroundImage: widget.avatarUrl != null ? NetworkImage(widget.avatarUrl!) : null,
                child: widget.avatarUrl == null
                    ? Text(
                        widget.chatName.substring(0, widget.chatName.length > 2 ? 2 : 1).toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                      )
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.chatName,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      isPeerTyping
                          ? 'typing...'
                          : (widget.isGroup
                              ? 'Group Chat'
                              : (chat.connectedMeshPeers.isNotEmpty ? 'Mesh Offline Connected' : 'online')),
                      style: TextStyle(
                        fontSize: 12,
                        color: isPeerTyping ? AppTheme.primary : AppTheme.textMutedDark,
                        fontWeight: isPeerTyping ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          // P2P Offline Mesh Toggle Button
          IconButton(
            icon: Icon(
              chat.connectedMeshPeers.isNotEmpty
                  ? Icons.wifi_tethering
                  : (chat.isMeshAdvertising || chat.isMeshDiscovering ? Icons.radar : Icons.wifi_tethering_off),
              color: chat.connectedMeshPeers.isNotEmpty
                  ? AppTheme.online
                  : (chat.isMeshAdvertising || chat.isMeshDiscovering ? AppTheme.primary : AppTheme.textMutedDark),
            ),
            onPressed: () => _showMeshPanel(context, chat, user?.name ?? "User"),
          ),
          IconButton(
            icon: const Icon(Icons.phone_outlined, color: AppTheme.primary),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.videocam_outlined, color: AppTheme.primary),
            onPressed: () {},
          ),
          const SizedBox(width: 8),
        ],
      ),

      body: Column(
        children: [
          // ── Messages List ──
          Expanded(
            child: Container(
              decoration: const BoxDecoration(
                color: AppTheme.bgDark,
                image: DecorationImage(
                  image: NetworkImage('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'),
                  fit: BoxFit.cover,
                  opacity: 0.08,
                ),
              ),
              child: chat.messagesLoading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                  : ListView.builder(
                      controller: _scrollCtrl,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      itemCount: messages.length,
                      itemBuilder: (context, idx) {
                        final m = messages[idx];
                        final isMine = m.senderId == user?.id;
                        return _buildMessageBubble(m, isMine);
                      },
                    ),
            ),
          ),

          // ── Chat Input Area ──
          Container(
            color: const Color(0xFF0F171C),
            padding: const EdgeInsets.only(left: 12, right: 12, top: 8, bottom: 24),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () {},
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: const BoxDecoration(
                      color: AppTheme.bgDarkLight,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.add, color: AppTheme.primary, size: 24),
                  ),
                ),
                const SizedBox(width: 10),

                // Text Input
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppTheme.bgDarkLight,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: TextField(
                      controller: _msgCtrl,
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                      maxLines: 4,
                      minLines: 1,
                      onChanged: _onTextChanged,
                      decoration: const InputDecoration(
                        hintText: 'New Message',
                        hintStyle: TextStyle(color: AppTheme.textMutedDark, fontSize: 15),
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        border: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        enabledBorder: InputBorder.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // Send Button
                GestureDetector(
                  onTap: _sendMessage,
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: const BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.send, color: Colors.white, size: 18),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(Message m, bool isMine) {
    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isMine ? AppTheme.bubbleSentDark : AppTheme.bubbleReceivedDark,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: isMine ? const Radius.circular(16) : const Radius.circular(4),
            bottomRight: isMine ? const Radius.circular(4) : const Radius.circular(16),
          ),
        ),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (widget.isGroup && !isMine) ...[
              Text(
                'User ${m.senderId.substring(0, 4)}',
                style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
            ],

            // Content
            Text(
              m.content,
              style: const TextStyle(color: Colors.white, fontSize: 15),
            ),
            const SizedBox(height: 4),

            // Time and Ticks
            Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  DateFormat('hh:mm a').format(m.createdAt),
                  style: const TextStyle(fontSize: 10, color: AppTheme.textMutedDark),
                ),
                if (isMine) ...[
                  const SizedBox(width: 4),
                  _buildMessageStatusTicks(m.status),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageStatusTicks(MessageStatus status) {
    switch (status) {
      case MessageStatus.sending:
        return const Icon(Icons.access_time, size: 12, color: AppTheme.textMutedDark);
      case MessageStatus.sent:
        return const Icon(Icons.check, size: 13, color: AppTheme.textMutedDark);
      case MessageStatus.delivered:
        // Use standard double-checks or a custom indicator for mesh sent
        return const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check, size: 13, color: AppTheme.textMutedDark),
            SizedBox(width: -6),
            Icon(Icons.check, size: 13, color: AppTheme.textMutedDark),
          ],
        );
      case MessageStatus.read:
        return const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check, size: 13, color: AppTheme.primary),
            SizedBox(width: -6),
            Icon(Icons.check, size: 13, color: AppTheme.primary),
          ],
        );
    }
  }
}
