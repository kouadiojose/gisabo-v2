import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';

export type Language = 'fr' | 'en';

const translations: Record<Language, Record<string, any>> = {
  fr: {
    nav: {
      dashboard: 'Accueil',
      transfer: 'Transfert',
      marketplace: 'Marketplace',
      profile: 'Profil',
    },
    common: {
      cancel: 'Annuler',
      retry: 'Réessayer',
      error: 'Erreur',
      loading: 'Chargement...',
    },
    auth: {
      tagline: "Votre pont vers l'Afrique",
      loginTitle: 'Connexion',
      identifier: "Email ou nom d'utilisateur",
      password: 'Mot de passe',
      signIn: 'Se connecter',
      signingIn: 'Connexion...',
      noAccount: 'Pas encore de compte ?',
      createAccount: 'Créer un compte',
      fillFields: 'Veuillez remplir tous les champs',
      badCredentials: 'Identifiants incorrects',
      registerTitle: 'Créer un compte',
      firstName: 'Prénom',
      lastName: 'Nom',
      username: "Nom d'utilisateur",
      email: 'Email',
      phoneOptional: 'Téléphone (optionnel)',
      confirmPassword: 'Confirmer le mot de passe',
      createMyAccount: 'Créer mon compte',
      creating: 'Création...',
      haveAccount: 'Déjà un compte ?',
      fillRequired: 'Veuillez remplir tous les champs obligatoires',
      passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
      passwordsNoMatch: 'Les mots de passe ne correspondent pas',
      registerFailed: 'Inscription impossible',
    },
    dashboard: {
      greeting: 'Bonjour',
      subtitle: 'Bienvenue sur votre tableau de bord GISABO',
      totalSent: 'Total envoyé (CAD)',
      monthly: 'Transferts ce mois',
      orders: 'Commandes',
      recentTransfers: 'Transferts récents',
      recentOrders: 'Commandes récentes',
      noTransfers: 'Aucun transfert récent',
      noOrders: 'Aucune commande récente',
      toRecipient: 'Vers',
      order: 'Commande',
      quickActions: 'Actions rapides',
      newTransfer: 'Nouveau transfert',
      mobileTopup: 'Recharge mobile',
    },
    profile: {
      settings: 'Paramètres',
      language: 'Langue',
      french: 'Français',
      english: 'English',
      logout: 'Déconnexion',
      logoutConfirm: 'Voulez-vous vraiment vous déconnecter ?',
    },
  },
  en: {
    nav: {
      dashboard: 'Home',
      transfer: 'Transfer',
      marketplace: 'Marketplace',
      profile: 'Profile',
    },
    common: {
      cancel: 'Cancel',
      retry: 'Retry',
      error: 'Error',
      loading: 'Loading...',
    },
    auth: {
      tagline: 'Your bridge to Africa',
      loginTitle: 'Sign in',
      identifier: 'Email or username',
      password: 'Password',
      signIn: 'Sign in',
      signingIn: 'Signing in...',
      noAccount: "Don't have an account?",
      createAccount: 'Create an account',
      fillFields: 'Please fill in all fields',
      badCredentials: 'Invalid credentials',
      registerTitle: 'Create an account',
      firstName: 'First name',
      lastName: 'Last name',
      username: 'Username',
      email: 'Email',
      phoneOptional: 'Phone (optional)',
      confirmPassword: 'Confirm password',
      createMyAccount: 'Create my account',
      creating: 'Creating...',
      haveAccount: 'Already have an account?',
      fillRequired: 'Please fill in all required fields',
      passwordTooShort: 'Password must be at least 6 characters',
      passwordsNoMatch: 'Passwords do not match',
      registerFailed: 'Registration failed',
    },
    dashboard: {
      greeting: 'Hello',
      subtitle: 'Welcome to your GISABO dashboard',
      totalSent: 'Total sent (CAD)',
      monthly: 'Transfers this month',
      orders: 'Orders',
      recentTransfers: 'Recent transfers',
      recentOrders: 'Recent orders',
      noTransfers: 'No recent transfers',
      noOrders: 'No recent orders',
      toRecipient: 'To',
      order: 'Order',
      quickActions: 'Quick actions',
      newTransfer: 'New transfer',
      mobileTopup: 'Mobile top-up',
    },
    profile: {
      settings: 'Settings',
      language: 'Language',
      french: 'Français',
      english: 'English',
      logout: 'Log out',
      logoutConfirm: 'Are you sure you want to log out?',
    },
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>('fr');

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync('language');
      if (saved === 'fr' || saved === 'en') {
        setLang(saved);
      }
    })();
  }, []);

  const setLanguage = (next: Language) => {
    setLang(next);
    SecureStore.setItemAsync('language', next).catch(() => {});
  };

  const t = (key: string): string => {
    const value = key
      .split('.')
      .reduce<any>(
        (obj, part) =>
          obj && typeof obj === 'object' ? obj[part] : undefined,
        translations[language],
      );
    return typeof value === 'string' ? value : key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
