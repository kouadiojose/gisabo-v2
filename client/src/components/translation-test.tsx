import { useLanguage } from "@/lib/i18n";

export default function TranslationTest() {
  const { language, t, changeLanguage } = useLanguage();

  return (
    <div className="bg-yellow-100 p-4 border border-yellow-300 rounded-lg my-4">
      <h3 className="font-bold">Test de traduction</h3>
      <p>Langue actuelle: {language}</p>
      <p>Test nav.home: "{t('nav.home')}"</p>
      <p>Test hero.title: "{t('hero.title')}"</p>
      <button 
        onClick={() => changeLanguage(language === "fr" ? "en" : "fr")}
        className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
      >
        Changer langue
      </button>
    </div>
  );
}