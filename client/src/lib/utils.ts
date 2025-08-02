import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize Romanian text by removing diacritics for diacritic-insensitive search
 * Handles Romanian characters: ă, â, î, ș, ț, Ă, Â, Î, Ș, Ț
 */
export function normalizeDiacritics(text: string): string {
  if (!text) return '';
  
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ăĂ]/g, 'a')
    .replace(/[âÂ]/g, 'a')
    .replace(/[îÎ]/g, 'i')
    .replace(/[șȘ]/g, 's')
    .replace(/[țȚ]/g, 't')
    .toLowerCase();
}
