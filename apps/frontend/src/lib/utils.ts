import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { z } from 'zod'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function zodFieldErrors<TField extends string>(
  issues: z.ZodIssue[],
): Partial<Record<TField, string>> {
  const next: Partial<Record<TField, string>> = {}
  for (const issue of issues) next[issue.path[0] as TField] = issue.message
  return next
}
