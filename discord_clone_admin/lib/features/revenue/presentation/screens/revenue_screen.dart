import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/features/revenue/presentation/controllers/revenue_controller.dart';
import 'package:discord_clone_admin/shared/widgets/placeholder_chart.dart';
import 'package:discord_clone_admin/shared/widgets/section_header.dart';
import 'package:discord_clone_admin/shared/widgets/skeleton_list.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class RevenueScreen extends StatefulWidget {
  const RevenueScreen({super.key});

  @override
  State<RevenueScreen> createState() => _RevenueScreenState();
}

class _RevenueScreenState extends State<RevenueScreen> with SingleTickerProviderStateMixin {
  late final RevenueController _controller;
  late TabController _tabController;
  int _periodIndex = 1; // 0=Today, 1=Weekly, 2=Monthly

  static const _periods = ['Hôm nay', 'Tuần này', 'Tháng này'];

  @override
  void initState() {
    super.initState();
    _controller = RevenueController();
    _loadData();
    _tabController = TabController(length: _periods.length, vsync: this, initialIndex: _periodIndex);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging && _periodIndex != _tabController.index) {
        setState(() => _periodIndex = _tabController.index);
        _loadData();
      }
    });
  }

  void _loadData() {
    _controller.loadRevenueData(periodIndex: _periodIndex).then((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => _loadData(),
          child: CustomScrollView(
            slivers: [
              // ── Header ─────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                  child: SectionHeader(
                    title: 'Doanh Thu',
                    subtitle: 'Theo dõi doanh thu từ Nitro',
                    action: _ExportBtn(),
                  ),
                ),
              ),
              // ── Period tabs ─────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: _PeriodTabBar(controller: _tabController, periods: _periods),
                ),
              ),
              // ── Summary cards ──────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  child: _controller.isLoading 
                    ? const Center(child: CircularProgressIndicator()) 
                    : _RevenueSummaryCards(stats: _controller.stats),
                ),
              ),
              // ── Revenue chart ──────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader(title: 'Biểu đồ doanh thu'),
                      const SizedBox(height: 12),
                      const PlaceholderChart(
                        height: 210,
                        label: 'Doanh thu theo kỳ chọn',
                        accentColor: AppColors.gold,
                      ),
                    ],
                  ),
                ),
              ),
              // ── Order status ───────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  child: _controller.isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : _OrderStatusRow(stats: _controller.stats),
                ),
              ),
              // ── Recent transactions ────────────────────────
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader(
                        title: 'Giao dịch gần đây',
                        subtitle: 'Nitro orders mới nhất',
                      ),
                      const SizedBox(height: 12),
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.cardBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: _controller.isLoading
                            ? const SkeletonList(itemCount: 8, showAvatar: false, showTrailing: true)
                            : ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _controller.orders.length,
                                separatorBuilder: (_, __) => const Divider(height: 1),
                                itemBuilder: (_, i) => _OrderTile(order: _controller.orders[i]),
                              ),
                      ),
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

// ── Period tab bar ────────────────────────────────────────────
class _PeriodTabBar extends StatelessWidget {
  const _PeriodTabBar({required this.controller, required this.periods});
  final TabController controller;
  final List<String> periods;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: TabBar(
        controller: controller,
        indicatorSize: TabBarIndicatorSize.tab,
        indicator: BoxDecoration(
          color: AppColors.cardBg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.blurple.withOpacity(0.3)),
        ),
        dividerHeight: 0,
        labelColor: AppColors.textPrimary,
        unselectedLabelColor: AppColors.textMuted,
        labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        unselectedLabelStyle: const TextStyle(fontSize: 13),
        padding: const EdgeInsets.all(3),
        tabs: periods.map((p) => Tab(text: p, height: 34)).toList(),
      ),
    );
  }
}

// ── Summary cards ─────────────────────────────────────────────
class _RevenueSummaryCards extends StatelessWidget {
  final RevenueStats? stats;
  const _RevenueSummaryCards({this.stats});

