// lib/utils/json_helpers.dart
//
// Small, explicit JSON readers. Every model parses its own fields with these
// so a missing or oddly typed field can never throw a cast error.

typedef JsonMap = Map<String, Object?>;

JsonMap asJsonMap(Object? value) {
  if (value is Map) {
    return value.map<String, Object?>(
      (key, item) => MapEntry<String, Object?>(key.toString(), item),
    );
  }
  return const <String, Object?>{};
}

List<JsonMap> asJsonList(Object? value) {
  if (value is List) {
    return [
      for (final item in value)
        if (item is Map) asJsonMap(item),
    ];
  }
  return const <JsonMap>[];
}

/// Non-empty string, or [fallback] when the value is missing or empty.
String asString(Object? value, {String fallback = ''}) {
  final text = asStringOrNull(value);
  return text ?? fallback;
}

String? asStringOrNull(Object? value) {
  if (value == null) return null;
  final text = value.toString();
  return text.isEmpty ? null : text;
}

int? asIntOrNull(Object? value) {
  if (value is num) return value.isFinite ? value.toInt() : null;
  if (value is String) {
    return int.tryParse(value) ?? double.tryParse(value)?.toInt();
  }
  return null;
}

int asInt(Object? value, {int fallback = 0}) => asIntOrNull(value) ?? fallback;
