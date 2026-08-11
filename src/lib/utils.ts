import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleSupabaseError(error: any) {
  console.error('Supabase Error: ', error);
  throw new Error(error.message || 'An unexpected database error occurred');
}
