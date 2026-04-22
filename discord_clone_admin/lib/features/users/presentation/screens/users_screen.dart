import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/features/users/presentation/controllers/users_controller.dart';
import 'package:discord_clone_admin/shared/widgets/admin_search_bar.dart';
import 'package:discord_clone_admin/shared/widgets/section_header.dart';
import 'package:discord_clone_admin/shared/widgets/skeleton_list.dart';
import 'package:flutter/material.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  late final UsersController _controller;
  final _searchController = TextEditingController();
  int _selectedFilter = 0;

  static const _filters = ['Tất cả', 'Đang hoạt động', 'Bị cấm'];

  @override
  void initState() {
    super.initState();
    _controller = UsersController();
    _loadUsers();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    // Debounce search
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted && _searchController.text == _searchController.value.text) {
        _loadUsers();
      }
    });
  }

  Future<void> _loadUsers() async {
    String? search = _searchController.text.isNotEmpty ? _searchController.text : null;
    bool? active;
    if (_selectedFilter == 1) active = true;
    if (_selectedFilter == 2) active = false;

    await _controller.loadUsers(search: search, active: active);
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadUsers,
          child: CustomScrollView(
            slivers: [
              // ── Header ─────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                  child: SectionHeader(
                    title: 'Quản lý Users',
                    subtitle: 'Xem và quản lý tất cả người dùng',
                    action: _ExportButton(onPressed: _controller.isLoading ? null : _loadUsers),
                  ),
                ),
              ),
              // ── Quick stats ─────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: _UserQuickStats(controller: _controller),
                ),
              ),
              // ── Search + filter ────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                  child: Column(
                    children: [
                      AdminSearchBar(
                        controller: _searchController,
                        hintText: 'Tìm kiếm theo username hoặc email...',
                      ),
                      const SizedBox(height: 12),
                      _FilterRow(
                        filters: _filters,
                        selected: _selectedFilter,
                        onSelected: (i) {
                          setState(() => _selectedFilter = i);
                          _loadUsers();
                        },
                      ),
                      const Divider(height: 20),
                    ],
                  ),
                ),
              ),
              // ── Sort bar ───────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: _SortBar(),
                ),
              ),
              // ── User list ──────────────────────────────────
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverToBoxAdapter(
                  child: _UserList(controller: _controller),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Quick stats mini row ───────────────────────────────────────
class _UserQuickStats extends StatelessWidget {
  final UsersController controller;

  const _UserQuickStats({required this.controller});

  @override
  Widget build(BuildContext context) {
    if (controller.isLoading) {
      return const Row(
        children: [
          Expanded(child: _MiniStatCardLoading()),
          SizedBox(width: 8),
          Expanded(child: _MiniStatCardLoading()),
          SizedBox(width: 8),
          Expanded(child: _MiniStatCardLoading()),
          SizedBox(width: 8),
          Expanded(child: _MiniStatCardLoading()),
        ],
      );
    }

    final stats = [
      _QuickStat(label: 'Tổng users', value: '${controller.totalUsers}', color: AppColors.blurple, icon: Icons.people_rounded),
      _QuickStat(label: 'Online', value: '–', color: AppColors.success, icon: Icons.circle),
      _QuickStat(label: 'Bị cấm', value: '–', color: AppColors.danger, icon: Icons.block_rounded),
      _QuickStat(label: 'Mới hôm nay', value: '–', color: AppColors.gold, icon: Icons.person_add_rounded),
    ];

    return Row(
      children: stats
          .map((s) => Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: s == stats.last ? 0 : 8),
                  child: _MiniStatCard(stat: s),
                ),
              ))
          .toList(),
    );
  }
}

