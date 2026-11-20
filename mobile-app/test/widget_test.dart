import 'package:flutter_test/flutter_test.dart';

import 'package:attack_aware_3_mob_app/models/user_model.dart';
import 'package:attack_aware_3_mob_app/utils/constants.dart';

void main() {
  group('ApiConstants', () {
    test('dev default points at localhost (adb reverse) and includes /api', () {
      // Passes when no --dart-define=API_BASE_URL is given to `flutter test`.
      expect(ApiConstants.baseUrl, 'http://localhost:5000/api');
    });
  });

  group('UserRole.tryParse', () {
    test('parses the four backend roles', () {
      expect(UserRole.tryParse('super_admin'), UserRole.superAdmin);
      expect(UserRole.tryParse('admin'), UserRole.admin);
      expect(UserRole.tryParse('employee'), UserRole.employee);
      expect(UserRole.tryParse('individual'), UserRole.individual);
    });

    test('returns null for unknown or missing values', () {
      expect(UserRole.tryParse('manager'), isNull);
      expect(UserRole.tryParse(''), isNull);
      expect(UserRole.tryParse(null), isNull);
    });
  });

  group('UserModel.fromJson', () {
    test('individual user without companyId keeps companyId null', () {
      final user = UserModel.fromJson(<String, dynamic>{
        'id': 'u1',
        'name': 'Test User',
        'email': 'test@example.com',
        'role': 'individual',
      });

      expect(user.role, UserRole.individual);
      expect(user.isLearner, isTrue);
      expect(user.companyId, isNull);
    });

    test('company id is preserved when the backend sends it', () {
      final user = UserModel.fromJson(<String, dynamic>{
        'id': 'u2',
        'name': 'Alice',
        'email': 'alice@company1.com',
        'role': 'employee',
        'companyId': 'c1',
      });

      expect(user.role, UserRole.employee);
      expect(user.companyId, 'c1');
    });

    test('missing role is unknown and never defaults to employee', () {
      final user = UserModel.fromJson(<String, dynamic>{
        'id': 'u3',
        'name': 'No Role',
        'email': 'norole@example.com',
      });

      expect(user.rawRole, isNull);
      expect(user.role, isNull);
      expect(user.isEmployee, isFalse);
      expect(user.isLearner, isFalse);
    });

    test('unknown role string is unknown and keeps the raw value', () {
      final user = UserModel.fromJson(<String, dynamic>{
        'id': 'u4',
        'name': 'Odd Role',
        'email': 'odd@example.com',
        'role': 'manager',
      });

      expect(user.rawRole, 'manager');
      expect(user.role, isNull);
      expect(user.isLearner, isFalse);
    });

    test('admin roles are not learners', () {
      for (final role in ['admin', 'super_admin']) {
        final user = UserModel.fromJson(<String, dynamic>{
          'id': 'a',
          'name': 'Admin',
          'email': 'admin@example.com',
          'role': role,
        });
        expect(user.isLearner, isFalse, reason: role);
      }
    });
  });
}
