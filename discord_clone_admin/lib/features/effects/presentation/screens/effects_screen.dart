import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/features/effects/data/models/profile_effect_model.dart';
import 'package:discord_clone_admin/features/effects/presentation/controllers/effects_controller.dart';
import 'package:discord_clone_admin/features/effects/presentation/screens/effect_form_dialog.dart';
import 'package:discord_clone_admin/shared/widgets/section_header.dart';
import 'package:flutter/material.dart';

class EffectsScreen extends StatefulWidget {
  const EffectsScreen({super.key});

  @override
  State<EffectsScreen> createState() => _EffectsScreenState();
}

class _EffectsScreenState extends State<EffectsScreen> {
  late final EffectsController _controller;

  @override
  void initState() {
    super.initState();
    _controller = EffectsController();
    _loadEffects();
  }

  Future<void> _loadEffects() async {
    await _controller.loadEffects();
    if (mounted) setState(() {});
  }

  void _openFormDialog([ProfileEffectModel? effect]) {
    showDialog(
      context: context,
      builder: (ctx) => EffectFormDialog(
        effect: effect,
        onSave: (newEffect) async {
          if (effect == null) {
            await _controller.createEffect(newEffect);
          } else {
            await _controller.updateEffect(effect.id, newEffect);
          }
          if (mounted) setState(() {});
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadEffects,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
                  child: SectionHeader(
                    title: 'Quản lý Gói Hiệu Ứng',
                    subtitle: 'Danh sách các hiệu ứng trang trí avatar/màn hình',
                    action: ElevatedButton.icon(
                      onPressed: () => _openFormDialog(),
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: const Text('Thêm mới', style: TextStyle(fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.blurple,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: _buildContent(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (_controller.isLoading) {
      return const SliverToBoxAdapter(
        child: Center(
          child: Padding(
            padding: EdgeInsets.all(40),
            child: CircularProgressIndicator(),
          ),
        ),
      );
    }

    if (_controller.error != null) {
      return SliverToBoxAdapter(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(40),
            child: Column(
              children: [
                const Icon(Icons.error_outline, color: AppColors.danger, size: 48),
                const SizedBox(height: 16),
                Text('Lỗi: ${_controller.error}', style: const TextStyle(color: AppColors.textSecondary), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _loadEffects,
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_controller.effects.isEmpty) {
      return const SliverToBoxAdapter(
        child: Center(
          child: Padding(
            padding: EdgeInsets.all(40),
            child: Column(
              children: [
                Icon(Icons.auto_awesome_rounded, color: AppColors.textMuted, size: 48),
                SizedBox(height: 16),
                Text('Chưa có gói hiệu ứng nào', style: TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          ),
        ),
      );
    }

    return SliverGrid(
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 300,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 0.8,
      ),
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final effect = _controller.effects[index];
          return _EffectCard(
            effect: effect,
            onEdit: () => _openFormDialog(effect),
            onToggleStatus: () async {
              await _controller.toggleEffectStatus(effect.id);
              if (mounted) setState(() {});
            },
            onDelete: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppColors.surface,
                  title: const Text('Xác nhận xóa', style: TextStyle(color: AppColors.textPrimary)),
                  content: Text('Bạn có chắc muốn xóa hiệu ứng "${effect.name}" không?', style: const TextStyle(color: AppColors.textSecondary)),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Hủy', style: TextStyle(color: AppColors.textMuted)),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('Xóa', style: TextStyle(color: AppColors.danger)),
                    ),
                  ],
                ),
              );
              if (confirm == true) {
                await _controller.deleteEffect(effect.id);
                if (mounted) setState(() {});
              }
            },
          );
        },
        childCount: _controller.effects.length,
      ),
    );
  }
}

class _EffectCard extends StatelessWidget {
  final ProfileEffectModel effect;
  final VoidCallback onEdit;
  final VoidCallback onToggleStatus;
  final VoidCallback onDelete;

  const _EffectCard({
    required this.effect,
    required this.onEdit,
    required this.onToggleStatus,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Image preview area
          Expanded(
            flex: 3,
            child: Container(
              decoration: const BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.vertical(top: Radius.circular(11)),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (effect.imageUrl != null && effect.imageUrl!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Image.network(
                        effect.imageUrl!,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => const Icon(Icons.image_not_supported, color: AppColors.textMuted, size: 32),
                      ),
                    )
                  else
                    const Icon(Icons.auto_awesome, color: AppColors.textMuted, size: 48),
                  
                  // Status badge
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: effect.isActive ? AppColors.success.withOpacity(0.2) : AppColors.danger.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: effect.isActive ? AppColors.success.withOpacity(0.5) : AppColors.danger.withOpacity(0.5)),
                      ),
                      child: Text(
                        effect.isActive ? 'Active' : 'Inactive',
                        style: TextStyle(
                          color: effect.isActive ? AppColors.success : AppColors.danger,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Info area
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    effect.name,
                    style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '\$${effect.price.toStringAsFixed(2)}',
                    style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                  const Spacer(),
                  // Actions
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit_rounded, size: 18),
                        color: AppColors.blurple,
                        tooltip: 'Sửa',
                        onPressed: onEdit,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      IconButton(
                        icon: Icon(effect.isActive ? Icons.visibility_off_rounded : Icons.visibility_rounded, size: 18),
                        color: effect.isActive ? AppColors.warning : AppColors.success,
                        tooltip: effect.isActive ? 'Tắt hiển thị' : 'Bật hiển thị',
                        onPressed: onToggleStatus,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, size: 18),
                        color: AppColors.danger,
                        tooltip: 'Xóa',
                        onPressed: onDelete,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
