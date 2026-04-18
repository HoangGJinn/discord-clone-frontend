import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:flutter/material.dart';

enum StatTrend { up, down, neutral }

class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.accentColor,
    this.trend,
    this.trendLabel,
    this.isLoading = false,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color accentColor;
  final StatTrend? trend;
  final String? trendLabel;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: isLoading ? _buildSkeleton() : _buildContent(),
    );
  }

  Widget _buildContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: accentColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(9),
              ),
              child: Icon(icon, color: accentColor, size: 18),
            ),
            const Spacer(),
            if (trend != null && trendLabel != null) _buildTrend(),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 22,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.2,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildTrend() {
    final isUp = trend == StatTrend.up;
    final isDown = trend == StatTrend.down;
    final color = isUp
        ? AppColors.success
        : isDown
            ? AppColors.danger
            : AppColors.textMuted;
    final trendIcon = isUp
        ? Icons.trending_up_rounded
        : isDown
            ? Icons.trending_down_rounded
            : Icons.trending_flat_rounded;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(trendIcon, color: color, size: 13),
        const SizedBox(width: 2),
        Text(
          trendLabel!,
          style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildSkeleton() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        _SkeletonBox(width: 34, height: 34, radius: 9),
        const SizedBox(height: 8),
        _SkeletonBox(width: 72, height: 22, radius: 5),
        const SizedBox(height: 5),
        _SkeletonBox(width: 100, height: 11, radius: 4),
      ],
    );
  }
}

class _SkeletonBox extends StatefulWidget {
  const _SkeletonBox({required this.width, required this.height, required this.radius});
  final double width;
  final double height;
  final double radius;

  @override
  State<_SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<_SkeletonBox> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000))..repeat(reverse: true);
    _anim = Tween(begin: 0.3, end: 0.6).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
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
      builder: (_, __) => Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: AppColors.surface.withOpacity(_anim.value + 0.4),
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}
