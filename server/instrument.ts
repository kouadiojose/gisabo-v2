// Initialisation de Sentry (monitoring d'erreurs).
// Ce module doit être importé EN PREMIER, avant tout le reste de l'app, pour
// que Sentry puisse instrumenter correctement les librairies (http, express…).
//
// Sentry est totalement OPTIONNEL : sans la variable d'environnement
// SENTRY_DSN, rien ne s'initialise et l'app fonctionne exactement comme avant.
// Aucune donnée sensible n'est envoyée (sendDefaultPii: false).
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    // Échantillonnage des traces de performance (10 %). Les erreurs, elles,
    // sont toujours capturées à 100 %.
    tracesSampleRate: 0.1,
    // Ne pas envoyer d'informations personnelles identifiables par défaut
    // (IP, cookies, corps de requête…).
    sendDefaultPii: false,
  });
  console.log("✅ Sentry initialisé (monitoring d'erreurs actif).");
} else {
  console.log(
    "ℹ️ Sentry non configuré (SENTRY_DSN absent) — monitoring désactivé.",
  );
}
