import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { settingsStore } from '@/utils/settings-store';

import ro from './locales/ro.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import el from './locales/el.json';
import tr from './locales/tr.json';
import vi from './locales/vi.json';
import uk from './locales/uk.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import hi from './locales/hi.json';

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources: {
    ro: { translation: ro },
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
    el: { translation: el },
    tr: { translation: tr },
    vi: { translation: vi },
    uk: { translation: uk },
    ru: { translation: ru },
    ar: { translation: ar },
    zh: { translation: zh },
    ja: { translation: ja },
    ko: { translation: ko },
    hi: { translation: hi },
  },
  lng: settingsStore.getLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