  @override
  Widget build(BuildContext context) {
    if (stats == null) return const SizedBox.shrink();
    
    final formatter = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');
    
    final items = [
      _SummaryItem(label: 'Tổng doanh thu', value: formatter.format(stats!.totalRevenue), unit: 'VNĐ', color: AppColors.gold, icon: Icons.account_balance_wallet_rounded),
      _SummaryItem(label: 'Số đơn hàng', value: '${stats!.totalOrders}', unit: 'đơn', color: AppColors.blurple, icon: Icons.receipt_long_rounded),
      _SummaryItem(label: 'Thành công', value: '${stats!.successRate}', unit: '%', color: AppColors.success, icon: Icons.check_circle_rounded),
    ];

    return Row(
      children: items
          .map((item) => Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: item == items.last ? 0 : 10),
                  child: _SummaryCard(item: item),
                ),
              ))
          .toList(),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.item});
  final _SummaryItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: item.color.withOpacity(0.13),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(item.icon, color: item.color, size: 17),
          ),
          const SizedBox(height: 10),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              item.value,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${item.unit} · ${item.label}',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

// ── Order status donut placeholder ───────────────────────────
class _OrderStatusRow extends StatelessWidget {
  final RevenueStats? stats;
  const _OrderStatusRow({this.stats});

  @override
  Widget build(BuildContext context) {
    if (stats == null) return const SizedBox.shrink();

    final statuses = [
      _StatusChip(label: 'Thành công', color: AppColors.success, count: '${stats!.successCount}'),
      _StatusChip(label: 'Đang xử lý', color: AppColors.warning, count: '${stats!.pendingCount}'),
      _StatusChip(label: 'Thất bại', color: AppColors.danger, count: '${stats!.failedCount}'),
    ];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: const [
              Icon(Icons.pie_chart_rounded, color: AppColors.gold, size: 22),
              SizedBox(width: 10),
              Text(
                'Trạng thái đơn hàng',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Status badges - equal width columns
          Row(
            children: statuses
                .map(
                  (s) => Expanded(
                    child: _StatusBadge(chip: s),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.chip});
  final _StatusChip chip;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          chip.count,
          style: TextStyle(color: chip.color, fontWeight: FontWeight.w800, fontSize: 16),
        ),
        const SizedBox(height: 2),
        Text(chip.label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
      ],
    );
  }
}

// ── Data classes ──────────────────────────────────────────────
class _SummaryItem {
  const _SummaryItem({required this.label, required this.value, required this.unit, required this.color, required this.icon});
  final String label;
  final String value;
  final String unit;
  final Color color;
  final IconData icon;
}

class _StatusChip {
  const _StatusChip({required this.label, required this.color, required this.count});
  final String label;
  final Color color;
  final String count;
}

class _OrderTile extends StatelessWidget {
  final RevenueOrder order;

  const _OrderTile({required this.order});

  @override
  Widget build(BuildContext context) {
    // Map status to colors
    Color statusColor;
    switch (order.status) {
      case 'SUCCESS':
        statusColor = AppColors.success;
        break;
      case 'PENDING':
        statusColor = AppColors.warning;
        break;
      case 'FAILED':
        statusColor = AppColors.danger;
        break;
      default:
        statusColor = AppColors.textMuted;
    }

    final formatter = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.receipt_long_rounded, color: AppColors.blurple, size: 20),
      ),
      title: Row(
        children: [
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.orderId,
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
                ),
                Text(
                  order.user,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.type,
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                ),
                Text(
                  order.time,
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  formatter.format(order.amount),
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
                ),
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    order.status,
                    style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ExportBtn extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () {},
      icon: const Icon(Icons.download_rounded, size: 16, color: AppColors.textSecondary),
      label: const Text('Xuất báo cáo', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: AppColors.border),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}
