import 'package:discord_clone_admin/core/theme/app_colors.dart';
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
  final _searchController = TextEditingController();
  int _selectedFilter = 0;

  static const _filters = ['Tất cả', 'Đang hoạt động', 'Bị cấm'];

  @override
  void dispose() {
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
            // ── Header ─────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                child: SectionHeader(
                  title: 'Quản lý Users',
                  subtitle: 'Xem và quản lý tất cả người dùng',
                  action: _ExportButton(),
                ),
              ),
            ),
            // ── Quick stats ─────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: _UserQuickStats(),
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
                      onSelected: (i) => setState(() => _selectedFilter = i),
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
                child: Column(
                  children: [
                    Container(
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

// ── Quick stats mini row ───────────────────────────────────────
class _UserQuickStats extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final stats = [
      _QuickStat(label: 'Tổng users', value: '–', color: AppColors.blurple, icon: Icons.people_rounded),
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
        // Sort chips row - scrollable
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
              // Sort direction
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

// ── Pagination ────────────────────────────────────────────────
class _PaginationRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          'Hiển thị 1–10 / – kết quả',
          style: TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
        Row(
          children: [
            _PageBtn(icon: Icons.chevron_left_rounded, enabled: false),
            const SizedBox(width: 8),
            _PageNumber(number: 1, active: true),
            const SizedBox(width: 4),
            _PageNumber(number: 2, active: false),
            const SizedBox(width: 4),
            _PageNumber(number: 3, active: false),
            const SizedBox(width: 8),
            _PageBtn(icon: Icons.chevron_right_rounded, enabled: true),
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
  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () {},
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
