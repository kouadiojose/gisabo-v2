// ⚠️ À importer EN PREMIER : initialise Sentry avant tout le reste de l'app.
import "./instrument";
import express, { type Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();

// Derrière le proxy Railway : nécessaire pour que req.ip reflète l'IP réelle
// du client (et non celle du proxy) — indispensable au rate limiting.
app.set("trust proxy", 1);

// En-têtes de sécurité HTTP. On désactive la CSP par défaut (elle casserait
// le SPA + Square + reCAPTCHA + Font Awesome) ; à durcir plus tard avec une
// politique sur-mesure. Les autres protections (HSTS, noSniff, frameguard…)
// restent actives.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Servir les fichiers statiques depuis le dossier uploads
app.use('/uploads', express.static('uploads'));

// Rate limiting : protège les routes sensibles contre le brute-force et les
// robots. Limite par IP. Les routes de connexion/inscription/réinitialisation
// sont les plus exposées.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 tentatives / IP / fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Trop de tentatives. Réessayez dans quelques minutes.",
  },
});
const authPaths = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/login/2fa",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/admin/login",
];
for (const p of authPaths) {
  app.use(p, authLimiter);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);

      // Toute réponse 5xx d'une route API remonte à Sentry pour alerte.
      // La plupart des routes gèrent leur erreur en interne (res.status(500)
      // sans throw) : ce hook garantit qu'on est quand même alerté, avec le
      // message d'erreur réel présent dans le corps de la réponse.
      if (res.statusCode >= 500) {
        const detail =
          capturedJsonResponse && (capturedJsonResponse as any).message
            ? (capturedJsonResponse as any).message
            : "erreur serveur";
        Sentry.captureMessage(
          `HTTP ${res.statusCode} ${req.method} ${path} — ${detail}`,
          "error",
        );
      }
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Sentry : capture les erreurs remontées par Express (500) AVANT notre
  // propre gestionnaire d'erreurs. No-op si SENTRY_DSN n'est pas défini.
  Sentry.setupExpressErrorHandler(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
    
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Rappels d'échéances Afterpay : premier passage ~1 min après le démarrage,
  // puis toutes les 12 h. Idempotent (aucun doublon de rappel).
  const { processAfterpayReminders } = await import("./afterpayReminders");
  setTimeout(() => {
    processAfterpayReminders();
  }, 60 * 1000);
  setInterval(
    () => {
      processAfterpayReminders();
    },
    12 * 60 * 60 * 1000,
  );
})();
