import 'package:discord_clone_admin/core/theme/app_colors.dart';
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
  late TabController _tabController;
  final _searchController = TextEditingController();
  int _selectedFilter = 0;

  static const _filters = ['Tất cả', 'Đang hoạt động', 'Không hoạt động'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _filters.length, vsync: this);
    _tabController.addListener(() => setState(() => _selectedFilter = _tabController.index));
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
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.cardBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const SkeletonList(itemCount: 8, showAvatar: true, showTrailing: true),
                    ),
                    const SizedBox(height: 16),
                    _PaginationRow(),
                  ],
                ),
              ),
            ),
          ],
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
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text('Hiển thị 1–10 / – kết quả', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
        Row(
          children: [
            _PageBtn(icon: Icons.chevron_left_rounded, onTap: null),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.blurple.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text('1', style: TextStyle(color: AppColors.blurple, fontWeight: FontWeight.w700, fontSize: 13)),
            ),
            const SizedBox(width: 8),
            _PageBtn(icon: Icons.chevron_right_rounded, onTap: () {}),
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
        child: Icon(icon, color: onTap != null ? AppColors.textSecondary : AppColors.textMuted, size: 18),
      ),
    );
  }
}
