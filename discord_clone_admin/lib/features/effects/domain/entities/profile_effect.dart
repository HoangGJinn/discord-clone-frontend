class ProfileEffect {
  final int id;
  final String name;
  final String description;
  final String? imageUrl;
  final String? animationUrl;
  final double price;
  final String type;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const ProfileEffect({
    required this.id,
    required this.name,
    required this.description,
    this.imageUrl,
    this.animationUrl,
    required this.price,
    this.type = 'AVATAR',
    required this.isActive,
    this.createdAt,
    this.updatedAt,
  });
}
