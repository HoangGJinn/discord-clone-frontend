import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/shared/widgets/placeholder_chart.dart';
import 'package:discord_clone_admin/shared/widgets/section_header.dart';
import 'package:discord_clone_admin/shared/widgets/stat_card.dart';
import 'package:flutter/material.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // ── Top greeting bar ──────────────────────────
            SliverToBoxAdapter(
              child: _GreetingBar(),
            ),
            // ── Stat grid ────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionHeader(
                      title: 'Tổng quan',
                      subtitle: 'Thống kê hệ thống theo thời gian thực',
                    ),
                    const SizedBox(height: 14),
                    _StatGrid(),
                  ],
                ),
              ),
            ),
            // ── Charts row ───────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionHeader(
                      title: 'Biểu đồ hoạt động',
                      subtitle: 'Dữ liệu tuần này',
                    ),
                    const SizedBox(height: 14),
                    _ChartsSection(),
                  ],
                ),
              ),
            ),
            // ── Recent activity ───────────────────────────
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionHeader(
                      title: 'Hoạt động gần đây',
                      subtitle: 'Các sự kiện mới nhất trong hệ thống',
                    ),
                    const SizedBox(height: 14),
                    _RecentActivityList(),
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

// ── Greeting bar ──────────────────────────────────────────────
class _GreetingBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final hour = now.hour;
    final greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    final dateStr = '${_weekday(now.weekday)}, ${now.day}/${now.month}/${now.year}';

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.divider)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$greeting 👋',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Text(
                  dateStr,
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // System status pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.success.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.success.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.circle, color: AppColors.success, size: 7),
                SizedBox(width: 5),
                Text(
                  'Online',
                  style: TextStyle(
                    color: AppColors.success,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _weekday(int d) => const ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'][d];
}

// ── Stat grid 2×2 ─────────────────────────────────────────────
class _StatGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final cards = [
      _StatData(
        label: 'TỔNG NGƯỜI DÙNG',
        value: '–',
        icon: Icons.people_alt_rounded,
        color: AppColors.blurple,
        trend: StatTrend.up,
        trendLabel: '+12%',
      ),
      _StatData(
        label: 'TỔNG SERVERS',
        value: '–',
        icon: Icons.dns_rounded,
        color: AppColors.info,
        trend: StatTrend.up,
        trendLabel: '+8%',
      ),
      _StatData(
        label: 'TIN NHẮN HÔM NAY',
        value: '–',
        icon: Icons.chat_bubble_rounded,
        color: AppColors.success,
        trend: StatTrend.neutral,
        trendLabel: '~',
      ),
      _StatData(
        label: 'DOANH THU',
        value: '–',
        icon: Icons.attach_money_rounded,
        color: AppColors.gold,
        trend: StatTrend.up,
        trendLabel: '+5%',
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        mainAxisExtent: 130,
      ),
      itemCount: cards.length,
      itemBuilder: (_, i) {
        final d = cards[i];
        return StatCard(
          label: d.label,
          value: d.value,
          icon: d.icon,
          accentColor: d.color,
          trend: d.trend,
          trendLabel: d.trendLabel,
        );
      },
    );
  }
}

// ── Charts section ─────────────────────────────────────────────
class _ChartsSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        PlaceholderChart(
          height: 200,
          label: 'Biểu đồ người dùng mới theo tuần',
          accentColor: AppColors.blurple,
        ),
        const SizedBox(height: 10),
        Row(
          children: const [
            Expanded(
              child: PlaceholderChart(
                height: 140,
                label: 'Servers',
                accentColor: AppColors.info,
              ),
            ),
            SizedBox(width: 10),
            Expanded(
              child: PlaceholderChart(
                height: 140,
                label: 'Doanh thu',
                accentColor: AppColors.gold,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ── Recent activity ────────────────────────────────────────────
class _RecentActivityList extends StatelessWidget {
  const _RecentActivityList();

  static const _items = [
    _ActivityItem(icon: Icons.person_add_rounded, color: AppColors.success, title: 'User mới đăng ký', time: '2 phút trước'),
    _ActivityItem(icon: Icons.dns_rounded, color: AppColors.info, title: 'Server "Gaming Hub" được tạo', time: '15 phút trước'),
    _ActivityItem(icon: Icons.payment_rounded, color: AppColors.gold, title: 'Giao dịch Nitro thành công', time: '32 phút trước'),
    _ActivityItem(icon: Icons.warning_rounded, color: AppColors.warning, title: 'Báo cáo vi phạm mới', time: '1 giờ trước'),
    _ActivityItem(icon: Icons.block_rounded, color: AppColors.danger, title: 'Tài khoản bị vô hiệu hóa', time: '2 giờ trước'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (_, i) => _ActivityTile(item: _items[i]),
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({required this.item});
  final _ActivityItem item;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: item.color.withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(item.icon, color: item.color, size: 18),
      ),
      title: Text(
        item.title,
        style: const TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w500),
      ),
      trailing: Text(
        item.time,
        style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
      ),
    );
  }
}

// ── Data classes ───────────────────────────────────────────────
class _StatData {
  const _StatData({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.trend,
    this.trendLabel,
  });
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final StatTrend? trend;
  final String? trendLabel;
}

class _ActivityItem {
  const _ActivityItem({required this.icon, required this.color, required this.title, required this.time});
  final IconData icon;
  final Color color;
  final String title;
  final String time;
}
