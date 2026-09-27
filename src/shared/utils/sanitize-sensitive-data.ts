const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|authorization|api[_-]?key|access[_-]?key|cookie|cvv|cvc|credit.?card|card.?number)/i;

export function isAuthenticationRoute(path: string): boolean {
  return /(^|\/)(sign-in|login|authenticate)(\/|$)/i.test(path);
}

export function sanitizeSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSensitiveData(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? '[REDACTED]'
          : sanitizeSensitiveData(nestedValue),
      ]),
    );
  }

  return value;
}