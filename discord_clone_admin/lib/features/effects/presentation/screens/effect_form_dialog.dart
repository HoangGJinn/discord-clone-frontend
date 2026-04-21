import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/features/effects/data/models/profile_effect_model.dart';
import 'package:discord_clone_admin/shared/widgets/app_text_field.dart';
import 'package:flutter/material.dart';

class EffectFormDialog extends StatefulWidget {
  final ProfileEffectModel? effect;
  final Function(ProfileEffectModel) onSave;

  const EffectFormDialog({super.key, this.effect, required this.onSave});

  @override
  State<EffectFormDialog> createState() => _EffectFormDialogState();
}

class _EffectFormDialogState extends State<EffectFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _descController;
  late final TextEditingController _imageController;
  late final TextEditingController _animationController;
  late final TextEditingController _priceController;
  bool _isActive = true;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.effect?.name ?? '');
    _descController = TextEditingController(text: widget.effect?.description ?? '');
    _imageController = TextEditingController(text: widget.effect?.imageUrl ?? '');
    _animationController = TextEditingController(text: widget.effect?.animationUrl ?? '');
    _priceController = TextEditingController(text: widget.effect?.price.toString() ?? '0.0');
    _isActive = widget.effect?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _imageController.dispose();
    _animationController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      final newEffect = ProfileEffectModel(
        id: widget.effect?.id ?? 0,
        name: _nameController.text.trim(),
        description: _descController.text.trim(),
        imageUrl: _imageController.text.trim(),
        animationUrl: _animationController.text.trim(),
        price: double.tryParse(_priceController.text) ?? 0.0,
        isActive: _isActive,
      );
      widget.onSave(newEffect);
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        width: 400,
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.effect == null ? 'Thêm Gói mới' : 'Chỉnh sửa Gói',
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 20),
                
                AppTextField(
                  controller: _nameController,
                  label: 'Tên hiệu ứng *',
                  validator: (val) => val == null || val.isEmpty ? 'Vui lòng nhập tên' : null,
                ),
                const SizedBox(height: 16),
                
                AppTextField(
                  controller: _priceController,
                  label: 'Giá tiền (\$)*',
                  keyboardType: TextInputType.number,
                  validator: (val) {
                    if (val == null || val.isEmpty) return 'Vui lòng nhập giá';
                    if (double.tryParse(val) == null) return 'Giá không hợp lệ';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                AppTextField(
                  controller: _descController,
                  label: 'Mô tả',
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                
                AppTextField(
                  controller: _imageController,
                  label: 'URL Hình ảnh tĩnh (PNG)',
                  hintText: 'Dùng cho assets/avatar/frame_*.png',
                ),
                const SizedBox(height: 16),
                
                AppTextField(
                  controller: _animationController,
                  label: 'URL Animation tĩnh (Lottie/MP4)',
                  hintText: 'Tuỳ chọn',
                ),
                const SizedBox(height: 16),
                
                Row(
                  children: [
                    Checkbox(
                      value: _isActive,
                      onChanged: (val) => setState(() => _isActive = val ?? true),
                      activeColor: AppColors.blurple,
                      checkColor: Colors.white,
                      side: const BorderSide(color: AppColors.border),
                    ),
                    const Text('Active (Hiển thị trong Store)', style: TextStyle(color: AppColors.textPrimary)),
                  ],
                ),
                const SizedBox(height: 24),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Hủy', style: TextStyle(color: AppColors.textMuted)),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.blurple,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Lưu'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
