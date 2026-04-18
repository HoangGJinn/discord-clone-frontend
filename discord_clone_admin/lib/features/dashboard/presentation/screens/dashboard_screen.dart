import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/features/dashboard/presentation/controllers/dashboard_controller.dart';
import 'package:discord_clone_admin/shared/widgets/placeholder_chart.dart';
import 'package:discord_clone_admin/shared/widgets/section_header.dart';
import 'package:discord_clone_admin/shared/widgets/stat_card.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final DashboardController _controller;

  @override
  void initState() {
    super.initState();
    _controller = DashboardController();
    _loadStats();
  }

  Future<void> _loadStats() async {
    await _controller.loadStats();
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadStats,
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
                      _StatGrid(controller: _controller),
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
                      _ChartsSection(controller: _controller),
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
  final DashboardController controller;

  const _StatGrid({required this.controller});

  @override
  Widget build(BuildContext context) {
    if (controller.isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (controller.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Text('Lỗi: ${controller.error}', style: const TextStyle(color: AppColors.danger)),
              const SizedBox(height: 10),
              ElevatedButton(
                onPressed: () => controller.loadStats(),
                child: const Text('Thử lại'),
              ),
            ],
          ),
        ),
      );
    }

    final stats = controller.stats;

    if (stats == null) {
      return const Center(child: Text('Không có dữ liệu'));
    }

    final cards = [
      _StatData(
        label: 'TỔNG NGƯỜI DÙNG',
        value: stats.totalUsers.toString(),
        icon: Icons.people_alt_rounded,
        color: AppColors.blurple,
        trend: StatTrend.up,
        trendLabel: '+12%',
      ),
      _StatData(
        label: 'TỔNG SERVERS',
        value: stats.totalServers.toString(),
        icon: Icons.dns_rounded,
        color: AppColors.info,
        trend: StatTrend.up,
        trendLabel: '+8%',
      ),
      _StatData(
        label: 'TIN NHẮN HÔM NAY',
        value: stats.totalMessages.toString(),
        icon: Icons.chat_bubble_rounded,
        color: AppColors.success,
        trend: StatTrend.neutral,
        trendLabel: '~',
      ),
      _StatData(
        label: 'DOANH THU',
        value: _formatCurrency(stats.totalRevenue),
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

  String _formatCurrency(int amount) {
    if (amount >= 1000000) {
      return '${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '${(amount / 1000).toStringAsFixed(1)}K';
    }
    return amount.toString();
  }
}

// ── Charts section ─────────────────────────────────────────────
class _ChartsSection extends StatelessWidget {
  final DashboardController controller;
  const _ChartsSection({required this.controller});

  @override
  Widget build(BuildContext context) {
    if (controller.isLoading) {
      return const SizedBox(height: 200, child: Center(child: CircularProgressIndicator()));
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildUserGrowthChart(),
        const SizedBox(height: 24),
        const Text(
          'Top Servers theo lượng thành viên',
          style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 14),
        _buildTopServersList(),
      ],
    );
  }

  Widget _buildUserGrowthChart() {
    final spots = <FlSpot>[];
    int index = 0;
    for (var data in controller.userGrowth) {
      final newUsers = (data['newUsers'] as num?)?.toDouble() ?? 0.0;
      spots.add(FlSpot(index.toDouble(), newUsers));
      index++;
    }

    if (spots.isEmpty) {
      return const PlaceholderChart(height: 200, label: 'Chưa có biểu đồ Tăng trưởng User', accentColor: AppColors.blurple);
    }

    return Container(
      height: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: LineChart(
        LineChartData(
          gridData: FlGridData(
            show: true, 
            drawVerticalLine: false, 
            getDrawingHorizontalLine: (value) => FlLine(color: AppColors.divider, strokeWidth: 1),
          ),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40, getTitlesWidget: (value, meta) => Text(value.toInt().toString(), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)))),
            bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          borderData: FlBorderData(show: false),
          minX: 0,
          maxX: (spots.length - 1).toDouble() > 0 ? (spots.length - 1).toDouble() : 1,
          minY: 0,
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              color: AppColors.blurple,
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: FlDotData(show: true),
              belowBarData: BarAreaData(
                show: true,
                color: AppColors.blurple.withOpacity(0.2),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopServersList() {
    final servers = controller.topServers;
    if (servers.isEmpty) {
      return const Center(child: Text('Chưa có dữ liệu Top Servers', style: TextStyle(color: AppColors.textMuted)));
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
        itemCount: servers.length,
        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
        itemBuilder: (_, i) {
          final server = servers[i];
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: AppColors.blurple.withOpacity(0.2),
              backgroundImage: server['iconUrl'] != null ? NetworkImage(server['iconUrl']) : null,
              child: server['iconUrl'] == null ? const Icon(Icons.dns, color: AppColors.blurple) : null,
            ),
            title: Text(server['name'] ?? 'Unknown', style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
            subtitle: Text('Owner: ${server['ownerName']} • Channels: ${server['channelCount']}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.people_alt_rounded, size: 14, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text('${server['memberCount']}', style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 12)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Recent activity ────────────────────────────────────────────
class _RecentActivityList extends StatelessWidget {
  const _RecentActivityList();

  static const _items = [
    _ActivityItem(icon: Icons.person_add_rounded, color: AppColors.success, title: 'User mới đăng ký', time: '2 phút trước'),
    _ActivityItem(icon: Icons.dns_rounded, color: AppColors.info, title: 'Server "Gaming Hub" được t��o', time: '15 phút trước'),
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
