import 'package:flutter_test/flutter_test.dart';

import 'package:discord_clone_admin/app/admin_app.dart';

void main() {
  testWidgets('Login screen renders expected controls', (WidgetTester tester) async {
    await tester.pumpWidget(const AdminApp());

    expect(find.text('Đăng nhập'), findsNWidgets(2));
    expect(find.text('Tên đăng nhập'), findsOneWidget);
    expect(find.text('Mật khẩu'), findsOneWidget);
    expect(find.text('Quên mật khẩu?'), findsOneWidget);
  });
}
