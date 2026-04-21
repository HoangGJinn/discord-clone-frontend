import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/features/audit_logs/presentation/screens/audit_logs_screen.dart';
import 'package:discord_clone_admin/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:discord_clone_admin/features/moderation/presentation/screens/blacklist_screen.dart';
import 'package:discord_clone_admin/features/moderation/presentation/screens/reported_messages_screen.dart';
import 'package:discord_clone_admin/features/revenue/presentation/screens/revenue_screen.dart';
import 'package:discord_clone_admin/features/servers/presentation/screens/servers_screen.dart';
import 'package:discord_clone_admin/features/users/presentation/screens/users_screen.dart';
import 'package:discord_clone_admin/features/effects/presentation/screens/effects_screen.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

// ──────────────────────────────────────────────────────────────
// Responsive breakpoint: >= 720 → Rail, < 720 → BottomNav
// ──────────────────────────────────────────────────────────────
const double _kRailBreakpoint = 720;

class AdminShell extends StatefulWidget {
  const AdminShell({super.key, required this.adminName});

  final String adminName;

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int _selectedIndex = 0;

  static const _destinations = [
    _NavItem(icon: Icons.dashboard_rounded, label: 'Dashboard'),
    _NavItem(icon: Icons.dns_rounded, label: 'Servers'),
    _NavItem(icon: Icons.people_alt_rounded, label: 'Users'),
    _NavItem(icon: Icons.shield_rounded, label: 'Moderation'),
    _NavItem(icon: Icons.attach_money_rounded, label: 'Doanh Thu'),
    _NavItem(icon: Icons.auto_awesome_rounded, label: 'Hiệu Ứng'),
    _NavItem(icon: Icons.history_rounded, label: 'Audit Logs'),
  ];

  static const _screens = [
    DashboardScreen(),
    ServersScreen(),
    UsersScreen(),
    ModerationHomeScreen(),
    RevenueScreen(),
    EffectsScreen(),
    AuditLogsScreen(),
  ];

  Future<void> _handleLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: const Text('Đăng xuất', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700)),
        content: const Text(
          'Bạn có chắc muốn đăng xuất khỏi trang quản trị?',
          style: TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy', style: TextStyle(color: AppColors.textMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Đăng xuất', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      if (context.mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= _kRailBreakpoint;
        return isWide
            ? _buildRailLayout(context)
            : _buildBottomNavLayout(context);
      },
    );
  }

  // ── Wide layout: NavigationRail + content ─────────────────────
  Widget _buildRailLayout(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          // Sidebar
          Container(
            decoration: const BoxDecoration(
              color: AppColors.navBg,
              border: Border(right: BorderSide(color: AppColors.divider)),
            ),
            child: NavigationRail(
              extended: MediaQuery.of(context).size.width >= 1000,
              selectedIndex: _selectedIndex,
              onDestinationSelected: (i) => setState(() => _selectedIndex = i),
              leading: _RailHeader(adminName: widget.adminName),
              trailing: _RailLogoutButton(onLogout: () => _handleLogout(context)),
              destinations: _destinations
                  .map((d) => NavigationRailDestination(
                        icon: Icon(d.icon),
                        selectedIcon: Icon(d.icon),
                        label: Text(d.label),
                        padding: const EdgeInsets.symmetric(vertical: 2),
                      ))
                  .toList(),
            ),
          ),
          // Main content
          Expanded(
            child: _screens[_selectedIndex],
          ),
        ],
      ),
    );
  }

  // ── Narrow layout: content + BottomNavigationBar ──────────────
  Widget _buildBottomNavLayout(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(_destinations[_selectedIndex].label),
        actions: [
          // Admin avatar + name
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Row(
              children: [
                _AdminAvatar(name: widget.adminName, radius: 16),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.logout_rounded, size: 20),
                  tooltip: 'Đăng xuất',
                  color: AppColors.textMuted,
                  onPressed: () => _handleLogout(context),
                ),
              ],
            ),
          ),
        ],
      ),
      body: _screens[_selectedIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.divider)),
        ),
        child: NavigationBar(
          selectedIndex: _selectedIndex,
          onDestinationSelected: (i) => setState(() => _selectedIndex = i),
          destinations: _destinations
              .map((d) => NavigationDestination(
                    icon: Icon(d.icon),
                    selectedIcon: Icon(d.icon),
                    label: d.label,
                  ))
              .toList(),
        ),
      ),
    );
  }
}

// ── Rail header with admin info ────────────────────────────────
class _RailHeader extends StatelessWidget {
  const _RailHeader({required this.adminName});
  final String adminName;

  @override
  Widget build(BuildContext context) {
    final isExtended = NavigationRail.extendedAnimation(context).value > 0.5;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: isExtended
          ? Row(
              children: [
                const SizedBox(width: 16),
                _AdminAvatar(name: adminName, radius: 20),
                const SizedBox(width: 10),
                Flexible(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        adminName,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const Text(
                        'Administrator',
                        style: TextStyle(color: AppColors.blurple, fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
              ],
            )
          : Column(
              children: [
                _AdminAvatar(name: adminName, radius: 18),
              ],
            ),
    );
  }
}

class _RailLogoutButton extends StatelessWidget {
  const _RailLogoutButton({required this.onLogout});
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final isExtended = NavigationRail.extendedAnimation(context).value > 0.5;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: isExtended
          ? TextButton.icon(
              onPressed: onLogout,
              icon: const Icon(Icons.logout_rounded, size: 16, color: AppColors.textMuted),
              label: const Text('Đăng xuất', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            )
          : IconButton(
              icon: const Icon(Icons.logout_rounded, size: 18, color: AppColors.textMuted),
              tooltip: 'Đăng xuất',
              onPressed: onLogout,
            ),
    );
  }
}

// ── Admin avatar (initials-based) ──────────────────────────────
class _AdminAvatar extends StatelessWidget {
  const _AdminAvatar({required this.name, required this.radius});
  final String name;
  final double radius;

  String get _initials {
    final parts = name.trim().split(' ').where((s) => s.isNotEmpty).toList();
    if (parts.isEmpty) return 'A';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: AppColors.blurple,
      child: Text(
        _initials,
        style: TextStyle(
          color: Colors.white,
          fontSize: radius * 0.7,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

// ── Data model ─────────────────────────────────────────────────
class _NavItem {
  const _NavItem({required this.icon, required this.label});
  final IconData icon;
  final String label;
}

// ── Moderation Home Screen (Sub-tabs) ──────────────────────────
class ModerationHomeScreen extends StatefulWidget {
  const ModerationHomeScreen({super.key});

  @override
  State<ModerationHomeScreen> createState() => _ModerationHomeScreenState();
}

class _ModerationHomeScreenState extends State<ModerationHomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Tab bar
        Container(
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: AppColors.divider)),
          ),
          child: TabBar(
            controller: _tabController,
            labelColor: AppColors.blurple,
            unselectedLabelColor: AppColors.textMuted,
            indicatorColor: AppColors.blurple,
            indicatorSize: TabBarIndicatorSize.label,
            tabs: const [
              Tab(text: 'Báo cáo vi phạm'),
              Tab(text: 'Blacklist'),
            ],
          ),
        ),
        // Tab content
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: const [
              ReportedMessagesScreen(),
              BlacklistScreen(),
            ],
          ),
        ),
      ],
    );
  }
}
