import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/core/theme/app_spacing.dart';
import 'package:flutter/material.dart';

class AppTextField extends StatefulWidget {
  const AppTextField({
    required this.label,
    required this.controller,
    this.hintText,
    this.errorText,
    this.obscureText = false,
    this.onChanged,
    this.validator,
    this.keyboardType,
    this.maxLines = 1,
    super.key,
  });

  final String label;
  final TextEditingController controller;
  final String? hintText;
  final String? errorText;
  final bool obscureText;
  final ValueChanged<String>? onChanged;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final int? maxLines;

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  bool _isFocused = false;
  late bool _hideText;

  @override
  void initState() {
    super.initState();
    _hideText = widget.obscureText;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: TextStyle(
            color: widget.errorText != null ? AppColors.danger : AppColors.textSecondary,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        TextFormField(
          controller: widget.controller,
          onChanged: widget.onChanged,
          validator: widget.validator,
          keyboardType: widget.keyboardType,
          maxLines: widget.maxLines,
          obscureText: widget.obscureText && _hideText,
          cursorColor: AppColors.textPrimary,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
          onTapOutside: (_) => FocusScope.of(context).unfocus(),
          onFieldSubmitted: (_) => FocusScope.of(context).unfocus(),
          onEditingComplete: () {},
          decoration: InputDecoration(
            hintText: widget.hintText,
            hintStyle: const TextStyle(color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.inputBackground,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.md,
            ),
            border: _border(AppColors.divider),
            enabledBorder: _border(AppColors.divider),
            focusedBorder: _border(AppColors.blurple),
            errorBorder: _border(AppColors.danger),
            focusedErrorBorder: _border(AppColors.danger),
            errorText: widget.errorText,
            errorStyle: const TextStyle(color: AppColors.danger, fontSize: 12),
            suffixIcon: widget.obscureText
                ? IconButton(
                    onPressed: () => setState(() => _hideText = !_hideText),
                    icon: Icon(
                      _hideText ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                      color: AppColors.textSecondary,
                    ),
                  )
                : null,
          ),
          onTap: () {
            if (!_isFocused) {
              setState(() {
                _isFocused = true;
              });
            }
          },
        ),
        const SizedBox(height: AppSpacing.md),
      ],
    );
  }

  OutlineInputBorder _border(Color color) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(color: color, width: 1),
    );
  }
}
