import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/features/servers/presentation/controllers/servers_controller.dart';
import 'package:discord_clone_admin/shared/widgets/admin_search_bar.dart';
import 'package:discord_clone_admin/shared/widgets/section_header.dart';
import 'package:discord_clone_admin/shared/widgets/skeleton_list.dart';
import 'package:flutter/material.dart';

class ServersScreen extends StatefulWidget {
  const ServersScreen({super.key});

  @override
  State<ServersScreen> createState() => _ServersScreenState();
}

class _ServersScreenState extends State<ServersScreen> with SingleTickerProviderStateMixin {
  late final ServersController _controller;
  late TabController _tabController;
  final _searchController = TextEditingController();
  int _selectedFilter = 0;

  static const _filters = ['Tất cả', 'Đang hoạt động', 'Không hoạt động'];

  @override
  void initState() {
    super.initState();
    _controller = ServersController();
    _loadServers();
    _tabController = TabController(length: _filters.length, vsync: this);
    _tabController.addListener(() {
      setState(() => _selectedFilter = _tabController.index);
      _loadServers();
    });
    _searchController.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted && _searchController.text == _searchController.value.text) {
        _loadServers();
      }
    });
  }

  Future<void> _loadServers() async {
    String? search = _searchController.text.isNotEmpty ? _searchController.text : null;
    bool? active;
    if (_selectedFilter == 1) active = true;
    if (_selectedFilter == 2) active = false;

    await _controller.loadServers(search: search, active: active);
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadServers,
          child: CustomScrollView(
            slivers: [
              // ── Header ──────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                  child: SectionHeader(
                    title: 'Quản lý Servers',
                    subtitle: 'Xem và quản lý tất cả servers',
                    action: _AddButton(onTap: () {}),
                  ),
                ),
              ),
              // ── Search + Filter ──────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                  child: Column(
                    children: [
                      AdminSearchBar(
                        controller: _searchController,
                        hintText: 'Tìm kiếm server theo tên...',
                      ),
                      const SizedBox(height: 12),
                      _FilterChips(
                        filters: _filters,
                        selected: _selectedFilter,
                        onSelected: (i) {
                          setState(() => _selectedFilter = i);
                          _tabController.animateTo(i);
                        },
                      ),
                      const SizedBox(height: 4),
                      const Divider(height: 16),
                    ],
                  ),
                ),
              ),
              // ── List ────────────────────────────
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    children: [
                      _ServerListHeader(),
                      const SizedBox(height: 8),
                      _ServerList(controller: _controller),
                      const SizedBox(height: 16),
                      _PaginationRow(current: 1, total: (_controller.totalServers / 20).ceil()),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Sub-widgets ────────────────────────────────────────────────
class _AddButton extends StatelessWidget {
  const _AddButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: const Icon(Icons.add_rounded, size: 18),
      label: const Text('Thêm'),
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}

class _FilterChips extends StatelessWidget {
  const _FilterChips({required this.filters, required this.selected, required this.onSelected});
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

class _ServerListHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: const [
        SizedBox(width: 50),
        Expanded(
          flex: 3,
          child: Text('TÊN SERVER', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
        ),
        Expanded(
          child: Text('MEMBERS', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
        ),
        Expanded(
          child: Text('TRẠNG THÁI', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
        ),
        SizedBox(width: 40),
      ],
    );
  }
}

class _PaginationRow extends StatelessWidget {
  final int current;
  final int total;
  
  const _PaginationRow({required this.current, required this.total});

  @override
  Widget build(BuildContext context) {
    if (total == 0) return const SizedBox.shrink();
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('Trang $current / $total', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
        Row(
          children: [
            _PageBtn(icon: Icons.chevron_left_rounded, onTap: current > 1 ? () {} : null),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.blurple.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text('$current', style: const TextStyle(color: AppColors.blurple, fontWeight: FontWeight.w700, fontSize: 13)),
            ),
            const SizedBox(width: 8),
            _PageBtn(icon: Icons.chevron_right_rounded, onTap: current < total ? () {} : null),
          ],
        ),
      ],
    );
  }
}

class _PageBtn extends StatelessWidget {
  const _PageBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.border),
        ),
        child: Icon(icon, color: onTap != null ? AppColors.textSecondary : AppColors.textMuted.withOpacity(0.3), size: 18),
      ),
    );
  }
}