class _MiniStatCard extends StatelessWidget {
  const _MiniStatCard({required this.stat});
  final _QuickStat stat;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Icon(stat.icon, color: stat.color, size: 18),
          const SizedBox(height: 6),
          Text(
            stat.value,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            stat.label,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _MiniStatCardLoading extends StatelessWidget {
  const _MiniStatCardLoading();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: const Column(
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          SizedBox(height: 6),
          SizedBox(
            width: 30,
            height: 10,
            child: LinearProgressIndicator(),
          ),
          SizedBox(height: 2),
          SizedBox(
            width: 40,
            height: 8,
            child: LinearProgressIndicator(),
          ),
        ],
      ),
    );
  }
}

// ── Filter row ────────────────────────────────────────────────
class _FilterRow extends StatelessWidget {
  const _FilterRow({required this.filters, required this.selected, required this.onSelected});
  final List<String> filters;
  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) => FilterChip(
          label: Text(filters[i]),
          selected: selected == i,
          onSelected: (_) => onSelected(i),
          showCheckmark: false,
          visualDensity: VisualDensity.compact,
        ),
      ),
    );
  }
}

// ── Sort bar ──────────────────────────────────────────────────
class _SortBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              const Text(
                'Sắp xếp:',
                style: TextStyle(color: AppColors.textMuted, fontSize: 12),
              ),
              const SizedBox(width: 8),
              _SortChip(label: 'Ngày tạo', active: true),
              const SizedBox(width: 6),
              _SortChip(label: 'Username', active: false),
              const SizedBox(width: 6),
              _SortChip(label: 'Hoạt động', active: false),
              const SizedBox(width: 12),
              GestureDetector(
                onTap: () {},
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.sort_rounded, color: AppColors.textMuted, size: 14),
                    SizedBox(width: 3),
                    Text(
                      'Giảm dần',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SortChip extends StatelessWidget {
  const _SortChip({required this.label, required this.active});
  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {},
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? AppColors.blurple.withOpacity(0.15) : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? AppColors.blurple.withOpacity(0.4) : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: active ? AppColors.blurple : AppColors.textMuted,
            fontSize: 11,
            fontWeight: active ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
      ),
    );
  }
}

// ── User list ─────────────────────────────────────────────────
class _UserList extends StatelessWidget {
  final UsersController controller;

  const _UserList({required this.controller});

  @override
  Widget build(BuildContext context) {
    if (controller.isLoading) {
      return Container(
        decoration: BoxDecoration(
          color: AppColors.cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: const SkeletonList(
          itemCount: 10,
          showAvatar: true,
          showTrailing: true,
        ),
      );
    }

    if (controller.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            children: [
              Icon(Icons.error_outline, color: AppColors.danger, size: 48),
              const SizedBox(height: 16),
              Text('Lỗi: ${controller.error}', style: const TextStyle(color: AppColors.textSecondary), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => controller.loadUsers(),
                child: const Text('Thử lại'),
              ),
            ],
          ),
        ),
      );
    }

    if (controller.users.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            children: [
              Icon(Icons.person_search_outlined, color: AppColors.textMuted, size: 48),
              const SizedBox(height: 16),
              const Text('Không tìm thấy người dùng', style: TextStyle(color: AppColors.textSecondary)),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            color: AppColors.cardBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: controller.users.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) => _UserTile(user: controller.users[i], controller: controller),
          ),
        ),
        const SizedBox(height: 16),
        _PaginationRow(current: 1, total: (controller.totalUsers / 20).ceil()),
      ],
    );
  }
}

class _UserTile extends StatelessWidget {
  final AdminUserSummary user;
  final UsersController controller;

