import { en, type TranslationKeys } from "./en";
import { hi } from "./hi";

export type Language = "en" | "hi";

export const translations: Record<Language, TranslationKeys> = { en, hi };

export const LANGUAGE_OPTIONS = [
  { value: "en" as Language, label: "English", nativeLabel: "English" },
  { value: "hi" as Language, label: "Hindi", nativeLabel: "हिन्दी" },
];

/**
 * Get a nested translation value by dot-separated key path.
 * e.g. getTranslation(en, "nav.home") → "Home"
 */
export function getTranslation(lang: TranslationKeys, key: string): string {
  const keys = key.split(".");
  let value: any = lang;
  for (const k of keys) {
    if (value == null) return key;
    value = value[k];
  }
  return typeof value === "string" ? value : key;
}

export type { TranslationKeys };
