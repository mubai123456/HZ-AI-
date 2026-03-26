const ENV_KEY_NAME_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;

export function isValidEnvKeyName(value: string) {
  return ENV_KEY_NAME_PATTERN.test(value.trim());
}
