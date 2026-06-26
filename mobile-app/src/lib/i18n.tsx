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
      pay: 'Payer',
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
    transfer: {
      title: 'Nouveau transfert',
      subtitle: "Envoyez de l'argent en Afrique",
      recipientInfo: 'Informations du destinataire',
      recipientNamePlaceholder: 'Nom complet du destinataire',
      phonePlaceholder: 'Numéro de téléphone',
      amountToSend: 'Montant à envoyer',
      destinationCountry: 'Pays de destination',
      deliveryMethod: 'Méthode de réception',
      mobileMoney: 'Mobile Money',
      bankTransfer: 'Virement bancaire',
      summary: 'Résumé du transfert',
      amountSent: 'Montant envoyé:',
      fees: 'Frais:',
      totalToPay: 'Total à payer:',
      received: 'Montant reçu:',
      payTransfer: 'Payer le transfert',
      processing: 'Traitement...',
      confirmTitle: 'Confirmer le transfert',
      confirmMessage:
        'Envoyer {amount} CAD à {name} ?\nVous allez procéder au paiement par carte.',
      continue: 'Continuer',
      paidTitle: 'Paiement réussi',
      paidMessage:
        'Votre transfert a été payé avec succès. Il apparaît dans votre historique.',
      cancelledTitle: 'Paiement annulé',
      cancelledMessage:
        'Le transfert a été enregistré (en attente). Vous pourrez le régler plus tard.',
      paymentFailed: 'Le paiement a échoué',
      createFailed: 'Impossible de créer le transfert',
      fillRequired: 'Veuillez remplir tous les champs obligatoires',
      rateError: 'Impossible de récupérer le taux de change',
    },
    marketplace: {
      subtitle: "Produits authentiques d'Afrique",
      categories: 'Catégories',
      all: 'Tout',
      allProducts: 'Tous les produits',
      noProducts: 'Aucun produit disponible pour le moment',
      noProductsCategory: 'Aucun produit dans cette catégorie',
      outOfStock: 'Rupture de stock',
      addToCart: 'Ajouter au panier',
      unavailable: 'Indisponible',
      loadError: 'Impossible de charger les données du marketplace',
    },
    cart: {
      title: 'Panier',
      empty: 'Votre panier est vide',
      continueShopping: 'Continuer mes achats',
      remove: 'Retirer',
      total: 'Total',
      pay: 'Payer {amount} CAD',
      processing: 'Traitement...',
      checkoutTitle: 'Finaliser la commande',
      checkoutMessage: 'Total : {amount} CAD\nProcéder au paiement par carte ?',
      paidTitle: 'Commande payée',
      paidMessage: 'Merci ! Votre commande a été enregistrée.',
      paymentFailed: 'Le paiement a échoué',
    },
    detail: {
      transferTitle: 'Détail du transfert',
      orderTitle: 'Détail de la commande',
      recipient: 'Bénéficiaire',
      name: 'Nom',
      phone: 'Téléphone',
      destination: 'Destination',
      delivery: 'Réception',
      details: 'Détails',
      transferNumber: 'N° de transfert',
      exchangeRate: 'Taux de change',
      fees: 'Frais',
      receivedAmount: 'Montant reçu',
      date: 'Date',
      articles: 'Articles',
      noArticles: 'Aucun article',
      orderNumber: 'Commande',
      transferNotFound: 'Transfert introuvable',
      orderNotFound: 'Commande introuvable',
      mobileMoney: 'Mobile Money',
      bankAccount: 'Compte bancaire',
      cash: 'Espèces',
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
      pay: 'Pay',
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
    transfer: {
      title: 'New transfer',
      subtitle: 'Send money to Africa',
      recipientInfo: 'Recipient information',
      recipientNamePlaceholder: "Recipient's full name",
      phonePlaceholder: 'Phone number',
      amountToSend: 'Amount to send',
      destinationCountry: 'Destination country',
      deliveryMethod: 'Delivery method',
      mobileMoney: 'Mobile Money',
      bankTransfer: 'Bank transfer',
      summary: 'Transfer summary',
      amountSent: 'Amount sent:',
      fees: 'Fees:',
      totalToPay: 'Total to pay:',
      received: 'Amount received:',
      payTransfer: 'Pay transfer',
      processing: 'Processing...',
      confirmTitle: 'Confirm transfer',
      confirmMessage:
        'Send {amount} CAD to {name}?\nYou will proceed with card payment.',
      continue: 'Continue',
      paidTitle: 'Payment successful',
      paidMessage:
        'Your transfer was paid successfully. It appears in your history.',
      cancelledTitle: 'Payment cancelled',
      cancelledMessage:
        'The transfer was saved (pending). You can pay for it later.',
      paymentFailed: 'Payment failed',
      createFailed: 'Unable to create the transfer',
      fillRequired: 'Please fill in all required fields',
      rateError: 'Unable to fetch the exchange rate',
    },
    marketplace: {
      subtitle: 'Authentic products from Africa',
      categories: 'Categories',
      all: 'All',
      allProducts: 'All products',
      noProducts: 'No products available yet',
      noProductsCategory: 'No products in this category',
      outOfStock: 'Out of stock',
      addToCart: 'Add to cart',
      unavailable: 'Unavailable',
      loadError: 'Unable to load marketplace data',
    },
    cart: {
      title: 'Cart',
      empty: 'Your cart is empty',
      continueShopping: 'Continue shopping',
      remove: 'Remove',
      total: 'Total',
      pay: 'Pay {amount} CAD',
      processing: 'Processing...',
      checkoutTitle: 'Complete order',
      checkoutMessage: 'Total: {amount} CAD\nProceed with card payment?',
      paidTitle: 'Order paid',
      paidMessage: 'Thank you! Your order has been registered.',
      paymentFailed: 'Payment failed',
    },
    detail: {
      transferTitle: 'Transfer details',
      orderTitle: 'Order details',
      recipient: 'Recipient',
      name: 'Name',
      phone: 'Phone',
      destination: 'Destination',
      delivery: 'Delivery',
      details: 'Details',
      transferNumber: 'Transfer no.',
      exchangeRate: 'Exchange rate',
      fees: 'Fees',
      receivedAmount: 'Amount received',
      date: 'Date',
      articles: 'Items',
      noArticles: 'No items',
      orderNumber: 'Order',
      transferNotFound: 'Transfer not found',
      orderNotFound: 'Order not found',
      mobileMoney: 'Mobile Money',
      bankAccount: 'Bank account',
      cash: 'Cash',
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
  t: (key: string, params?: Record<string, string | number>) => string;
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

  const t = (
    key: string,
    params?: Record<string, string | number>,
  ): string => {
    const value = key
      .split('.')
      .reduce<any>(
        (obj, part) =>
          obj && typeof obj === 'object' ? obj[part] : undefined,
        translations[language],
      );
    if (typeof value !== 'string') return key;
    if (!params) return value;
    return Object.entries(params).reduce(
      (str, [paramKey, paramValue]) =>
        str.replace(`{${paramKey}}`, String(paramValue)),
      value,
    );
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
