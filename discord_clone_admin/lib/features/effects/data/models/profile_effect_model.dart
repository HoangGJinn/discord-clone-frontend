import 'package:discord_clone_admin/features/effects/domain/entities/profile_effect.dart';

class ProfileEffectModel extends ProfileEffect {
  const ProfileEffectModel({
    required super.id,
    required super.name,
    required super.description,
    super.imageUrl,
    super.animationUrl,
    required super.price,
    required super.isActive,
    super.createdAt,
    super.updatedAt,
  });

  factory ProfileEffectModel.fromJson(Map<String, dynamic> json) {
    return ProfileEffectModel(
      id: json['id'] as int,
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      imageUrl: json['imageUrl'] as String?,
      animationUrl: json['animationUrl'] as String?,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      isActive: json['isActive'] as bool? ?? false,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'imageUrl': imageUrl,
      'animationUrl': animationUrl,
      'price': price,
      'isActive': isActive,
    };
  }
}
