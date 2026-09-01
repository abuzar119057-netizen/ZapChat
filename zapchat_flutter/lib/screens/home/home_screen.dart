import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../models/user.dart';
import '../../core/api/api_service.dart';
import '../auth/auth_screen.dart';
import '../chat/chat_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _activeTab = 'chats'; // chats, calls, status, settings
  String _chatFilter = 'all'; // all, unread, groups, favorites
  final _searchCtrl = TextEditingController();
  String _searchQuery = '';

  // Settings subpage state
  String? _settingsSubPage; // profile, privacy, about, etc.

  // Profile fields editing
  final _nameCtrl = TextEditingController();
  final _aboutCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _isSavingProfile = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    if (user != null) {
      _nameCtrl.text = user.name;
      _aboutCtrl.text = user.about ?? '';
      _phoneCtrl.text = user.phone ?? '';
      context.read<ChatProvider>().setupSocketListeners(user.id);
      context.read<ChatProvider>().loadChats(user.id);
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _nameCtrl.dispose();
    _aboutCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  String _getHeaderTitle() {
    if (_activeTab == 'settings') {
      if (_settingsSubPage == 'profile') return 'Profile';
      if (_settingsSubPage == 'privacy') return 'Privacy';
      return 'Settings';
    }
    if (_activeTab == 'status') return 'Status Updates';
    if (_activeTab == 'calls') return 'Calls';
    return '';
  }

  void _saveProfile() async {
    setState(() => _isSavingProfile = true);
    try {
      final auth = context.read<AuthProvider>();
      final result = await ApiService().updateProfile(
        name: _nameCtrl.text.trim(),
        about: _aboutCtrl.text.trim(),
      );
      auth.updateUser(User.fromJson(result));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated successfully'), backgroundColor: AppTheme.online),
      );
      setState(() => _settingsSubPage = null);
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update profile'), backgroundColor: AppTheme.decline),
      );
    }
    setState(() => _isSavingProfile = false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final chat = context.watch<ChatProvider>();
    final user = auth.user;

    if (user == null) return const SizedBox.shrink();

    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      // ── App Bar (matching iOS Navigation Bar) ──
      appBar: AppBar(
        backgroundColor: AppTheme.bgDark,
        elevation: 0,
        leadingWidth: 80,
        leading: _settingsSubPage != null
            ? TextButton.icon(
                onPressed: () => setState(() => _settingsSubPage = null),
                icon: const Icon(Icons.arrow_back_ios_new, size: 16, color: AppTheme.primary),
                label: const Text('Back', style: TextStyle(color: AppTheme.primary, fontSize: 16)),
              )
            : Center(
                child: Text(
                  _activeTab == 'settings' ? '' : 'Edit',
                  style: const TextStyle(color: AppTheme.primary, fontSize: 17, fontWeight: FontWeight.w400),
                ),
              ),
        title: Text(
          _settingsSubPage != null || _activeTab == 'settings' || _activeTab == 'status' || _activeTab == 'calls'
              ? _getHeaderTitle()
              : 'ZAPCHAT',
          style: TextStyle(
            fontSize: _settingsSubPage != null ? 17 : 15,
            fontWeight: FontWeight.w700,
            letterSpacing: _settingsSubPage != null ? -0.4 : 0.5,
            color: _settingsSubPage != null ? Colors.white : AppTheme.textMutedDark,
          ),
        ),
        actions: [
          if (_activeTab == 'chats' && _settingsSubPage == null) ...[
            IconButton(
              icon: const Icon(Icons.camera_alt_outlined, color: AppTheme.primary),
              onPressed: () {
                // Mock camera
              },
            ),
            Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: GestureDetector(
                onTap: () {
                  // Mock create group
                },
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: const BoxDecoration(
                    color: AppTheme.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.add, color: Colors.white, size: 20),
                ),
              ),
            ),
          ],
          if (_activeTab == 'status' && _settingsSubPage == null)
            IconButton(
              icon: const Icon(Icons.settings_outlined, color: AppTheme.primary),
              onPressed: () {},
            ),
        ],
      ),

      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Large Title (only when no subpage) ──
          if (_settingsSubPage == null && _activeTab != 'settings' && _activeTab != 'status')
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
              child: Text(
                _activeTab == 'chats' ? 'Chats' : 'Calls',
                style: const TextStyle(fontSize: 34, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),

          // ── Search Bar ──
          if (_activeTab == 'chats' && _settingsSubPage == null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Container(
                height: 38,
                decoration: BoxDecoration(
                  color: AppTheme.bgDarkLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: TextField(
                  controller: _searchCtrl,
                  style: const TextStyle(color: Colors.white, fontSize: 16),
                  decoration: const InputDecoration(
                    hintText: 'Search chats',
                    prefixIcon: Icon(Icons.search, color: AppTheme.textMutedDark, size: 20),
                    contentPadding: EdgeInsets.symmetric(vertical: 8),
                  ),
                  onChanged: (val) {
                    setState(() => _searchQuery = val.trim());
                  },
                ),
              ),
            ),

          // ── Chips Filters (All, Unread, Groups, etc.) ──
          if (_activeTab == 'chats' && _settingsSubPage == null)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Row(
                children: [
                  _buildFilterChip('all', 'All'),
                  const SizedBox(width: 8),
                  _buildFilterChip('unread', 'Unread'),
                  const SizedBox(width: 8),
                  _buildFilterChip('groups', 'Groups'),
                  const SizedBox(width: 8),
                  _buildFilterChip('favorites', 'Favorites'),
                ],
              ),
            ),

          // ── Main Content Area ──
          Expanded(
            child: _settingsSubPage != null
                ? _buildSettingsSubPage()
                : _buildActiveTabContent(chat, user.id),
          ),
        ],
      ),

      // ── iOS Bottom Sticky Tab Bar ──
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF0F171C),
          border: Border(top: BorderSide(color: AppTheme.borderDark, width: 0.5)),
        ),
        padding: const EdgeInsets.only(top: 8.0, bottom: 24.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildTabButton('chats', 'Chats', Icons.chat_bubble_outline, Icons.chat_bubble),
            _buildTabButton('calls', 'Calls', Icons.phone_outlined, Icons.phone),
            _buildTabButton('status', 'Status', Icons.circle_outlined, Icons.circle),
            _buildTabButton('settings', 'Settings', Icons.settings_outlined, Icons.settings),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String id, String label) {
    final isActive = _chatFilter == id;
    return GestureDetector(
      onTap: () => setState(() => _chatFilter = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.primary.withValues(alpha: 0.15) : AppTheme.bgDarkLight,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isActive ? AppTheme.primary : AppTheme.textMutedDark,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildTabButton(String id, String label, IconData outlineIcon, IconData filledIcon) {
    final isActive = _activeTab == id;
    return GestureDetector(
      onTap: () {
        setState(() {
          _activeTab = id;
          _settingsSubPage = null;
        });
      },
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isActive ? filledIcon : outlineIcon,
            color: isActive ? AppTheme.primary : AppTheme.textMutedDark,
            size: 26,
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              color: isActive ? AppTheme.primary : AppTheme.textMutedDark,
              letterSpacing: -0.1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveTabContent(ChatProvider chat, String currentUserId) {
    switch (_activeTab) {
      case 'chats':
        return _buildChatsList(chat, currentUserId);
      case 'status':
        return _buildStatusList();
      case 'calls':
        return _buildCallsList();
      case 'settings':
        return _buildSettingsIndex();
      default:
        return const SizedBox.shrink();
    }
  }

  // ─── CHATS LIST ───
  Widget _buildChatsList(ChatProvider chat, String currentUserId) {
    if (chat.chatsLoading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
    }

    var list = chat.chats;

    // Apply Filters
    if (_chatFilter == 'unread') {
      list = list.where((c) => c.unreadCount > 0).toList();
    } else if (_chatFilter == 'groups') {
      list = list.where((c) => c.isGroup).toList();
    }

    // Apply Search Query
    if (_searchQuery.isNotEmpty) {
      list = list.where((c) => c.name.toLowerCase().contains(_searchQuery.toLowerCase())).toList();
    }

    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.chat_bubble_outline, size: 48, color: AppTheme.primary.withValues(alpha: 0.4)),
            const SizedBox(height: 12),
            const Text('No chats yet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 4),
            const Text('Start a conversation!', style: TextStyle(fontSize: 13, color: AppTheme.textMutedDark)),
          ],
        ),
      );
    }

    return ListView.separated(
      itemCount: list.length,
      separatorBuilder: (_, __) => const Divider(color: AppTheme.borderDark, height: 0.5),
      itemBuilder: (context, idx) {
        final c = list[idx];
        return ListTile(
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => ChatScreen(
                  chatId: c.id,
                  chatName: c.name,
                  isGroup: c.isGroup,
                  avatarUrl: c.avatar,
                ),
              ),
            );
          },
          leading: Stack(
            children: [
              CircleAvatar(
                radius: 27,
                backgroundColor: AppTheme.bgDarkLight,
                backgroundImage: c.avatar != null ? NetworkImage(c.avatar!) : null,
                child: c.avatar == null
                    ? Text(
                        c.name.substring(0, c.name.length > 2 ? 2 : 1).toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      )
                    : null,
              ),
              if (c.isOnline)
                Positioned(
                  bottom: 1,
                  right: 1,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: AppTheme.online,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.bgDark, width: 2),
                    ),
                  ),
                ),
            ],
          ),
          title: Row(
            children: [
              Expanded(
                child: Text(
                  c.name,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                DateFormat('hh:mm a').format(c.lastMessageTime),
                style: TextStyle(
                  fontSize: 12,
                  color: c.unreadCount > 0 ? AppTheme.primary : AppTheme.textMutedDark,
                  fontWeight: c.unreadCount > 0 ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ],
          ),
          subtitle: Row(
            children: [
              Expanded(
                child: Text(
                  c.lastMessage,
                  style: const TextStyle(fontSize: 14, color: AppTheme.textMutedDark),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (c.unreadCount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: const BoxDecoration(
                    color: AppTheme.primary,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    '${c.unreadCount}',
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  // ─── STATUS UPDATES LIST ───
  Widget _buildStatusList() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      children: [
        // My status row
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Stack(
            children: [
              const CircleAvatar(
                radius: 27,
                backgroundColor: AppTheme.bgDarkLight,
                child: Icon(Icons.person, color: Colors.white, size: 28),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    color: AppTheme.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.add, color: Colors.white, size: 16),
                ),
              ),
            ],
          ),
          title: const Text('My Status', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          subtitle: const Text('Tap to add status update', style: TextStyle(color: AppTheme.textMutedDark)),
        ),
        const SizedBox(height: 20),
        const Text('RECENT UPDATES', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMutedDark, letterSpacing: 0.5)),
        const SizedBox(height: 10),
        // Mock active updates
        const Center(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 30.0),
            child: Text('No updates available', style: TextStyle(color: AppTheme.textMutedDark)),
          ),
        ),

        const SizedBox(height: 20),
        const Text('DEVICE GALLERY MOCKUP', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMutedDark, letterSpacing: 0.5)),
        const SizedBox(height: 12),
        // Mockups grid matching web gallery
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 3 / 4,
          children: [
            _buildGalleryItem('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80', 'Sunset'),
            _buildGalleryItem('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&auto=format&fit=crop&q=80', 'Urban'),
            _buildGalleryItem('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop&q=80', 'Forest'),
            _buildGalleryItem('https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=600&auto=format&fit=crop&q=80', 'Neon'),
          ],
        ),
      ],
    );
  }

  Widget _buildGalleryItem(String url, String label) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        image: DecorationImage(image: NetworkImage(url), fit: BoxFit.cover),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(
            colors: [Colors.black.withValues(alpha: 0.6), Colors.transparent],
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
          ),
        ),
        alignment: Alignment.bottomCenter,
        padding: const EdgeInsets.only(bottom: 8.0),
        child: Text(
          label,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5),
        ),
      ),
    );
  }

  // ─── CALLS HISTORY LIST ───
  Widget _buildCallsList() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.phone_outlined, size: 48, color: AppTheme.decline.withValues(alpha: 0.4)),
          const SizedBox(height: 12),
          const Text('No call history', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
        ],
      ),
    );
  }

  // ─── SETTINGS INDEX VIEW ───
  Widget _buildSettingsIndex() {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return ListView(
      children: [
        const SizedBox(height: 12),
        // Profile Card
        ListTile(
          tileColor: AppTheme.bgDarkLight,
          onTap: () => setState(() => _settingsSubPage = 'profile'),
          leading: CircleAvatar(
            radius: 30,
            backgroundColor: AppTheme.bgDark,
            backgroundImage: user?.profilePicture != null ? NetworkImage(user!.profilePicture!) : null,
            child: user?.profilePicture == null
                ? const Icon(Icons.person, color: Colors.white, size: 30)
                : null,
          ),
          title: Text(user?.name ?? 'User', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white)),
          subtitle: Text(user?.about ?? 'Hey there! I am using Zap Chat.', style: const TextStyle(color: AppTheme.textMutedDark)),
          trailing: const Icon(Icons.chevron_right, color: AppTheme.textMutedDark),
        ),
        const SizedBox(height: 20),

        // Settings items
        Container(
          color: AppTheme.bgDarkLight,
          child: Column(
            children: [
              _buildSettingsRow('account', 'Account', Icons.person_outline, AppTheme.primary),
              const Divider(color: AppTheme.borderDark, height: 0.5, indent: 56),
              _buildSettingsRow('privacy', 'Privacy', Icons.lock_outline, AppTheme.online),
              const Divider(color: AppTheme.borderDark, height: 0.5, indent: 56),
              _buildSettingsRow('appearance', 'Chats & Wallpaper', Icons.chat_bubble_outline, Colors.orange),
              const Divider(color: AppTheme.borderDark, height: 0.5, indent: 56),
              _buildSettingsRow('data', 'Data and Storage', Icons.data_usage_outlined, Colors.purple),
            ],
          ),
        ),

        const SizedBox(height: 20),
        // Logout Row
        Container(
          color: AppTheme.bgDarkLight,
          child: ListTile(
            onTap: () {
              auth.logout();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const AuthScreen()),
                (route) => false,
              );
            },
            leading: Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(color: AppTheme.decline.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
              child: const Icon(Icons.logout, color: AppTheme.decline, size: 18),
            ),
            title: const Text('Log Out', style: TextStyle(color: AppTheme.decline, fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }

  Widget _buildSettingsRow(String id, String label, IconData icon, Color color) {
    return ListTile(
      onTap: () => setState(() => _settingsSubPage = id),
      leading: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(6)),
        child: Icon(icon, color: Colors.white, size: 18),
      ),
      title: Text(label, style: const TextStyle(color: Colors.white, fontSize: 16)),
      trailing: const Icon(Icons.chevron_right, color: AppTheme.textMutedDark),
    );
  }

  // ─── SETTINGS SUBPAGES ───
  Widget _buildSettingsSubPage() {
    if (_settingsSubPage == 'profile') {
      return ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
        children: [
          // Edit avatar
          Center(
            child: Stack(
              children: [
                const CircleAvatar(
                  radius: 45,
                  backgroundColor: AppTheme.bgDarkLight,
                  child: Icon(Icons.person, color: Colors.white, size: 45),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle),
                    child: const Icon(Icons.edit, color: Colors.white, size: 16),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Fields
          const Text('DISPLAY NAME', style: TextStyle(fontSize: 12, color: AppTheme.textMutedDark, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          TextField(
            controller: _nameCtrl,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(filled: true, fillColor: AppTheme.bgDarkLight),
          ),
          const SizedBox(height: 16),

          const Text('ABOUT / STATUS', style: TextStyle(fontSize: 12, color: AppTheme.textMutedDark, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          TextField(
            controller: _aboutCtrl,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(filled: true, fillColor: AppTheme.bgDarkLight),
          ),
          const SizedBox(height: 30),

          _isSavingProfile
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
              : ElevatedButton(
                  onPressed: _saveProfile,
                  child: const Text('Save Details'),
                ),
        ],
      );
    }

    if (_settingsSubPage == 'privacy') {
      return ListView(
        children: [
          const SizedBox(height: 12),
          Container(
            color: AppTheme.bgDarkLight,
            child: Column(
              children: [
                ListTile(
                  title: const Text('Last Seen Visibility', style: TextStyle(color: Colors.white)),
                  trailing: TextButton(onPressed: () {}, child: const Text('Everyone')),
                ),
                const Divider(color: AppTheme.borderDark, height: 0.5),
                ListTile(
                  title: const Text('Profile Photo', style: TextStyle(color: Colors.white)),
                  trailing: TextButton(onPressed: () {}, child: const Text('Everyone')),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return Center(
      child: Text('Settings page: $_settingsSubPage', style: const TextStyle(color: Colors.white)),
    );
  }
}
