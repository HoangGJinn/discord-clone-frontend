import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:flutter/material.dart';

/// Animated shimmer skeleton for list items
class SkeletonList extends StatelessWidget {
  const SkeletonList({
    super.key,
    this.itemCount = 6,
    this.showAvatar = true,
    this.showTrailing = true,
  });

  final int itemCount;
  final bool showAvatar;
  final bool showTrailing;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: itemCount,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (_, i) => _SkeletonItem(
        index: i,
        showAvatar: showAvatar,
        showTrailing: showTrailing,
      ),
    );
  }
}

class _SkeletonItem extends StatefulWidget {
  const _SkeletonItem({
    required this.index,
    required this.showAvatar,
    required this.showTrailing,
  });

  final int index;
  final bool showAvatar;
  final bool showTrailing;

  @override
  State<_SkeletonItem> createState() => _SkeletonItemState();
}

class _SkeletonItemState extends State<_SkeletonItem> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    final delay = widget.index * 80;
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    Future.delayed(Duration(milliseconds: delay), () {
      if (mounted) _ctrl.repeat(reverse: true);
    });
    _anim = Tween(begin: 0.3, end: 0.65).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) {
        final opacity = _anim.value;
        return Container(
          color: AppColors.cardBg,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              if (widget.showAvatar) ...[
                _shimmer(width: 38, height: 38, radius: 19, opacity: opacity),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _shimmer(width: 140, height: 13, radius: 4, opacity: opacity),
                    const SizedBox(height: 6),
                    _shimmer(
                      width: 80 + (widget.index % 3) * 20.0,
                      height: 11,
                      radius: 4,
                      opacity: opacity * 0.7,
                    ),
                  ],
                ),
              ),
              if (widget.showTrailing) ...[
                const SizedBox(width: 12),
                _shimmer(width: 48, height: 22, radius: 11, opacity: opacity),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _shimmer({
    required double width,
    required double height,
    required double radius,
    required double opacity,
  }) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.surface.withOpacity(opacity + 0.35),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

/// Single skeleton row with custom widths
class SkeletonRow extends StatefulWidget {
  const SkeletonRow({super.key, this.lineWidths = const [160, 100]});
  final List<double> lineWidths;

  @override
  State<SkeletonRow> createState() => _SkeletonRowState();
}

class _SkeletonRowState extends State<SkeletonRow> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);
    _anim = Tween(begin: 0.3, end: 0.65).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < widget.lineWidths.length; i++) ...[
            if (i > 0) const SizedBox(height: 6),
            Container(
              width: widget.lineWidths[i],
              height: i == 0 ? 14 : 11,
              decoration: BoxDecoration(
                color: AppColors.surface.withOpacity(_anim.value + 0.35),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
