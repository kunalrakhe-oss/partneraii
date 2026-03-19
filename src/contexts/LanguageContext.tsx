import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { translations, getTranslation, type Language, type TranslationKeys } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: TranslationKeys;
}

const defaultT = (key: string) => getTranslation(translations.en, key);

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: defaultT,
  translations: translations.en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("lovelist-language");
    return stored === "hi" ? "hi" : "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem("lovelist-language", lang);
    setLanguageState(lang);
    // Set html lang attribute
    document.documentElement.lang = lang;
  }, []);

  const currentTranslations = translations[language];

  const t = useCallback(
    (key: string) => getTranslation(currentTranslations, key),
    [currentTranslations]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations: currentTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
