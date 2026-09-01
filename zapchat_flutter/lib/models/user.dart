class User {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? profilePicture;
  final String? about;
  final bool isOnline;
  final DateTime? lastSeen;
  final String? token;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.profilePicture,
    this.about,
    this.isOnline = false,
    this.lastSeen,
    this.token,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'],
      profilePicture: json['profilePicture'] ?? json['avatar'],
      about: json['about'] ?? json['status'],
      isOnline: json['isOnline'] ?? false,
      lastSeen: json['lastSeen'] != null ? DateTime.tryParse(json['lastSeen']) : null,
      token: json['token'],
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'name': name,
    'email': email,
    'phone': phone,
    'profilePicture': profilePicture,
    'about': about,
    'isOnline': isOnline,
    'lastSeen': lastSeen?.toIso8601String(),
  };

  User copyWith({
    String? id,
    String? name,
    String? email,
    String? phone,
    String? profilePicture,
    String? about,
    bool? isOnline,
    DateTime? lastSeen,
    String? token,
  }) {
    return User(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      profilePicture: profilePicture ?? this.profilePicture,
      about: about ?? this.about,
      isOnline: isOnline ?? this.isOnline,
      lastSeen: lastSeen ?? this.lastSeen,
      token: token ?? this.token,
    );
  }
}