  const _UserTile({required this.user, required this.controller});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: CircleAvatar(
        backgroundColor: AppColors.blurple.withOpacity(0.15),
        child: Text(
          user.displayName.isNotEmpty ? user.displayName[0].toUpperCase() : '?',
          style: const TextStyle(color: AppColors.blurple, fontWeight: FontWeight.w600),
        ),
      ),
      title: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.displayName,
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '@${user.userName} • ${user.email}',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (!user.isActive)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.danger.withOpacity(0.15),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text('Bị cấm', style: TextStyle(color: AppColors.danger, fontSize: 10)),
            ),
        ],
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.block_rounded, size: 18, color: AppColors.danger),
            tooltip: 'Cấm người dùng',
            onPressed: user.isActive
                ? () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        backgroundColor: AppColors.cardBg,
                        title: const Text('Xác nhận cấm?', style: TextStyle(color: AppColors.textPrimary)),
                        content: Text('Bạn có chắc muốn cấm người dùng "${user.displayName}" (@${user.userName}) không?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Hủy', style: TextStyle(color: AppColors.textMuted)),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Cấm', style: TextStyle(color: AppColors.danger)),
                          ),
                        ],
                      ),
                    );

                    if (confirm == true) {
                      await controller.banUser(user.userId, 'Banned from admin panel');
                      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Đã cấm người dùng'), backgroundColor: AppColors.success),
                      );
                    }
                  }
                : null,
          ),
          IconButton(
            icon: const Icon(Icons.check_circle_outline_rounded, size: 18, color: AppColors.success),
            tooltip: 'Bỏ cấm người dùng',
            onPressed: !user.isActive
                ? () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        backgroundColor: AppColors.cardBg,
                        title: const Text('Bỏ cấm?', style: TextStyle(color: AppColors.textPrimary)),
                        content: Text('Bạn có chắc muốn bỏ cấm cho người dùng "${user.displayName}" không?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Hủy', style: TextStyle(color: AppColors.textMuted)),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Bỏ cấm', style: TextStyle(color: AppColors.success)),
                          ),
                        ],
                      ),
                    );

                    if (confirm == true) {
                      await controller.enableUser(user.userId);
                      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Đã bỏ cấm người dùng'), backgroundColor: AppColors.success),
                      );
                    }
                  }
                : null,
          ),
        ],
      ),
    );
  }
}

// ── Pagination ────────────────────────────────────────────────
class _PaginationRow extends StatelessWidget {
  final int current;
  final int total;

  const _PaginationRow({required this.current, required this.total});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Trang $current / $total',
          style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
        Row(
          children: [
            _PageBtn(icon: Icons.chevron_left_rounded, enabled: current > 1),
            const SizedBox(width: 8),
            _PageNumber(number: current, active: true),
            const SizedBox(width: 4),
            _PageNumber(number: current + 1, active: false),
            const SizedBox(width: 4),
            _PageNumber(number: current + 2, active: false),
            const SizedBox(width: 8),
            _PageBtn(icon: Icons.chevron_right_rounded, enabled: current < total),
          ],
        ),
      ],
    );
  }
}

class _PageNumber extends StatelessWidget {
  const _PageNumber({required this.number, required this.active});
  final int number;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 30,
      height: 30,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: active ? AppColors.blurple.withOpacity(0.15) : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: active ? AppColors.blurple.withOpacity(0.4) : Colors.transparent,
        ),
      ),
      child: Text(
        '$number',
        style: TextStyle(
          color: active ? AppColors.blurple : AppColors.textMuted,
          fontWeight: active ? FontWeight.w700 : FontWeight.w400,
          fontSize: 13,
        ),
      ),
    );
  }
}

class _PageBtn extends StatelessWidget {
  const _PageBtn({required this.icon, required this.enabled});
  final IconData icon;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.border),
      ),
      child: Icon(
        icon,
        color: enabled ? AppColors.textSecondary : AppColors.textMuted.withOpacity(0.4),
        size: 18,
      ),
    );
  }
}

// ── Data classes ──────────────────────────────────────────────
class _QuickStat {
  const _QuickStat({required this.label, required this.value, required this.color, required this.icon});
  final String label;
  final String value;
  final Color color;
  final IconData icon;
}

class _ExportButton extends StatelessWidget {
  final VoidCallback? onPressed;

  const _ExportButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: const Icon(Icons.download_rounded, size: 16, color: AppColors.textSecondary),
      label: const Text('Xuất', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: AppColors.border),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}
