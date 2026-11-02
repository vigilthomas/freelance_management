import type { ZodType } from 'zod';

/** Validates with a Zod schema and returns either the parsed data or the first error message per field. */
export function validate<T>(schema: ZodType<T>, data: unknown): { data: T; errors: null } | { data: null; errors: Record<string, string> } {
  const r = schema.safeParse(data);
  if (r.success) return { data: r.data, errors: null };
  const errors: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = String(issue.path[0] ?? '_');
    errors[key] ??= issue.message;
  }
  return { data: null, errors };
}
