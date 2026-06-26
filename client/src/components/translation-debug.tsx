import { useLanguage } from "@/lib/i18n";

export default function TranslationDebug() {
  const { language, t, changeLanguage } = useLanguage();
  
  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 p-4 rounded shadow-lg z-50">
      <div className="text-sm">
        <p><strong>Langue actuelle:</strong> {language}</p>
        <p><strong>Test traduction:</strong> {t('nav.home')}</p>
        <p><strong>Test héro:</strong> {t('hero.subtitle')}</p>
        <button 
          onClick={() => changeLanguage(language === "fr" ? "en" : "fr")}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs"
        >
          Changer langue
        </button>
      </div>
    </div>
  );
}