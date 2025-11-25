"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  lang: string;
  setLang: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState('en');

  // Sync with localStorage on mount
  useEffect(() => {
    const storedLang = localStorage.getItem('lang');
    if (storedLang) {
      setLangState(storedLang);
    }
  }, []);

  // Update localStorage when lang changes
  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const setLang = (newLang: string) => {
    setLangState(newLang);
    // localStorage will be updated by useEffect
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};
