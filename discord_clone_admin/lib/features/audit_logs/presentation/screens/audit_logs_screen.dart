import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/features/audit_logs/presentation/controllers/audit_logs_controller.dart';
import 'package:discord_clone_admin/shared/widgets/admin_search_bar.dart';
import 'package:discord_clone_admin/shared/widgets/section_header.dart';
import 'package:flutter/material.dart';

class AuditLogsScreen extends StatefulWidget {
  const AuditLogsScreen({super.key});

  @override
  State<AuditLogsScreen> createState() => _AuditLogsScreenState();
}

class _AuditLogsScreenState extends State<AuditLogsScreen> {
  late final AuditLogsController _controller;
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  int _selectedAction = 0;

  static const _actionTypes = [
    _ActionType(label: 'Tất cả', icon: Icons.list_rounded, color: AppColors.textMuted),
    _ActionType(label: 'User', icon: Icons.person_rounded, color: AppColors.blurple),
    _ActionType(label: 'Server', icon: Icons.dns_rounded, color: AppColors.info),
    _ActionType(label: 'Payment', icon: Icons.payment_rounded, color: AppColors.gold),
    _ActionType(label: 'System', icon: Icons.settings_rounded, color: AppColors.warning),
    _ActionType(label: 'Danger', icon: Icons.warning_rounded, color: AppColors.danger),
  ];

  @override
  void initState() {
    super.initState();
    _controller = AuditLogsController();
    _loadLogs();
    _searchController.addListener(_onSearchChanged);
    _scrollController.addListener(_onScroll);
  }

  void _onSearchChanged() {
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted && _searchController.text == _searchController.value.text) {
        _loadLogs();
      }
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      _controller.loadMore().then((_) {
        if (mounted) setState(() {});
      });
    }
  }

  void _loadLogs() {
    _controller.loadLogs(
      search: _searchController.text,
      filterType: _selectedAction,
    ).then((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => _loadLogs(),
          child: CustomScrollView(
            controller: _scrollController,
            slivers: [
              // ── Header ─────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                  child: SectionHeader(
                    title: 'Audit Logs',
                    subtitle: 'Lịch sử hành động của admin/hệ thống',
                    action: _DateFilterBtn(onDateSelected: (range) {
                      // Future: filter by date range
                    }),
                  ),
                ),
              ),
              // ── Search + action filter ─────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AdminSearchBar(
                        controller: _searchController,
                        hintText: 'Tìm kiếm theo hành động hoặc actor...',
                      ),
                      const SizedBox(height: 12),
                      // Action type chips
                      SizedBox(
                        height: 36,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _actionTypes.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (_, i) => _ActionChip(
                            type: _actionTypes[i],
                            selected: _selectedAction == i,
                            onTap: () {
                              setState(() => _selectedAction = i);
                              _loadLogs();
                            },
                          ),
                        ),
                      ),
                      const Divider(height: 20),
                      // Log count indicator
                      Row(
                        children: [
                          const Icon(Icons.history_rounded, color: AppColors.textMuted, size: 14),
                          const SizedBox(width: 6),
                          Text(
                            '${_controller.totalLogs} entries tổng cộng',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                          ),
                          const Spacer(),
                          InkWell(
                            onTap: _loadLogs,
                            borderRadius: BorderRadius.circular(4),
                            child: Row(
                              children: const [
                                Icon(Icons.refresh_rounded, color: AppColors.blurple, size: 14),
                                SizedBox(width: 4),
                                Text(
                                  'Làm mới',
                                  style: TextStyle(color: AppColors.blurple, fontSize: 12, fontWeight: FontWeight.w500),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
              // ── Log list ───────────────────────────────────
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                sliver: SliverToBoxAdapter(
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.cardBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: _controller.isLoading
                        ? const Padding(
                            padding: EdgeInsets.all(40),
                            child: Center(child: CircularProgressIndicator()),
                          )
                        : _controller.logs.isEmpty
                            ? const Padding(
                                padding: EdgeInsets.all(40),
                                child: Center(child: Text('Không tìm thấy logs', style: TextStyle(color: AppColors.textMuted))),
                              )
                            : ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _controller.logs.length,
                                separatorBuilder: (_, __) => const Divider(height: 1),
                                itemBuilder: (_, i) => _LogTile(
                                  entry: _controller.logs[i],
                                  typeInfo: _actionTypes[
                                      _controller.logs[i].type < _actionTypes.length ? _controller.logs[i].type : 0],
                                ),
                              ),
                  ),
                ),
              ),
              // ── Load more indicator ────────────────────────
              if (_controller.hasMore && !_controller.isLoading)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  ),
                ),
              // ── Error display ──────────────────────────────
              if (_controller.error != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
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
              // Bottom padding
              const SliverToBoxAdapter(child: SizedBox(height: 16)),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Log tile ──────────────────────────────────────────────────
class _LogTile extends StatelessWidget {
  const _LogTile({required this.entry, required this.typeInfo});
  final AuditLogItem entry;
  final _ActionType typeInfo;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Action type icon
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: typeInfo.color.withOpacity(0.13),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(typeInfo.icon, color: typeInfo.color, size: 17),
          ),
          const SizedBox(width: 12),
          // Action details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        entry.action,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: typeInfo.color.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        typeInfo.label,
                        style: TextStyle(color: typeInfo.color, fontSize: 10, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                RichText(
                  text: TextSpan(
                    style: const TextStyle(fontSize: 12),
                    children: [
                      const TextSpan(text: 'by ', style: TextStyle(color: AppColors.textMuted)),
                      TextSpan(
                        text: entry.actor,
                        style: const TextStyle(color: AppColors.blurple, fontWeight: FontWeight.w600),
                      ),
                      const TextSpan(text: ' → ', style: TextStyle(color: AppColors.textMuted)),
                      TextSpan(
                        text: entry.target,
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                if (entry.ipAddress != null && entry.ipAddress!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    'IP: ${entry.ipAddress}',
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Time
          Text(
            entry.time,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

// ── Action chip ───────────────────────────────────────────────
class _ActionChip extends StatelessWidget {
  const _ActionChip({required this.type, required this.selected, required this.onTap});
  final _ActionType type;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? type.color.withOpacity(0.15) : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? type.color.withOpacity(0.4) : AppColors.border,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(type.icon, color: selected ? type.color : AppColors.textMuted, size: 13),
            const SizedBox(width: 5),
            Text(
              type.label,
              style: TextStyle(
                color: selected ? type.color : AppColors.textMuted,
                fontSize: 12,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Date filter button ────────────────────────────────────────
class _DateFilterBtn extends StatelessWidget {
  final Function(DateTimeRange?)? onDateSelected;

  const _DateFilterBtn({this.onDateSelected});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () async {
        final range = await showDateRangePicker(
          context: context,
          firstDate: DateTime(2024),
          lastDate: DateTime.now(),
          builder: (context, child) {
            return Theme(
              data: Theme.of(context).copyWith(
                colorScheme: const ColorScheme.dark(
                  primary: AppColors.blurple,
                  surface: AppColors.cardBg,
                ),
              ),
              child: child!,
            );
          },
        );
        if (range != null) {
          onDateSelected?.call(range);
        }
      },
      icon: const Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.textSecondary),
      label: const Text('Lọc ngày', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: AppColors.border),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}

// ── Data classes ──────────────────────────────────────────────
class _ActionType {
  const _ActionType({required this.label, required this.icon, required this.color});
  final String label;
  final IconData icon;
  final Color color;
}
