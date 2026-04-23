import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/features/moderation/presentation/controllers/blacklist_controller.dart';
import 'package:discord_clone_admin/shared/widgets/section_header.dart';
import 'package:flutter/material.dart';

class BlacklistScreen extends StatefulWidget {
  const BlacklistScreen({super.key});

  @override
  State<BlacklistScreen> createState() => _BlacklistScreenState();
}

class _BlacklistScreenState extends State<BlacklistScreen> {
  late final BlacklistController _controller;
  final _keywordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _controller = BlacklistController();
    _controller.addListener(_onControllerUpdate);
    _controller.loadBlacklist();
  }

  @override
  void dispose() {
    _controller.removeListener(_onControllerUpdate);
    _keywordController.dispose();
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
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
              child: SectionHeader(
                title: 'Blacklist từ khóa',
                subtitle: 'Các từ khóa trong danh sách này sẽ tự động bị chặn',
                action: IconButton(
                  icon: const Icon(Icons.add_rounded, color: AppColors.blurple, size: 28),
                  onPressed: _showAddDialog,
                  tooltip: 'Thêm từ khóa',
                ),
              ),
            ),
            Expanded(child: _buildBody()),
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
              onPressed: () => _controller.loadBlacklist(),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      );
    }

    if (_controller.keywords.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.block_outlined, color: AppColors.textMuted, size: 64),
            SizedBox(height: 16),
            Text('Danh sách blacklist trống', style: TextStyle(color: AppColors.textSecondary)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: _controller.keywords.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) => _BlacklistTile(keyword: _controller.keywords[i], controller: _controller),
    );
  }

  Future<void> _showAddDialog() async {
    await showDialog(
      context: context,
      builder: (ctx) => _AddKeywordDialog(controller: _controller, keywordController: _keywordController),
    );
  }
}

class _BlacklistTile extends StatelessWidget {
  final BlacklistKeyword keyword;
  final BlacklistController controller;

  const _BlacklistTile({required this.keyword, required this.controller});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.danger.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.block_rounded, color: AppColors.danger, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  keyword.keyword,
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15),
                ),
                const SizedBox(height: 4),
                Text(
                  'Thêm bởi @${keyword.createdByAdminName} • ${_timeAgo(keyword.createdAt)}',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger, size: 18),
            onPressed: () async {
              await controller.removeKeyword(keyword.id);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã xóa từ khóa'), backgroundColor: AppColors.success),
                );
              }
            },
          ),
        ],
      ),
    );
  }

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inDays > 0) return '${diff.inDays} ngày trước';
    if (diff.inHours > 0) return '${diff.inHours} giờ trước';
    return '${diff.inMinutes} phút trước';
  }
}

class _AddKeywordDialog extends StatefulWidget {
  final BlacklistController controller;
  final TextEditingController keywordController;

  const _AddKeywordDialog({required this.controller, required this.keywordController});

  @override
  State<_AddKeywordDialog> createState() => _AddKeywordDialogState();
}

class _AddKeywordDialogState extends State<_AddKeywordDialog> {
  late final TextEditingController _controller;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _controller = widget.keywordController..clear();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.cardBg,
      title: const Text('Thêm từ khóa mới', style: TextStyle(color: AppColors.textPrimary)),
      content: TextField(
        controller: _controller,
        decoration: InputDecoration(
          hintText: 'Nhập từ khóa cần chặn...',
          hintStyle: const TextStyle(color: AppColors.textMuted),
          filled: true,
          fillColor: AppColors.surface,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        style: const TextStyle(color: AppColors.textPrimary),
        autofocus: true,
        onSubmitted: (_) => _submit(),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: const Text('Hủy', style: TextStyle(color: AppColors.textSecondary)),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _submit,
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.blurple),
          child: _isLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text('Thêm', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }

  Future<void> _submit() async {
    final keyword = _controller.text.trim();
    if (keyword.isEmpty) return;

    setState(() => _isLoading = true);

    try {
      await widget.controller.addKeyword(keyword);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã thêm từ khóa vào blacklist'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi: ${e.toString()}'), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
