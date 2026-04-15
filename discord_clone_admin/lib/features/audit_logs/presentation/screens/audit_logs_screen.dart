import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/shared/widgets/admin_search_bar.dart';
import 'package:discord_clone_admin/shared/widgets/section_header.dart';
import 'package:flutter/material.dart';

class AuditLogsScreen extends StatefulWidget {
  const AuditLogsScreen({super.key});

  @override
  State<AuditLogsScreen> createState() => _AuditLogsScreenState();
}

class _AuditLogsScreenState extends State<AuditLogsScreen> {
  final _searchController = TextEditingController();
  int _selectedAction = 0;

  static const _actionTypes = [
    _ActionType(label: 'Tất cả', icon: Icons.list_rounded, color: AppColors.textMuted),
    _ActionType(label: 'User', icon: Icons.person_rounded, color: AppColors.blurple),
    _ActionType(label: 'Server', icon: Icons.dns_rounded, color: AppColors.info),
    _ActionType(label: 'Payment', icon: Icons.payment_rounded, color: AppColors.gold),
    _ActionType(label: 'System', icon: Icons.settings_rounded, color: AppColors.warning),
    _ActionType(label: 'Danger', icon: Icons.warning_rounded, color: AppColors.danger),
  ];

  // Fake placeholder log entries
  static const _fakeLogs = [
    _LogEntry(action: 'USER_BANNED', actor: 'admin', target: 'user#1234', time: '2 phút trước', type: 4),
    _LogEntry(action: 'SERVER_DELETED', actor: 'admin', target: '"Old Server"', time: '15 phút trước', type: 2),
    _LogEntry(action: 'USER_ROLE_CHANGED', actor: 'superadmin', target: 'user#5678', time: '32 phút trước', type: 1),
    _LogEntry(action: 'PAYMENT_APPROVED', actor: 'system', target: 'Order #TXN001', time: '1 giờ trước', type: 3),
    _LogEntry(action: 'USER_CREATED', actor: 'system', target: 'newuser@mail.com', time: '1 giờ trước', type: 1),
    _LogEntry(action: 'CONFIG_UPDATED', actor: 'admin', target: 'spam_threshold=5', time: '2 giờ trước', type: 4),
    _LogEntry(action: 'SERVER_WARNED', actor: 'admin', target: '"Toxic Server"', time: '3 giờ trước', type: 5),
    _LogEntry(action: 'PAYMENT_FAILED', actor: 'system', target: 'Order #TXN002', time: '4 giờ trước', type: 3),
    _LogEntry(action: 'USER_DISABLED', actor: 'admin', target: 'user#9999', time: '5 giờ trước', type: 1),
    _LogEntry(action: 'SERVER_CREATED', actor: 'system', target: '"New Server"', time: '6 giờ trước', type: 2),
  ];

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
                  title: 'Audit Logs',
                  subtitle: 'Lịch sử hành động của admin/hệ thống',
                  action: _DateFilterBtn(),
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
                          onTap: () => setState(() => _selectedAction = i),
                        ),
                      ),
                    ),
                    const Divider(height: 20),
                    // Log count indicator
                    Row(
                      children: const [
                        Icon(Icons.history_rounded, color: AppColors.textMuted, size: 14),
                        SizedBox(width: 6),
                        Text(
                          '– entries tổng cộng',
                          style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                        ),
                        Spacer(),
                        Icon(Icons.refresh_rounded, color: AppColors.textMuted, size: 14),
                        SizedBox(width: 4),
                        Text(
                          'Tự động refresh: 30s',
                          style: TextStyle(color: AppColors.textMuted, fontSize: 12),
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
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              sliver: SliverToBoxAdapter(
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.cardBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _fakeLogs.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) => _LogTile(
                      entry: _fakeLogs[i],
                      typeInfo: _actionTypes[
                          _fakeLogs[i].type < _actionTypes.length ? _fakeLogs[i].type : 0],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Log tile ──────────────────────────────────────────────────
class _LogTile extends StatelessWidget {
  const _LogTile({required this.entry, required this.typeInfo});
  final _LogEntry entry;
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
  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () {},
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

class _LogEntry {
  const _LogEntry({
    required this.action,
    required this.actor,
    required this.target,
    required this.time,
    required this.type,
  });
  final String action;
  final String actor;
  final String target;
  final String time;
  final int type; // index into _actionTypes
}
