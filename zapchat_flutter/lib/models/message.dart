enum MessageType { text, image, video, audio, file, location, sticker }
enum MessageStatus { sending, sent, delivered, read }

class Message {
  final String id;
  final String senderId;
  final String? receiverId;
  final String? groupId;
  final String content;
  final MessageType type;
  final MessageStatus status;
  final DateTime createdAt;
  final String? mediaUrl;
  final String? fileName;
  final int? fileSize;
  final Map<String, dynamic>? replyTo;
  final List<Map<String, dynamic>> reactions;
  final bool isDeleted;

  Message({
    required this.id,
    required this.senderId,
    this.receiverId,
    this.groupId,
    required this.content,
    this.type = MessageType.text,
    this.status = MessageStatus.sent,
    required this.createdAt,
    this.mediaUrl,
    this.fileName,
    this.fileSize,
    this.replyTo,
    this.reactions = const [],
    this.isDeleted = false,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['_id'] ?? json['id'] ?? '',
      senderId: json['sender'] is Map ? json['sender']['_id'] : (json['sender'] ?? json['senderId'] ?? ''),
      receiverId: json['receiver'] is Map ? json['receiver']['_id'] : (json['receiver'] ?? json['receiverId']),
      groupId: json['group'] ?? json['groupId'],
      content: json['content'] ?? json['text'] ?? '',
      type: _parseType(json['type'] ?? 'text'),
      status: _parseStatus(json['status'] ?? 'sent'),
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      mediaUrl: json['mediaUrl'] ?? json['fileUrl'],
      fileName: json['fileName'],
      fileSize: json['fileSize'],
      replyTo: json['replyTo'],
      reactions: List<Map<String, dynamic>>.from(json['reactions'] ?? []),
      isDeleted: json['isDeleted'] ?? false,
    );
  }

  static MessageType _parseType(String type) {
    switch (type) {
      case 'image': return MessageType.image;
      case 'video': return MessageType.video;
      case 'audio': return MessageType.audio;
      case 'file': return MessageType.file;
      case 'location': return MessageType.location;
      default: return MessageType.text;
    }
  }

  static MessageStatus _parseStatus(String status) {
    switch (status) {
      case 'sending': return MessageStatus.sending;
      case 'delivered': return MessageStatus.delivered;
      case 'read': return MessageStatus.read;
      default: return MessageStatus.sent;
    }
  }

  bool get isMine => false; // Will be set by provider context

  Map<String, dynamic> toJson() => {
    '_id': id,
    'sender': senderId,
    'receiver': receiverId,
    'group': groupId,
    'content': content,
    'type': type.name,
    'status': status.name,
    'createdAt': createdAt.toIso8601String(),
    'mediaUrl': mediaUrl,
    'reactions': reactions,
    'isDeleted': isDeleted,
  };
}

class Chat {
  final String id; // contactId or groupId
  final String name;
  final String? avatar;
  final String lastMessage;
  final DateTime lastMessageTime;
  final int unreadCount;
  final bool isOnline;
  final bool isGroup;
  final MessageStatus lastMessageStatus;
  final String? lastMessageSenderId;

  Chat({
    required this.id,
    required this.name,
    this.avatar,
    required this.lastMessage,
    required this.lastMessageTime,
    this.unreadCount = 0,
    this.isOnline = false,
    this.isGroup = false,
    this.lastMessageStatus = MessageStatus.sent,
    this.lastMessageSenderId,
  });
}
