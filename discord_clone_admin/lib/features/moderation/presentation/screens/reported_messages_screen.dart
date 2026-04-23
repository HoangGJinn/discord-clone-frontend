import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/features/moderation/presentation/controllers/moderation_controller.dart';
import 'package:discord_clone_admin/shared/widgets/admin_search_bar.dart';
import 'package:discord_clone_admin/shared/widgets/section_header.dart';
import 'package:flutter/material.dart';

class ReportedMessagesScreen extends StatefulWidget {
  const ReportedMessagesScreen({super.key});

  @override
  State<ReportedMessagesScreen> createState() => _ReportedMessagesScreenState();
}

class _ReportedMessagesScreenState extends State<ReportedMessagesScreen> {
  late final ModerationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = ModerationController();
    _controller.addListener(_onControllerUpdate);
    _controller.loadReports();
  }

  @override
  void dispose() {
    _controller.removeListener(_onControllerUpdate);
    super.dispose();
  }

  void _onControllerUpdate() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 20, 16, 12),
              child: SectionHeader(
                title: 'Báo cáo vi phạm',
                subtitle: 'Quản lý các tin nhắn bị người dùng báo cáo',
              ),
            ),
            // Filter tabs
            _FilterTabs(
              selected: _controller.selectedFilter,
              onChanged: (filter) => _controller.setFilter(filter),
            ),
            const SizedBox(height: 12),
            // Content
            Expanded(
              child: _buildBody(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_controller.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_controller.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Lỗi: ${_controller.error}', style: const TextStyle(color: AppColors.danger)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => _controller.loadReports(),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      );
    }

    if (_controller.reports.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, color: AppColors.success, size: 64),
            SizedBox(height: 16),
            Text('Không có báo cáo nào', style: TextStyle(color: AppColors.textSecondary)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: _controller.reports.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _ReportCard(report: _controller.reports[i], controller: _controller),
    );
  }
}

class _FilterTabs extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onChanged;

  const _FilterTabs({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final tabs = ['PENDING', 'REVIEWED', 'RESOLVED'];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: tabs
            .map((t) => Expanded(
                  child: GestureDetector(
                    onTap: () => onChanged(t),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: selected == t ? AppColors.blurple : Colors.transparent,
                            width: 2,
                          ),
                        ),
                      ),
                      child: Text(
                        t,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: selected == t ? AppColors.blurple : AppColors.textMuted,
                          fontWeight: selected == t ? FontWeight.w700 : FontWeight.w500,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                ))
            .toList(),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final ReportedMessageItem report;
  final ModerationController controller;

  const _ReportCard({required this.report, required this.controller});

  @override
  Widget build(BuildContext context) {
    final reasonColors = {
      'SPAM': AppColors.info,
      'HARASSMENT': AppColors.warning,
      'HATE_SPEECH': AppColors.danger,
      'OTHER': AppColors.textMuted,
    };

    final reasonColor = reasonColors[report.reason] ?? AppColors.textMuted;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: reasonColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    report.reason,
                    style: TextStyle(color: reasonColor, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Báo cáo bởi @${report.reportedByUserName}',
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  _timeAgo(report.createdAt),
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),
          // Message content
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              report.messageContent,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            ),
          ),
          if (report.description != null && report.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  const Icon(Icons.description_outlined, size: 14, color: AppColors.textMuted),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      report.description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontStyle: FontStyle.italic),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          // Actions
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: report.status == 'PENDING'
                        ? () async {
                            await _showActionSheet(context, report);
                          }
                        : null,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.blurple),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    child: const Text('Xử lý', style: TextStyle(fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: report.status == 'PENDING'
                        ? () async {
                            await controller.deleteReport(report.reportId);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Đã xóa báo cáo'), backgroundColor: AppColors.success),
                              );
                            }
                          }
                        : null,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.danger),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    child: const Text('Xóa', style: TextStyle(fontSize: 12, color: AppColors.danger)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showActionSheet(BuildContext context, ReportedMessageItem report) async {
    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ActionSheet(report: report, controller: controller),
    );
  }

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    return '${diff.inDays} ngày trước';
  }
}

class _ActionSheet extends StatelessWidget {
  final ReportedMessageItem report;
  final ModerationController controller;

  const _ActionSheet({required this.report, required this.controller});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Chọn hành động', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 16),
          _ActionTile(
            icon: Icons.delete_outline_rounded,
            label: 'Xóa tin nhắn',
            color: AppColors.danger,
            onTap: () async {
              Navigator.pop(context);
              await controller.resolveReport(report.reportId, 'DELETE_MESSAGE');
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã xóa tin nhắn và đánh dấu báo cáo'), backgroundColor: AppColors.success),
                );
              }
            },
          ),
          _ActionTile(
            icon: Icons.warning_amber_outlined,
            label: 'Cảnh cáo người dùng',
            color: AppColors.warning,
            onTap: () async {
              Navigator.pop(context);
              await controller.resolveReport(report.reportId, 'WARN_USER');
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã gửi cảnh cáo và đánh dấu báo cáo'), backgroundColor: AppColors.success),
                );
              }
            },
          ),
          _ActionTile(
            icon: Icons.block_rounded,
            label: 'Khóa tài khoản',
            color: AppColors.danger,
            onTap: () async {
              Navigator.pop(context);
              await controller.resolveReport(report.reportId, 'BAN_USER');
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã khóa tài khoản và đánh dấu báo cáo'), backgroundColor: AppColors.success),
                );
              }
            },
          ),
          const Divider(height: 24),
          _ActionTile(
            icon: Icons.close_rounded,
            label: 'Bỏ qua',
            color: AppColors.textMuted,
            onTap: () async {
              Navigator.pop(context);
              await controller.resolveReport(report.reportId, 'DISMISS');
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã bỏ qua báo cáo'), backgroundColor: AppColors.success),
                );
              }
            },
          ),
        ],
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionTile({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color, size: 22),
      title: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
      trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 18),
      onTap: onTap,
      contentPadding: EdgeInsets.zero,
      visualDensity: VisualDensity.compact,
    );
  }
}
