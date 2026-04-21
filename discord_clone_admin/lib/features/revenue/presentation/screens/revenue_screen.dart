import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/features/revenue/presentation/controllers/revenue_controller.dart';
import 'package:discord_clone_admin/shared/widgets/section_header.dart';
import 'package:discord_clone_admin/shared/widgets/skeleton_list.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class RevenueScreen extends StatefulWidget {
  const RevenueScreen({super.key});

  @override
  State<RevenueScreen> createState() => _RevenueScreenState();
}

class _RevenueScreenState extends State<RevenueScreen> {
  late final RevenueController _controller;
  int _selectedStatusIndex = 0;

  static const _statusFilters = [
    _StatusFilterItem(label: 'Tất cả', value: null, icon: Icons.list_rounded),
    _StatusFilterItem(label: 'Chờ duyệt', value: 'PENDING', icon: Icons.hourglass_empty_rounded),
    _StatusFilterItem(label: 'Thành công', value: 'CONFIRMED', icon: Icons.check_circle_rounded),
    _StatusFilterItem(label: 'Thất bại', value: 'FAILED', icon: Icons.cancel_rounded),
  ];

  @override
  void initState() {
    super.initState();
    _controller = RevenueController();
    _loadData();
  }

  void _loadData() {
    _controller.loadRevenueData(
      statusFilter: _statusFilters[_selectedStatusIndex].value,
    ).then((_) {
      if (mounted) setState(() {});
    });
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
                    title: 'Doanh Thu & Đơn Hàng Nitro',
                    subtitle: 'Quản lý thanh toán VNPay',
                    action: _ExportBtn(),
                  ),
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
              // ── Order status ───────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  child: _controller.isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : _OrderStatusRow(stats: _controller.stats),
                ),
              ),
              // ── Status filter chips ─────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: SizedBox(
                    height: 36,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _statusFilters.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (_, i) => _FilterChip(
                        item: _statusFilters[i],
                        selected: _selectedStatusIndex == i,
                        onTap: () {
                          setState(() => _selectedStatusIndex = i);
                          _loadData();
                        },
                      ),
                    ),
                  ),
                ),
              ),
              // ── Recent transactions ────────────────────────
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Expanded(
                            child: SectionHeader(
                              title: 'Danh sách đơn hàng',
                              subtitle: 'Nitro orders',
                            ),
                          ),
                          if (!_controller.isLoading)
                            Text(
                              '${_controller.orders.length} đơn',
                              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                            ),
                        ],
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
                            : _controller.orders.isEmpty
                                ? const Padding(
                                    padding: EdgeInsets.all(40),
                                    child: Center(
                                      child: Text(
                                        'Không có đơn hàng nào',
                                        style: TextStyle(color: AppColors.textMuted),
                                      ),
                                    ),
                                  )
                                : ListView.separated(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    itemCount: _controller.orders.length,
                                    separatorBuilder: (_, __) => const Divider(height: 1),
                                    itemBuilder: (_, i) => _OrderTile(
                                      order: _controller.orders[i],
                                      onApprove: () => _handleApprove(_controller.orders[i]),
                                      onReject: () => _handleReject(_controller.orders[i]),
                                    ),
                                  ),
                      ),
                    ],
                  ),
                ),
              ),
              // ── Error display ──────────────────────────────
              if (_controller.error != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.danger.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.danger.withOpacity(0.3)),
                      ),
                      child: Text(
                        'Lỗi: ${_controller.error}',
                        style: const TextStyle(color: AppColors.danger, fontSize: 13),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleApprove(RevenueOrder order) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardBg,
        title: const Text('Xác nhận duyệt', style: TextStyle(color: AppColors.textPrimary)),
        content: Text(
          'Duyệt đơn hàng ${order.orderId}?\nSố tiền: ${NumberFormat.currency(locale: 'vi_VN', symbol: 'đ').format(order.amount)}',
          style: const TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await _controller.approveOrder(order.txnRef);
              if (mounted) {
                setState(() {});
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(success ? 'Đã duyệt đơn hàng' : 'Lỗi khi duyệt'),
                  backgroundColor: success ? AppColors.success : AppColors.danger,
                ));
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
            child: const Text('Duyệt', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _handleReject(RevenueOrder order) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardBg,
        title: const Text('Xác nhận từ chối', style: TextStyle(color: AppColors.textPrimary)),
        content: Text(
          'Từ chối đơn hàng ${order.orderId}?',
          style: const TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await _controller.rejectOrder(order.txnRef);
              if (mounted) {
                setState(() {});
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(success ? 'Đã từ chối đơn hàng' : 'Lỗi khi từ chối'),
                  backgroundColor: success ? AppColors.warning : AppColors.danger,
                ));
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Từ chối', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// ── Filter chip ───────────────────────────────────────────────
class _StatusFilterItem {
  const _StatusFilterItem({required this.label, required this.value, required this.icon});
  final String label;
  final String? value;
  final IconData icon;
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.item, required this.selected, required this.onTap});
  final _StatusFilterItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = _colorForValue(item.value);
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.15) : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? color.withOpacity(0.4) : AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(item.icon, color: selected ? color : AppColors.textMuted, size: 13),
            const SizedBox(width: 5),
            Text(
              item.label,
              style: TextStyle(
                color: selected ? color : AppColors.textMuted,
                fontSize: 12,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _colorForValue(String? value) {
    switch (value) {
      case 'PENDING': return AppColors.warning;
      case 'CONFIRMED': return AppColors.success;
      case 'FAILED': return AppColors.danger;
      default: return AppColors.blurple;
    }
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

// ── Order status row ─────────────────────────────────────────
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
          const Row(
            children: [
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
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _OrderTile({required this.order, required this.onApprove, required this.onReject});

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    switch (order.status) {
      case 'CONFIRMED':
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
    final isPending = order.status == 'PENDING';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.receipt_long_rounded, color: AppColors.blurple, size: 20),
          ),
          const SizedBox(width: 12),
          // Order info
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.orderId,
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
                ),
                Text(
                  '${order.user} · ${order.type}',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // Amount + status
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  formatter.format(order.amount),
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Container(
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
              ],
            ),
          ),
          // Action buttons for PENDING orders
          if (isPending) ...[
            const SizedBox(width: 8),
            InkWell(
              onTap: onApprove,
              borderRadius: BorderRadius.circular(6),
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.check_rounded, color: AppColors.success, size: 16),
              ),
            ),
            const SizedBox(width: 4),
            InkWell(
              onTap: onReject,
              borderRadius: BorderRadius.circular(6),
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.danger.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.close_rounded, color: AppColors.danger, size: 16),
              ),
            ),
          ],
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
