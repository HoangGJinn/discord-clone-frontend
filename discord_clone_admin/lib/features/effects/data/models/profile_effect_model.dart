import 'package:discord_clone_admin/features/effects/domain/entities/profile_effect.dart';

class ProfileEffectModel extends ProfileEffect {
  const ProfileEffectModel({
    required super.id,
    required super.name,
    required super.description,
    super.imageUrl,
    super.animationUrl,
    required super.price,
    super.type = 'AVATAR',
    required super.isActive,
    super.createdAt,
    super.updatedAt,
  });

  factory ProfileEffectModel.fromJson(Map<String, dynamic> json) {
    return ProfileEffectModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: (json['name']?.toString()) ?? '',
      description: (json['description']?.toString()) ?? '',
      imageUrl: json['imageUrl']?.toString(),
      animationUrl: json['animationUrl']?.toString(),
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      type: (json['type']?.toString()) ?? 'AVATAR',
      isActive: (json['isActive'] ?? json['active']) == true,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
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
      'type': type,
      'isActive': isActive,
    };
  }
}
