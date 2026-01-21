import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import cz from "../translations/cz.json";
import ru from "../translations/ru.json";
import en from "../translations/en.json";

export type Language = "cz" | "ru" | "en";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const dictionaries: Record<Language, any> = {
    cz,
    ru,
    en,
};

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>(
        (localStorage.getItem("language") as Language) || "cz"
    );

    const changeLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem("language", lang);
    };

    const t = (key: string): string => {
        const keys = key.split(".");
        let value: any = dictionaries[language];

        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) return key;
        }

        return typeof value === "string" ? value : key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within LanguageProvider");
    }
    return context;
}
