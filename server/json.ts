// Narrow untrusted JSON at external API boundaries before reading fields.
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
export function stringRecord(value: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record(value)).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
