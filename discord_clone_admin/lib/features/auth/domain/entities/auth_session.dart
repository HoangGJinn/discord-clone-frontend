class AuthSession {
  final String token;
  final int userId;
  final String userName;
  final String message;

  const AuthSession({
    required this.token,
    required this.userId,
    required this.userName,
    required this.message,
  });
}