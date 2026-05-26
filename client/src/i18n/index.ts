import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import ar from './locales/ar.json';

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
];

const SUPPORTED_CODES = languages.map(l => l.code);
const I18N_LS_KEY = 'i18nextLng';

/**
 * Map any BCP-47 locale string to one of our supported language codes.
 * e.g. "en-US" -> "en", "zh-Hans-CN" -> "zh-CN", "pt-BR" stays "pt-BR"
 */
function mapLocaleToSupported(locale: string): string | null {
  if (!locale) return null;
  // Exact match
  if (SUPPORTED_CODES.includes(locale)) return locale;
  // Normalise: zh-Hans → zh-CN, zh-Hant → zh-TW
  if (/^zh[-_]han[st]/i.test(locale)) {
    return /hant/i.test(locale) ? 'zh-TW' : 'zh-CN';
  }
  // pt-BR exact (already handled above, but also match "pt_BR")
  if (/^pt[-_]br/i.test(locale)) return 'pt-BR';
  // Strip region: "en-US" → "en", "fr-CA" → "fr"
  const base = locale.split(/[-_]/)[0].toLowerCase();
  return SUPPORTED_CODES.find(c => c.toLowerCase().startsWith(base)) ?? null;
}

/** Detect the device/browser preferred language and return our best match. */
export function detectDeviceLanguage(): string {
  const navLangs = [
    navigator.language,
    ...(navigator.languages || []),
  ].filter(Boolean);

  for (const lang of navLangs) {
    const matched = mapLocaleToSupported(lang);
    if (matched) return matched;
  }
  return 'en';
}

/** Call this to forget the user's explicit language choice and follow the phone. */
export function resetToPhoneLanguage(): void {
  try { localStorage.removeItem(I18N_LS_KEY); } catch {}
  const lang = detectDeviceLanguage();
  i18n.changeLanguage(lang);
}

const resources = {
  en: { translation: en },
  es: { translation: es },
  'pt-BR': { translation: ptBR },
  fr: { translation: fr },
  de: { translation: de },
  ja: { translation: ja },
  ko: { translation: ko },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  ar: { translation: ar },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: I18N_LS_KEY,
      convertDetectedLanguage: (lng: string) => mapLocaleToSupported(lng) ?? 'en',
    },
  });

export default i18n;
