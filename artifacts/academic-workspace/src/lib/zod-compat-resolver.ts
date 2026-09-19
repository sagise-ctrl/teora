/**
 * Zod v4-compatible resolver for react-hook-form.
 *
 * Why this exists:
 * `@hookform/resolvers/zod@1.0.0` (bundled in @hookform/resolvers@3.10.0) was
 * written for Zod v3, whose ZodError exposed issues as `.errors`. Zod v4
 * renamed that to `.issues`. The bundled resolver checks
 * `Array.isArray(err?.errors)` — false on v4 errors — and then re-throws the
 * ZodError. The throw escapes react-hook-form (whose resolver returns a
 * rejected promise) and bubbles to `window.onerror` as an uncaught page error.
 *
 * Symptom in this codebase:
 *   - Navigate to /projects/new → uncaught `ZodError: too_small instructionText`
 *     fires once in console (form is still usable because disabled-while-invalid
 *     UX happens to mask the absence of errors).
 *   - login.tsx and register.tsx use the same broken resolver but never trigger
 *     it because they don't access `form.formState.isValid` (which forces
 *     validation on render with `mode: "onChange"`).
 *
 * The fix: do what @hookform/resolvers/zod@1.0.0 should do — call `safeParse`
 * on a v4 schema, convert `error.issues` into the `{ values, errors }` shape
 * react-hook-form expects, return without ever throwing.
 *
 * Usage:
 *   import { zodResolver } from "@/lib/zod-compat-resolver";
 *   const form = useForm({ resolver: zodResolver(formSchema), ... });
 */

import type { FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

type FieldErrors = Record<string, { type: string; message: string }>;

export function zodResolver<T extends z.ZodTypeAny>(
  schema: T
): Resolver<z.infer<T> & FieldValues> {
  return (async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data as z.infer<T>, errors: {} };
    }

    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      // Path may be empty for top-level form errors.
      const path = issue.path.join(".") || "_root";
      // First issue wins per field to match react-hook-form's single-error UX.
      if (!errors[path]) {
        errors[path] = {
          type: issue.code ?? "validation",
          message: issue.message,
        };
      }
    }
    return {
      // When invalid, react-hook-form wants either the original input or {}.
      // Returning the original lets the form keep what the user typed.
      values: values as z.infer<T>,
      errors: errors as never,
    };
  }) as Resolver<z.infer<T> & FieldValues>;
}