class _ServerList extends StatelessWidget {
  final ServersController controller;

  const _ServerList({required this.controller});

  @override
  Widget build(BuildContext context) {
    if (controller.isLoading) {
      return Container(
        decoration: BoxDecoration(
          color: AppColors.cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: const SkeletonList(itemCount: 8, showAvatar: true, showTrailing: true),
      );
    }
    
    if (controller.error != null) {
      return Center(child: Text('Lỗi: ${controller.error}', style: const TextStyle(color: AppColors.danger)));
    }
    
    if (controller.servers.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Text('Không có server nào', style: TextStyle(color: AppColors.textMuted)),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: controller.servers.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (_, i) => _ServerTile(server: controller.servers[i], controller: controller),
      ),
    );
  }
}

class _ServerTile extends StatelessWidget {
  final AdminServerSummary server;
  final ServersController controller;

  const _ServerTile({required this.server, required this.controller});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.hardEdge,
        child: server.iconUrl.isNotEmpty
            ? Image.network(server.iconUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.dns_rounded, color: AppColors.blurple))
            : const Icon(Icons.dns_rounded, color: AppColors.blurple),
      ),
      title: Row(
        children: [
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  server.name,
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  'Owner: @${server.ownerName}',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Expanded(
            child: Text(
              '${server.memberCount} members',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
          ),
          Expanded(
            child: Container(
              alignment: Alignment.centerLeft,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: server.isBanned 
                      ? AppColors.danger.withOpacity(0.15) 
                      : AppColors.success.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  server.isBanned ? 'Bị cấm' : 'Hoạt động', 
                  style: TextStyle(
                    color: server.isBanned ? AppColors.danger : AppColors.success, 
                    fontSize: 10
                  )
                ),
              ),
            ),
          ),
        ],
      ),
      trailing: PopupMenuButton<String>(
        icon: const Icon(Icons.more_vert_rounded, size: 18, color: AppColors.textSecondary),
        color: AppColors.cardBg,
        onSelected: (value) async {
          if (value == 'delete') {
            final confirm = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                backgroundColor: AppColors.cardBg,
                title: const Text('Xóa Server?', style: TextStyle(color: AppColors.textPrimary)),
                content: Text('Bạn có chắc muốn xóa server "${server.name}" không? Hành động này không thể hoàn tác.', style: const TextStyle(color: AppColors.textSecondary)),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('Hủy', style: TextStyle(color: AppColors.textMuted)),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Xóa', style: TextStyle(color: AppColors.danger)),
                  ),
                ],
              ),
            );
            
            if (confirm == true) {
              await controller.deleteServer(server.serverId);
              if (context.mounted) {
                 ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã xóa server')));
              }
            }
          } else if (value == 'ban') {
            final confirm = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                backgroundColor: AppColors.cardBg,
                title: const Text('Cấm Server?', style: TextStyle(color: AppColors.textPrimary)),
                content: Text('Bạn có chắc muốn cấm server "${server.name}" không?'),
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
              await controller.banServer(server.serverId, "Banned by admin");
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã cấm server'), backgroundColor: AppColors.success));
              }
            }
          } else if (value == 'unban') {
            final confirm = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                backgroundColor: AppColors.cardBg,
                title: const Text('Bỏ cấm Server?', style: TextStyle(color: AppColors.textPrimary)),
                content: Text('Bạn có chắc muốn bỏ cấm cho server "${server.name}" không?'),
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
              await controller.unbanServer(server.serverId);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã bỏ cấm server'), backgroundColor: AppColors.success));
              }
            }
          }
        },
        itemBuilder: (context) => [
          if (!server.isBanned)
            const PopupMenuItem(
              value: 'ban',
              child: Text('Cấm Server', style: TextStyle(color: AppColors.danger, fontSize: 13)),
            )
          else
            const PopupMenuItem(
              value: 'unban',
              child: Text('Bỏ cấm Server', style: TextStyle(color: AppColors.success, fontSize: 13)),
            ),
          const PopupMenuItem(
            value: 'delete',
            child: Text('Xóa Server', style: TextStyle(color: AppColors.danger, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
