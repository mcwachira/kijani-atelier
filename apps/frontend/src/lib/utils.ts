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


export function getPasswordStrength(password: string) {
  if (password.length === 0) {
    return {
      score: 0,
      label: '',
      color: '',
    }
  }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  const levels = [
    { label: 'Very weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-yellow-500' },
    { label: 'Good', color: 'bg-lime-500' },
    { label: 'Strong', color: 'bg-green-600' },
  ]

  // Clamp to the levels array's range (0–4 index)
  const index = Math.min(score, levels.length - 1)
  return { score: index + 1, ...levels[index] }
}
