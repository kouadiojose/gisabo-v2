import { useState, useEffect } from "react";

export type Language = "fr" | "en";

let globalLanguage: Language = "fr";

const listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function setGlobalLanguage(language: Language) {
  globalLanguage = language;
  localStorage.setItem("language", language);
  notifyListeners();
}

export const translations = {
  fr: {
    common: {
      loading: "Chargement...",
      error: "Erreur",
      success: "Succès",
      cancel: "Annuler",
      confirm: "Confirmer",
      close: "Fermer",
      search: "Rechercher",
      loginRequired: "Connexion requise",
    },
    nav: {
      home: "Accueil",
      howItWorks: "Fonctionnement",
      services: "Services",
      marketplace: "Marketplace",
      contact: "Contact",
      login: "Connexion",
      dashboard: "Tableau de bord",
      profile: "Mon Profil",
      logout: "Déconnexion",
      register: "S'inscrire",
      welcome: "Bonjour",
    },
    hero: {
      title: "Votre pont vers",
      titleHighlight: "l'Afrique",
      subtitle: "Diaspora, demeurez connectée avec les vôtres !",
      sendMoney: "Envoyer de l'argent",
      exploreMarketplace: "Explorer la marketplace",
      transferButton: "Effectuer un transfert",
      marketplaceButton: "Explorer le marketplace",
      secured: "Sécurisé",
      instant: "Instantané",
      global: "Mondial",
      recentPayment: "Paiement récent",
      completed: "Terminé",
      productName: "Produit",
      meatProduct: "Viande de boucherie",
      amount: "Montant",
      fees: "Frais",
      received: "Reçu",
      features: {
        fast: "Transferts rapides",
        secure: "Plateforme sécurisée",
        lowFees: "Frais réduits",
      },
    },
    servicesSection: {
      title: "Nos Services",
      subtitle: "Découvrez nos solutions complètes pour la diaspora africaine",
      loading: "Chargement des services...",
      comingSoon: "Services bientôt disponibles",
      imageNotAvailable: "Image non disponible",
      details: "Voir détails",
      description: "Description",
      fullDetails: "Détails complets",
      serviceAvailable: "Service disponible",
      close: "Fermer",
      callUs: "Appelez-nous",
      writeUs: "Écrivez-nous",
      noServices: "Aucun service disponible",
      noServicesText: "Les services seront bientôt disponibles.",
      personalizedService: "Service personnalisé",
      personalizedText: "Contactez-nous pour des solutions adaptées à vos besoins",
    },
    marketplace: {
      title: "Marketplace",
      viewCart: "Voir le panier",
      addToCart: "Ajouter au panier",
      outOfStock: "Rupture de stock",
      startingFrom: "À partir de",
      noProducts: "Aucun produit disponible",
      noProductsText: "Les produits seront bientôt disponibles.",
      orderCreated: "Commande créée",
      orderSuccess: "Votre commande a été créée avec succès",
      error: "Erreur",
      productAdded: "Produit ajouté",
      productAddedDesc: "{name} ajouté au panier pour {price} CAD",
      invalidPrice: "Prix invalide",
      invalidPriceDesc: "Le prix minimum est de {min} CAD",
      emptyCart: "Panier vide",
      emptyCartDesc: "Veuillez ajouter des produits avant de commander",
      priceFrom: "À partir de",
      supportText: "Montant que vous souhaitez payer (CAD)",
      total: "Total :",
      order: "Commander",
      supportMore: "Montant que vous souhaitez payer (CAD)",
      supportDescription: "Vous pouvez choisir de payer plus pour soutenir nos producteurs",
      cancel: "Annuler",
    },
    cart: {
      title: "Panier",
      continueShopping: "Continuer mes achats",
      items: "article",
      itemsPlural: "articles",
      unitPrice: "Prix unitaire :",
      orderSummary: "Résumé de la commande",
      subtotal: "Sous-total",
      shipping: "Livraison",
      free: "Gratuite",
      total: "Total",
      placeOrder: "Passer la commande",
      termsText: "En passant commande, vous acceptez nos conditions d'utilisation.",
      emptyCart: "Votre panier est vide",
      emptyCartDesc: "Découvrez nos produits et ajoutez-les à votre panier.",
      productRemoved: "Produit retiré",
      productRemovedDesc: "Le produit a été retiré de votre panier.",
      loginRequired: "Connexion requise",
      loginRequiredDesc: "Vous devez être connecté pour passer commande.",
      emptyCartError: "Panier vide",
      emptyCartErrorDesc: "Veuillez ajouter des produits avant de commander.",
    },
    gisabo: {
      loginRequired: "Connexion requise",
      loginRequiredDesc: "Vous devez être connecté pour effectuer un transfert",
      loginRequiredPayment: "Vous devez être connecté pour effectuer un paiement",
      error: "Erreur",
      paymentError: "Erreur de paiement",
      incompleteForm: "Formulaire incomplet",
      incompleteFormDesc: "Veuillez remplir tous les champs obligatoires",
      invalidAmount: "Montant invalide",
      invalidAmountDesc: "Le montant minimum est de 1 {currency}",
      recipientDetails: "Détails du destinataire",
      firstName: "Prénom",
      lastName: "Nom",
      phone: "Numéro de téléphone",
      currency: "Devise",
      amount: "Montant",
      fees: "Frais",
      totalToReceive: "Total à recevoir",
      exchangeRate: "Taux de change",
      firstNamePlaceholder: "Ex: Marie",
      lastNamePlaceholder: "Ex: Kabila",
      phonePlaceholder: "Ex: +243 123 456 789",
      selectCountryPlaceholder: "Sélectionnez le pays de destination",
      summary: "Résumé",
      squarePayment: "Paiement Square",
      transferSummary: "Résumé du transfert",
      backToForm: "Retour au formulaire",
      confirmPayment: "Confirmer et procéder au paiement",
      backToSummary: "Retour au résumé",
      inputForm: "Formulaire de saisie",
      verifyInfo: "Veuillez vérifier attentivement toutes les informations avant de procéder au paiement",
      sendingCurrency: "Devise d'envoi",
      receivingCurrency: "Devise de réception",
      deliveryMethod: "Méthode de livraison",
      mobileMoney: "Mobile Money",
      onMobilePhone: "Sur téléphone portable",
      bankAccount: "Compte bancaire",
      bankTransfer: "Virement bancaire",
      noteOptional: "Note (optionnel)",
      noteDescription: "Cette note sera transmise au destinataire",
      calculationSummary: "Résumé du calcul",
      enterAmountInfo: "Entrez le montant et sélectionnez la destination",
      calculationAppear: "Le calcul apparaîtra ici automatiquement",
      selectCountry: "Sélectionnez un pays",
      realtimePreview: "Aperçu en temps réel",
      cashWithdrawal: "Retrait d'espèces",
      transactionDetails: "Détails de la transaction",
      transferInfo: "Informations de transfert",
      sendingCountry: "Pays d'envoi",
      destinationCountry: "Pays de destination",
      amountToSend: "Montant à envoyer",
      amountRange: "Montant entre 1 et 1000 {currency}",
      amountEntered: "Montant saisi",
      serviceFees: "Frais de service",
      amountToReceive: "Montant à recevoir",
      totalToPay: "Total à payer",
      continue: "Continuer",
      recipientInfo: "Informations du destinataire",
      financialDetails: "Détails de la transaction",
    },
    services: {
      description: "Description",
      fullDetails: "Détails complets",
      available: "Disponible",
      close: "Fermer"
    },
    transfer: {
      transferMoney: "Envoyer de l'argent",
      transferDescription: "Envoyez de l'argent à vos proches rapidement et en toute sécurité.",
      transferDetails: "Détails du transfert",
      step1: "Montant",
      step2: "Bénéficiaire",
      step3: "Livraison",
      step4: "Paiement",
      amount: "Montant à envoyer",
      recipientName: "Nom du bénéficiaire",
      recipientPhone: "Téléphone du bénéficiaire",
      destinationCountry: "Pays de destination",
      selectCountry: "Sélectionnez un pays",
      deliveryMethodLabel: "Mode de réception",
      formIncomplete: "Veuillez remplir tous les champs obligatoires.",
      loginRequiredDescription: "Vous devez être connecté pour effectuer un transfert."
    },
    profile: {
      edit: "Modifier",
      save: "Enregistrer",
      firstName: "Prénom",
      lastName: "Nom",
      email: "Courriel",
      phone: "Téléphone",
      memberSince: "Membre depuis",
      updateSuccess: "Profil mis à jour",
      updateSuccessDesc: "Vos informations ont été enregistrées avec succès.",
      updateError: "Impossible de mettre à jour le profil. Veuillez réessayer.",
      tabs: {
        personal: "Informations personnelles",
        security: "Sécurité",
        payment: "Paiement",
        activity: "Activité"
      },
      personalInfo: {
        title: "Informations personnelles",
        description: "Gérez vos informations personnelles et vos coordonnées."
      },
      security: {
        title: "Sécurité",
        description: "Gérez la sécurité de votre compte et votre mot de passe.",
        password: "Mot de passe",
        passwordDesc: "Modifiez votre mot de passe pour sécuriser votre compte.",
        changePassword: "Changer le mot de passe",
        currentPassword: "Mot de passe actuel",
        newPassword: "Nouveau mot de passe",
        confirmPassword: "Confirmer le mot de passe",
        passwordChanged: "Mot de passe modifié",
        passwordChangedDesc: "Votre mot de passe a été changé avec succès.",
        passwordChangeError: "Impossible de changer le mot de passe. Vérifiez votre mot de passe actuel.",
        twoFactor: "Authentification à deux facteurs",
        twoFactorDesc: "Ajoutez une couche de sécurité supplémentaire à votre compte.",
        enableTwoFactor: "Activer l'authentification à deux facteurs",
        twoFactorEnabled: "Authentification à deux facteurs activée",
        twoFactorEnabledDesc: "Votre compte est désormais mieux protégé.",
        twoFactorError: "Impossible d'activer l'authentification à deux facteurs.",
        twoFactorActive: "Activée",
        disableTwoFactor: "Désactiver",
        enterCodeToDisable: "Entrez un code de votre application pour désactiver",
        scanQr: "Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy…), puis entrez le code à 6 chiffres pour activer.",
        manualKey: "Clé manuelle",
        enterCode: "Code à 6 chiffres",
        verifyAndEnable: "Vérifier et activer",
        twoFactorInvalidCode: "Code invalide. Veuillez réessayer.",
        twoFactorDisabled: "2FA désactivée",
        twoFactorDisabledDesc: "L'authentification à deux facteurs a été désactivée."
      },
      payment: {
        title: "Moyens de paiement",
        description: "Gérez vos moyens de paiement enregistrés.",
        noMethods: "Aucun moyen de paiement enregistré.",
        addMethod: "Ajouter un moyen de paiement",
        card: "Carte",
        expires: "Expire",
        remove: "Supprimer",
        saveCard: "Enregistrer la carte",
        cardLoadError: "Impossible de charger le formulaire de carte. Réessayez.",
        cardInvalid: "Carte invalide. Vérifiez les informations saisies.",
        cardAdded: "Carte enregistrée",
        cardAddedDesc: "Votre moyen de paiement a été ajouté avec succès.",
        cardRemoved: "Carte supprimée",
        cardRemovedDesc: "Le moyen de paiement a été retiré.",
        cardError: "Une erreur est survenue avec le moyen de paiement."
      },
      activity: {
        title: "Activité récente",
        description: "Consultez l'activité récente de votre compte.",
        lastLogin: "Dernière connexion",
        accountCreated: "Compte créé le"
      }
    },
    dashboard: {
      title: "Tableau de bord",
      greeting: "Bienvenue sur votre tableau de bord",
      stats: {
        totalSent: "Total envoyé",
        monthlyTransfers: "Transferts mensuels",
        orders: "Commandes"
      },
      quickActions: {
        newTransfer: "Nouveau transfert", 
        exploreMarketplace: "Explorer le marketplace",
        mobileRecharge: "Recharge mobile"
      },
      tabs: {
        transfers: "Transferts",
        orders: "Commandes"
      },
      transfers: {
        title: "Historique des transferts",
        filters: "Filtres",
        new: "Nouveau transfert",
        transferTo: "Transfert vers {name}",
        dateFrom: "Date de début",
        dateTo: "Date de fin",
        reset: "Réinitialiser",
        viewAll: "Voir tous les transferts ({count})",
        viewLess: "Voir les 10 plus récents",
        noTransfers: "Aucun transfert effectué",
        noTransfersText: "Vous n'avez pas encore effectué de transferts.",
        noTransfersDateText: "Aucun transfert ne correspond aux critères de date sélectionnés."
      },
      orders: {
        title: "Historique des commandes",
        orderLabel: "Commande",
        beneficiary: "Bénéficiaire",
        transactionId: "ID Transaction",
        viewDetails: "Voir les détails complets",
        details: "Détails",
        viewAll: "Voir toutes les commandes ({count})",
        viewLess: "Voir les 10 plus récentes",
        noOrders: "Aucune commande",
        noOrdersFiltered: "Aucune commande trouvée",
        noOrdersText: "Vous n'avez pas encore passé de commande sur la marketplace.",
        noOrdersDateText: "Aucune commande ne correspond aux critères de date sélectionnés."
      },
      status: {
        pending: "En attente",
        processing: "En traitement",
        completed: "Terminé",
        paid: "Payé",
        failed: "Échoué"
      }
    },
    chatbot: {
      title: "Assistant Gisabo",
      placeholder: "Tapez votre message...",
      typing: "Assistant Gisabo tape...",
      suggestions: "Suggestions :",
      clear: "Effacer",
      send: "Envoyer"
    },
    footer: {
      aboutUs: "À propos de nous",
      aboutText: "GISABO Group connecte la diaspora africaine à travers des solutions financières innovantes et un marketplace authentique.",
      quickLinks: "Liens rapides",
      services: "Services",
      contact: "Contact",
      contactUs: "Nous contacter",
      faq: "FAQ",
      support: "Support",
      helpCenter: "Centre d'aide",
      privacyPolicy: "Politique de confidentialité",
      termsOfService: "Conditions d'utilisation",
      followUs: "Suivez-nous",
      allRightsReserved: "Tous droits réservés",
    },
    howItWorks: {
      title: "Comment ça fonctionne",
      subtitle: "Découvrez notre processus simple et sécurisé pour vos transferts d'argent",
      stepsTitle: "Notre processus en 6 étapes",
      stepsSubtitle: "Un processus simple et transparent pour tous vos transferts",
      steps: {
        step1Title: "Inscription",
        step1Desc: "Créez votre compte GISABO en quelques minutes avec vos informations personnelles",
        step2Title: "Sélection du service",
        step2Desc: "Choisissez le service qui correspond à vos besoins : transfert d'argent ou marketplace",
        step3Title: "Saisie des détails",
        step3Desc: "Remplissez les informations du destinataire et le montant à envoyer",
        step4Title: "Vérification",
        step4Desc: "Vérifiez tous les détails de votre transaction avant de procéder au paiement",
        step5Title: "Paiement sécurisé",
        step5Desc: "Effectuez votre paiement via notre plateforme sécurisée Square. Vous pouvez aussi payer en 4 fois avec Afterpay",
        step6Title: "Confirmation",
        step6Desc: "Recevez la confirmation instantanée et suivez votre transaction en temps réel"
      },
      whyChooseTitle: "Pourquoi choisir GISABO",
      whyChooseSubtitle: "Les avantages qui font de nous votre partenaire de confiance",
      features: {
        speedTitle: "Rapidité",
        speedDesc: "Transferts instantanés vers l'Afrique avec confirmation immédiate",
        securityTitle: "Sécurité",
        securityDesc: "Technologie bancaire de pointe et cryptage SSL pour vos transactions",
        transparencyTitle: "Transparence",
        transparencyDesc: "Frais clairs et taux de change en temps réel, sans frais cachés",
        supportTitle: "Support 24/7",
        supportDesc: "Équipe multilingue disponible pour vous accompagner à tout moment"
      },
      faqTitle: "Questions fréquentes",
      faqSubtitle: "Trouvez rapidement les réponses à vos questions",
      ctaTitle: "Prêt à commencer ?",
      ctaSubtitle: "Rejoignez des milliers d'utilisateurs qui font confiance à GISABO",
      createAccount: "Créer un compte",
      contactUs: "Nous contacter"
    },
    contact: {
      title: "Contactez ",
      titleHighlight: "GISABO",
      subtitle: "Notre équipe est à votre écoute pour répondre à toutes vos questions sur les transferts d'argent et le marketplace.",
      contactMethodsTitle: "Nos moyens de contact",
      contactMethodsSubtitle: "Choisissez le canal qui vous convient le mieux",
      methods: {
        email: {
          title: "Courriel",
          description: "Écrivez-nous, nous répondons sous 24 heures.",
          action: "Contacter"
        },
        phone: {
          title: "Téléphone",
          description: "Appelez-nous pendant nos heures d'ouverture."
        },
        chat: {
          title: "Clavardage",
          description: "Discutez en direct avec notre équipe.",
          info: "Disponible en ligne"
        },
        address: {
          title: "Adresse",
          description: "Venez nous rencontrer à nos bureaux.",
          info: "341 Rue Jules-Bordet, Gatineau, QC, Ottawa"
        }
      },
      toast: {
        title: "Message envoyé",
        description: "Merci de nous avoir contactés. Nous vous répondrons dans les plus brefs délais."
      },
      form: {
        title: "Envoyez-nous un message",
        subtitle: "Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.",
        firstName: "Prénom",
        lastName: "Nom",
        email: "Courriel",
        phone: "Téléphone",
        subject: "Sujet",
        selectSubject: "Sélectionnez un sujet",
        urgency: "Niveau d'urgence",
        message: "Message",
        messagePlaceholder: "Décrivez votre demande en détail...",
        sending: "Envoi en cours...",
        send: "Envoyer le message",
        subjects: {
          transfer: "Transfert d'argent",
          marketplace: "Marketplace",
          account: "Mon compte",
          payment: "Paiement",
          technical: "Problème technique",
          partnership: "Partenariat",
          other: "Autre"
        },
        urgencyLevels: {
          low: "Faible",
          normal: "Normale",
          high: "Élevée",
          urgent: "Urgente"
        }
      },
      businessHours: {
        title: "Heures d'ouverture",
        monday: "Lundi - Vendredi",
        saturday: "Samedi",
        sunday: "Dimanche",
        emergency: "Support d'urgence disponible 24h/24 et 7j/7 pour les questions critiques."
      },
      faq: {
        title: "Questions fréquentes",
        transfer: "Comment effectuer un transfert d'argent ?",
        fees: "Quels sont les frais appliqués ?",
        tracking: "Comment suivre mon transfert ?",
        orderIssue: "Que faire en cas de problème avec une commande ?",
        createAccount: "Comment créer un compte ?"
      },
      emergency: {
        title: "Contact d'urgence",
        description: "Pour toute situation urgente nécessitant une assistance immédiate, contactez-nous directement."
      },
      offices: {
        title: "Nos bureaux",
        subtitle: "Retrouvez-nous à proximité de chez vous"
      }
    },
  },
  en: {
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      confirm: "Confirm",
      close: "Close",
      search: "Search",
      loginRequired: "Login required",
    },
    nav: {
      home: "Home",
      howItWorks: "How it Works",
      services: "Services",
      marketplace: "Marketplace",
      contact: "Contact",
      login: "Login",
      dashboard: "Dashboard",
      profile: "My Profile",
      logout: "Logout",
      register: "Sign up",
      welcome: "Hello",
    },
    hero: {
      title: "Your Bridge to",
      titleHighlight: "Africa",
      subtitle: "For Diaspora to stay connected with HomeLand !",
      sendMoney: "Send Money",
      exploreMarketplace: "Explore Marketplace",
      transferButton: "Make a Transfer",
      marketplaceButton: "Explore Marketplace",
      secured: "Secured",
      instant: "Instant",
      global: "Global",
      recentPayment: "Recent Payment",
      completed: "Completed",
      productName: "Product",
      meatProduct: "Butcher Meat",
      amount: "Amount",
      fees: "Fees",
      received: "Received",
      features: {
        fast: "Fast Transfers",
        secure: "Secure Platform",
        lowFees: "Low Fees",
      },
    },
    servicesSection: {
      title: "Our Services",
      subtitle: "Discover our comprehensive solutions for the African diaspora",
      loading: "Loading services...",
      comingSoon: "Services coming soon",
      imageNotAvailable: "Image not available",
      details: "View details",
      description: "Description",
      fullDetails: "Full details",
      serviceAvailable: "Service available",
      close: "Close",
      callUs: "Call us",
      writeUs: "Write us",
      noServices: "No services available",
      noServicesText: "Services will be available soon.",
      personalizedService: "Personalized Service",
      personalizedText: "Contactez-nous pour des solutions adaptées à vos besoins",
    },
    marketplace: {
      title: "Marketplace",
      viewCart: "View Cart",
      addToCart: "Add to Cart",
      outOfStock: "Out of Stock",
      startingFrom: "Starting from",
      noProducts: "No products available",
      noProductsText: "Products will be available soon.",
      orderCreated: "Order Created",
      orderSuccess: "Your order has been created successfully",
      error: "Error",
      productAdded: "Product Added",
      productAddedDesc: "{name} added to cart for {price} CAD",
      invalidPrice: "Invalid Price",
      invalidPriceDesc: "Minimum price is {min} CAD",
      emptyCart: "Empty Cart",
      emptyCartDesc: "Please add products before ordering",
      priceFrom: "Starting from",
      supportText: "Amount you wish to pay (CAD)",
      total: "Total:",
      order: "Order",
      supportMore: "Amount you wish to pay (CAD)",
      supportDescription: "You can choose to pay more to support our producers",
      cancel: "Cancel",
    },
    cart: {
      title: "Cart",
      continueShopping: "Continue Shopping",
      items: "item",
      itemsPlural: "items",
      unitPrice: "Unit price:",
      orderSummary: "Order Summary",
      subtotal: "Subtotal",
      shipping: "Shipping",
      free: "Free",
      total: "Total",
      placeOrder: "Place Order",
      termsText: "By placing your order, you agree to our terms of service.",
      emptyCart: "Your cart is empty",
      emptyCartDesc: "Browse our products and add them to your cart.",
      productRemoved: "Product removed",
      productRemovedDesc: "The product has been removed from your cart.",
      loginRequired: "Login required",
      loginRequiredDesc: "You must be logged in to place an order.",
      emptyCartError: "Empty cart",
      emptyCartErrorDesc: "Please add products before ordering.",
    },
    gisabo: {
      loginRequired: "Login Required",
      loginRequiredDesc: "You must be logged in to make a transfer",
      loginRequiredPayment: "You must be logged in to make a payment",
      error: "Error",
      paymentError: "Payment Error",
      incompleteForm: "Incomplete Form",
      incompleteFormDesc: "Please fill in all required fields",
      invalidAmount: "Invalid Amount",
      invalidAmountDesc: "Minimum amount is 1 {currency}",
      recipientDetails: "Recipient Details",
      financialDetails: "Transaction details",
      firstName: "First Name",
      lastName: "Last Name",
      phone: "Phone Number",
      currency: "Currency",
      amount: "Amount",
      fees: "Fees",
      totalToReceive: "Total to Receive",
      exchangeRate: "Exchange Rate",
      firstNamePlaceholder: "Ex: Marie",
      lastNamePlaceholder: "Ex: Kabila",
      phonePlaceholder: "Ex: +243 123 456 789",
      selectCountryPlaceholder: "Select destination country",
      summary: "Summary",
      squarePayment: "Square Payment",
      transferSummary: "Transfer Summary",
      backToForm: "Back to Form",
      confirmPayment: "Confirm and Proceed to Payment",
      backToSummary: "Back to Summary",
      inputForm: "Input Form",
      verifyInfo: "Please carefully review all information before proceeding to payment",
      sendingCurrency: "Sending Currency",
      receivingCurrency: "Receiving Currency",
      deliveryMethod: "Delivery Method",
      mobileMoney: "Mobile Money",
      onMobilePhone: "On mobile phone",
      bankAccount: "Bank Account",
      bankTransfer: "Bank transfer",
      noteOptional: "Note (optional)",
      noteDescription: "This note will be transmitted to the recipient",
      calculationSummary: "Calculation Summary",
      enterAmountInfo: "Enter amount and select destination",
      calculationAppear: "Calculation will appear here automatically",
      selectCountry: "Select a country",
      realtimePreview: "Real-time preview",
      cashWithdrawal: "Cash withdrawal",
      transactionDetails: "Transaction details",
      transferInfo: "Transfer information",
      sendingCountry: "Sending country",
      destinationCountry: "Destination country",
      amountToSend: "Amount to send",
      amountRange: "Amount between 1 and 1000 {currency}",
      amountEntered: "Amount entered",
      serviceFees: "Service fees",
      amountToReceive: "Amount to receive",
      totalToPay: "Total to pay",
      continue: "Continue",
      recipientInfo: "Recipient information",
    },
    services: {
      description: "Description",
      fullDetails: "Full details",
      available: "Available",
      close: "Close"
    },
    transfer: {
      transferMoney: "Send money",
      transferDescription: "Send money to your loved ones quickly and securely.",
      transferDetails: "Transfer details",
      step1: "Amount",
      step2: "Recipient",
      step3: "Delivery",
      step4: "Payment",
      amount: "Amount to send",
      recipientName: "Recipient name",
      recipientPhone: "Recipient phone",
      destinationCountry: "Destination country",
      selectCountry: "Select a country",
      deliveryMethodLabel: "Delivery method",
      formIncomplete: "Please fill in all required fields.",
      loginRequiredDescription: "You must be logged in to make a transfer."
    },
    profile: {
      edit: "Edit",
      save: "Save",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone",
      memberSince: "Member since",
      updateSuccess: "Profile updated",
      updateSuccessDesc: "Your information has been saved successfully.",
      updateError: "Unable to update profile. Please try again.",
      tabs: {
        personal: "Personal information",
        security: "Security",
        payment: "Payment",
        activity: "Activity"
      },
      personalInfo: {
        title: "Personal information",
        description: "Manage your personal information and contact details."
      },
      security: {
        title: "Security",
        description: "Manage your account security and password.",
        password: "Password",
        passwordDesc: "Change your password to keep your account secure.",
        changePassword: "Change password",
        currentPassword: "Current password",
        newPassword: "New password",
        confirmPassword: "Confirm password",
        passwordChanged: "Password changed",
        passwordChangedDesc: "Your password has been changed successfully.",
        passwordChangeError: "Unable to change password. Check your current password.",
        twoFactor: "Two-factor authentication",
        twoFactorDesc: "Add an extra layer of security to your account.",
        enableTwoFactor: "Enable two-factor authentication",
        twoFactorEnabled: "Two-factor authentication enabled",
        twoFactorEnabledDesc: "Your account is now better protected.",
        twoFactorError: "Unable to enable two-factor authentication.",
        twoFactorActive: "Enabled",
        disableTwoFactor: "Disable",
        enterCodeToDisable: "Enter a code from your app to disable",
        scanQr: "Scan this QR code with your authenticator app (Google Authenticator, Authy…), then enter the 6-digit code to enable.",
        manualKey: "Manual key",
        enterCode: "6-digit code",
        verifyAndEnable: "Verify and enable",
        twoFactorInvalidCode: "Invalid code. Please try again.",
        twoFactorDisabled: "2FA disabled",
        twoFactorDisabledDesc: "Two-factor authentication has been disabled."
      },
      payment: {
        title: "Payment methods",
        description: "Manage your saved payment methods.",
        noMethods: "No payment method saved.",
        addMethod: "Add a payment method",
        card: "Card",
        expires: "Expires",
        remove: "Remove",
        saveCard: "Save card",
        cardLoadError: "Unable to load the card form. Please try again.",
        cardInvalid: "Invalid card. Please check the details entered.",
        cardAdded: "Card saved",
        cardAddedDesc: "Your payment method has been added successfully.",
        cardRemoved: "Card removed",
        cardRemovedDesc: "The payment method has been removed.",
        cardError: "An error occurred with the payment method."
      },
      activity: {
        title: "Recent activity",
        description: "View your account's recent activity.",
        lastLogin: "Last login",
        accountCreated: "Account created on"
      }
    },
    dashboard: {
      title: "Dashboard",
      greeting: "Welcome to your dashboard",
      stats: {
        totalSent: "Total sent",
        monthlyTransfers: "Monthly transfers",
        orders: "Orders"
      },
      quickActions: {
        newTransfer: "New transfer", 
        exploreMarketplace: "Explore marketplace",
        mobileRecharge: "Mobile recharge"
      },
      tabs: {
        transfers: "Transfers",
        orders: "Orders"
      },
      transfers: {
        title: "Transfer history",
        filters: "Filters",
        new: "New transfer",
        transferTo: "Transfer to {name}",
        dateFrom: "From date",
        dateTo: "To date",
        reset: "Reset",
        viewAll: "View all transfers ({count})",
        viewLess: "View 10 most recent",
        noTransfers: "No transfers made",
        noTransfersText: "You haven't made any transfers yet.",
        noTransfersDateText: "No transfer matches the selected date criteria."
      },
      orders: {
        title: "Order history",
        orderLabel: "Order",
        beneficiary: "Beneficiary",
        transactionId: "Transaction ID",
        viewDetails: "View full details",
        details: "Details",
        viewAll: "View all orders ({count})",
        viewLess: "View 10 most recent",
        noOrders: "No orders",
        noOrdersFiltered: "No orders found",
        noOrdersText: "You haven't placed any order on the marketplace yet.",
        noOrdersDateText: "No order matches the selected date criteria."
      },
      status: {
        pending: "Pending",
        processing: "Processing",
        completed: "Completed",
        paid: "Paid",
        failed: "Failed"
      }
    },
    chatbot: {
      title: "Assistant Gisabo",
      placeholder: "Type your message...",
      typing: "Assistant Gisabo is typing...",
      suggestions: "Suggestions:",
      clear: "Clear",
      send: "Send"
    },
    footer: {
      aboutUs: "About Us",
      aboutText: "GISABO Group connects the African diaspora through innovative financial solutions and an authentic marketplace.",
      quickLinks: "Quick Links",
      services: "Services",
      contact: "Contact",
      contactUs: "Contact Us",
      faq: "FAQ",
      support: "Support",
      helpCenter: "Help Center",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
      followUs: "Follow Us",
      allRightsReserved: "All rights reserved",
    },
    howItWorks: {
      title: "How it Works",
      subtitle: "Discover our simple and secure process for your money transfers",
      stepsTitle: "Our 6-step process",
      stepsSubtitle: "A simple and transparent process for all your transfers",
      steps: {
        step1Title: "Registration",
        step1Desc: "Create your GISABO account in minutes with your personal information",
        step2Title: "Service Selection",
        step2Desc: "Choose the service that fits your needs: money transfer or marketplace",
        step3Title: "Enter Details",
        step3Desc: "Fill in recipient information and the amount to send",
        step4Title: "Verification",
        step4Desc: "Review all transaction details before proceeding to payment",
        step5Title: "Secure Payment",
        step5Desc: "Make your payment through our secure Square platform. You can also pay in 4 installments with Afterpay",
        step6Title: "Confirmation",
        step6Desc: "Receive instant confirmation and track your transaction in real-time"
      },
      whyChooseTitle: "Why Choose GISABO",
      whyChooseSubtitle: "The advantages that make us your trusted partner",
      features: {
        speedTitle: "Speed",
        speedDesc: "Instant transfers to Africa with immediate confirmation",
        securityTitle: "Security",
        securityDesc: "State-of-the-art banking technology and SSL encryption for your transactions",
        transparencyTitle: "Transparency",
        transparencyDesc: "Clear fees and real-time exchange rates, no hidden charges",
        supportTitle: "24/7 Support",
        supportDesc: "Multilingual team available to assist you at any time"
      },
      faqTitle: "Frequently Asked Questions",
      faqSubtitle: "Find quick answers to your questions",
      ctaTitle: "Ready to get started?",
      ctaSubtitle: "Join thousands of users who trust GISABO",
      createAccount: "Create Account",
      contactUs: "Contact Us"
    },
    contact: {
      title: "Contact ",
      titleHighlight: "GISABO",
      subtitle: "Our team is here to answer all your questions about money transfers and the marketplace.",
      contactMethodsTitle: "Ways to reach us",
      contactMethodsSubtitle: "Choose the channel that works best for you",
      methods: {
        email: {
          title: "Email",
          description: "Write to us, we reply within 24 hours.",
          action: "Contact"
        },
        phone: {
          title: "Phone",
          description: "Call us during business hours."
        },
        chat: {
          title: "Live chat",
          description: "Chat live with our team.",
          info: "Available online"
        },
        address: {
          title: "Address",
          description: "Come meet us at our offices.",
          info: "341 Rue Jules-Bordet, Gatineau, QC, Ottawa"
        }
      },
      toast: {
        title: "Message sent",
        description: "Thank you for reaching out. We will get back to you as soon as possible."
      },
      form: {
        title: "Send us a message",
        subtitle: "Fill out the form below and we'll get back to you quickly.",
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
        phone: "Phone",
        subject: "Subject",
        selectSubject: "Select a subject",
        urgency: "Urgency level",
        message: "Message",
        messagePlaceholder: "Describe your request in detail...",
        sending: "Sending...",
        send: "Send message",
        subjects: {
          transfer: "Money transfer",
          marketplace: "Marketplace",
          account: "My account",
          payment: "Payment",
          technical: "Technical issue",
          partnership: "Partnership",
          other: "Other"
        },
        urgencyLevels: {
          low: "Low",
          normal: "Normal",
          high: "High",
          urgent: "Urgent"
        }
      },
      businessHours: {
        title: "Business hours",
        monday: "Monday - Friday",
        saturday: "Saturday",
        sunday: "Sunday",
        emergency: "Emergency support available 24/7 for critical matters."
      },
      faq: {
        title: "Frequently asked questions",
        transfer: "How do I make a money transfer?",
        fees: "What fees apply?",
        tracking: "How do I track my transfer?",
        orderIssue: "What should I do if there's an issue with an order?",
        createAccount: "How do I create an account?"
      },
      emergency: {
        title: "Emergency contact",
        description: "For any urgent situation requiring immediate assistance, contact us directly."
      },
      offices: {
        title: "Our offices",
        subtitle: "Find us near you"
      }
    },
  },
};

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(globalLanguage);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => {
      setLanguage(globalLanguage);
      forceUpdate({});
    };
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const changeLanguage = (newLanguage: Language) => {
    setGlobalLanguage(newLanguage);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    const keys = key.split(".");
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof value === "string" && params) {
      return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) =>
          str.replace(`{${paramKey}}`, String(paramValue)),
        value
      );
    }

    return typeof value === "string" ? value : key;
  };

  return { language, changeLanguage, t };
}

// Initialize language from localStorage
if (typeof window !== "undefined") {
  const savedLanguage = localStorage.getItem("language") as Language;
  if (savedLanguage && (savedLanguage === "fr" || savedLanguage === "en")) {
    globalLanguage = savedLanguage;
  }
}