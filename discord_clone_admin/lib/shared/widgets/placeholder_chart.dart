import 'dart:math' as math;

import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:flutter/material.dart';

class PlaceholderChart extends StatefulWidget {
  const PlaceholderChart({
    super.key,
    this.height = 180,
    this.label = 'Biểu đồ sẽ được hiển thị ở đây',
    this.accentColor = AppColors.blurple,
  });

  final double height;
  final String label;
  final Color accentColor;

  @override
  State<PlaceholderChart> createState() => _PlaceholderChartState();
}

class _PlaceholderChartState extends State<PlaceholderChart> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: widget.height,
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Animated fake bars
          AnimatedBuilder(
            animation: _anim,
            builder: (_, __) => CustomPaint(
              painter: _FakeBarPainter(
                progress: _anim.value,
                accentColor: widget.accentColor,
              ),
              size: Size.infinite,
            ),
          ),
          // Overlay with label
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surface.withOpacity(0.85),
                    borderRadius: BorderRadius.circular(50),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Icon(Icons.bar_chart_rounded, color: widget.accentColor, size: 28),
                ),
                const SizedBox(height: 10),
                Text(
                  widget.label,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
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

class _FakeBarPainter extends CustomPainter {
  _FakeBarPainter({required this.progress, required this.accentColor});

  final double progress;
  final Color accentColor;

  static const _bars = [0.4, 0.65, 0.5, 0.8, 0.55, 0.72, 0.6, 0.85, 0.45, 0.7];

  @override
  void paint(Canvas canvas, Size size) {
    final barCount = _bars.length;
    final barWidth = size.width / barCount * 0.55;
    final gap = size.width / barCount * 0.45;
    final paint = Paint()..style = PaintingStyle.fill;

    for (var i = 0; i < barCount; i++) {
      final animated = _bars[i] * (0.7 + 0.3 * math.sin(progress * math.pi + i * 0.5));
      final barHeight = size.height * animated * 0.65;
      final x = i * (barWidth + gap) + gap / 2;
      final y = size.height - barHeight;

      paint.color = accentColor.withOpacity(0.12 + (i % 2) * 0.05);
      final rRect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, y, barWidth, barHeight),
        const Radius.circular(4),
      );
      canvas.drawRRect(rRect, paint);
    }
  }

  @override
  bool shouldRepaint(_FakeBarPainter oldDelegate) => oldDelegate.progress != progress;
}
