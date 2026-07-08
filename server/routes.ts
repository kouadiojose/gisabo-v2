import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTransferSchema, insertOrderSchema, insertOrderItemSchema, insertExchangeRateSchema, insertServiceSchema, insertProductSchema, insertAdminSchema } from "@shared/schema";
import { applyAfterpayFee } from "@shared/payment-fees";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { sendTransferConfirmationEmail, sendOrderConfirmationEmail } from "./emailService";
import { chatWithGisaboAssistant, generateChatSuggestions } from "./openai";
// Utilisation de l'API REST Square directement

// 🔒 Clé d'idempotence déterministe pour Square. Elle est dérivée du token de
// paiement (unique à chaque tokenisation de carte, mais identique si le client
// renvoie exactement la même requête après un timeout/erreur réseau). Square
// déduplique alors les re-essais identiques et ne débite qu'une seule fois,
// tout en autorisant un nouvel essai légitime (nouvelle carte = nouveau token).
function buildPaymentIdempotencyKey(
  prefix: string,
  scope: string | number,
  paymentToken: string,
): string {
  const tokenHash = crypto
    .createHash("sha256")
    .update(paymentToken)
    .digest("hex")
    .slice(0, 24);
  return `${prefix}_${scope}_${tokenHash}`; // <= 45 caractères (limite Square)
}

const JWT_SECRET = process.env.JWT_SECRET || "gisabo-admin-secret-key-2024";
const SQUARE_APPLICATION_ID = process.env.SQUARE_APPLICATION_ID || "";
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || "";

// Configuration de multer pour le téléchargement d'images
// Configuration pour les images de services
const serviceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/services';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'service-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configuration pour les images de produits
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/products';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadService = multer({
  storage: serviceStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const uploadProduct = multer({
  storage: productStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

interface AuthRequest extends Request {
  user?: any;
}

// Middleware to verify JWT token
// Tolère une dérive d'horloge de ±1 pas (±30s) lors de la vérification TOTP
authenticator.options = { window: 1 };

// Retire les champs sensibles avant d'envoyer un utilisateur au client
function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, twoFactorSecret, ...safe } = user;
  return safe;
}

const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};



export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files for uploads (images)
  app.use('/uploads', express.static('uploads'));
  app.use('/assets', express.static('attached_assets'));
  

  // Health check endpoint - returns 200 immediately for Railway/hosting health checks
  const healthCheckHandler = async (req: Request, res: Response) => {
    try {
      // Test database connection
      const testResult = await storage.getServices();
      
      // Check environment variables
      const envCheck = {
        database: !!process.env.DATABASE_URL,
        square: !!process.env.SQUARE_ACCESS_TOKEN,
        openai: !!process.env.OPENAI_API_KEY,
        session: !!process.env.SESSION_SECRET
      };
      
      const allChecksPass = Array.isArray(testResult) && Object.values(envCheck).every(check => check);
      
      res.status(allChecksPass ? 200 : 503).json({
        status: allChecksPass ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        database: Array.isArray(testResult) ? "connected" : "warning",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        checks: {
          database: Array.isArray(testResult) ? "ok" : "error",
          environment: envCheck
        }
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  app.get("/health", healthCheckHandler);
  app.get("/api/health", healthCheckHandler);

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        user: { id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName },
        token,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Try to find user by email first, then by username
      let user = await storage.getUserByEmail(username);
      if (!user) {
        user = await storage.getUserByUsername(username);
      }
      
      if (!user) {
        return res.status(401).send("Identifiants invalides");
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).send("Identifiants invalides");
      }

      // Si la 2FA est activée, ne pas délivrer le token tout de suite :
      // exiger un code TOTP via un jeton d'attente de courte durée (5 min).
      if (user.twoFactorEnabled) {
        const pendingToken = jwt.sign(
          { userId: user.id, twofa: "pending" },
          JWT_SECRET,
          { expiresIn: "5m" },
        );
        return res.json({ requires2FA: true, pendingToken });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        user: { id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName },
        token,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Étape 2 de la connexion quand la 2FA est activée : vérifie le code TOTP
  app.post("/api/auth/login/2fa", async (req, res) => {
    try {
      const { pendingToken, token: code } = req.body;
      if (!pendingToken || !code) {
        return res.status(400).json({ message: "Code requis" });
      }

      let decoded: any;
      try {
        decoded = jwt.verify(pendingToken, JWT_SECRET);
      } catch {
        return res
          .status(401)
          .json({ message: "Session expirée, veuillez vous reconnecter." });
      }
      if (decoded.twofa !== "pending") {
        return res.status(401).json({ message: "Jeton invalide" });
      }

      const user = await storage.getUser(decoded.userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(401).json({ message: "2FA non configurée" });
      }

      const isValid = authenticator.verify({
        token: String(code).replace(/\s/g, ""),
        secret: user.twoFactorSecret,
      });
      if (!isValid) {
        return res.status(401).json({ message: "Code d'authentification invalide" });
      }

      const authToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        token: authToken,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    res.json({ user: sanitizeUser(req.user) });
  });

  // === 2FA (TOTP - application d'authentification) ===

  // Démarre la configuration : génère un secret + QR code (pas encore activé)
  app.post("/api/2fa/setup", authenticateToken, async (req: any, res) => {
    try {
      const secret = authenticator.generateSecret();
      const otpauthUrl = authenticator.keyuri(
        req.user.email,
        "GISABO",
        secret,
      );
      // On enregistre le secret mais 2FA reste désactivée tant que non vérifiée
      await storage.updateUser(req.user.id, {
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      });
      const qrCode = await QRCode.toDataURL(otpauthUrl);
      res.json({ qrCode, secret, otpauthUrl });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vérifie le premier code et active la 2FA
  app.post("/api/2fa/enable", authenticateToken, async (req: any, res) => {
    try {
      const { token: code } = req.body;
      if (!code) return res.status(400).json({ message: "Code requis" });

      const user = await storage.getUser(req.user.id);
      if (!user?.twoFactorSecret) {
        return res
          .status(400)
          .json({ message: "Configuration 2FA non initialisée" });
      }
      const isValid = authenticator.verify({
        token: String(code).replace(/\s/g, ""),
        secret: user.twoFactorSecret,
      });
      if (!isValid) {
        return res.status(400).json({ message: "Code invalide" });
      }
      await storage.updateUser(req.user.id, { twoFactorEnabled: true });
      res.json({ success: true, twoFactorEnabled: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Désactive la 2FA (nécessite un code TOTP valide)
  app.post("/api/2fa/disable", authenticateToken, async (req: any, res) => {
    try {
      const { token: code } = req.body;
      const user = await storage.getUser(req.user.id);
      if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
        return res.json({ success: true, twoFactorEnabled: false });
      }
      const isValid = authenticator.verify({
        token: String(code || "").replace(/\s/g, ""),
        secret: user.twoFactorSecret,
      });
      if (!isValid) {
        return res.status(400).json({ message: "Code invalide" });
      }
      await storage.updateUser(req.user.id, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });
      res.json({ success: true, twoFactorEnabled: false });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Authentication status endpoint for mobile app
  app.get("/api/auth/status", (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ authenticated: false });
    }

    try {
      jwt.verify(token, JWT_SECRET);
      res.json({ authenticated: true });
    } catch (error) {
      res.json({ authenticated: false });
    }
  });

  // Square configuration endpoint for mobile app
  app.get("/api/square-config", (req, res) => {
    res.json({
      applicationId: process.env.VITE_SQUARE_APPLICATION_ID || SQUARE_APPLICATION_ID,
      locationId: process.env.VITE_SQUARE_LOCATION_ID || process.env.SQUARE_LOCATION_ID,
    });
  });

  // Profile update route
  app.put("/api/profile", authenticateToken, async (req: any, res) => {
    try {
      const { firstName, lastName, email, phone } = req.body;
      
      const updatedUser = await storage.updateUser(req.user.id, {
        firstName,
        lastName,
        email,
        phone
      });

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(sanitizeUser(updatedUser));
    } catch (error: any) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Change password route
  app.post("/api/change-password", authenticateToken, async (req: any, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'All password fields are required' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'New passwords do not match' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, req.user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      const updatedUser = await storage.updateUser(req.user.id, {
        password: hashedNewPassword
      });

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  // Enable 2FA route (placeholder for now)
  app.post("/api/enable-2fa", authenticateToken, async (req: any, res) => {
    try {
      // For now, just return success - actual 2FA implementation would require
      // additional database fields and 2FA library integration
      res.json({ 
        message: 'Two-factor authentication enabled successfully',
        qrCode: 'placeholder-qr-code-url' 
      });
    } catch (error: any) {
      console.error('Error enabling 2FA:', error);
      res.status(500).json({ message: 'Failed to enable 2FA' });
    }
  });

  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching categories:", error.message);
      res.json([]);
    }
  });

  // Route pour servir les images téléchargées
  app.use('/uploads', express.static('uploads'));

  // Services routes (public)
  app.get("/api/services", async (req, res) => {
    try {
      const language = req.query.lang as string || 'fr'; // Default to French
      const services = await storage.getServices();

      // Only return active services for public display
      const activeServices = services.filter(service => service.isActive);

      // Transform services to include the correct language fields
      const localizedServices = activeServices.map(service => ({
        id: service.id,
        name: language === 'en' ? service.nameEn : service.nameFr,
        slug: service.slug,
        shortDescription: language === 'en' ? service.shortDescriptionEn : service.shortDescriptionFr,
        fullDescription: language === 'en' ? service.fullDescriptionEn : service.fullDescriptionFr,
        imageUrl: service.imageUrl,
        isActive: service.isActive
      }));

      res.json(localizedServices);
    } catch (error: any) {
      console.error("Error fetching services:", error.message);
      res.json([]);
    }
  });

  // Products routes
  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId } = req.query;
      const language = req.query.lang as string || 'fr'; // Default to French
      let products;
      
      if (categoryId) {
        products = await storage.getProductsByCategory(parseInt(categoryId as string));
      } else {
        products = await storage.getProducts();
      }
      
      // Transform products to include the correct language fields
      const localizedProducts = products.map(product => ({
        id: product.id,
        name: language === 'en' ? product.nameEn : product.nameFr,
        description: language === 'en' ? product.descriptionEn : product.descriptionFr,
        price: product.price,
        currency: product.currency,
        categoryId: product.categoryId,
        imageUrl: product.imageUrl,
        inStock: product.inStock,
        createdAt: product.createdAt
      }));
      
      res.json(localizedProducts);
    } catch (error: any) {
      console.error("Error fetching products:", error.message);
      res.json([]);
    }
  });



  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Transfers routes
  app.get("/api/transfers", authenticateToken, async (req: any, res) => {
    try {
      const transfers = await storage.getTransfersByUser(req.user.id);
      res.json(transfers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/transfers", authenticateToken, async (req: any, res) => {
    try {
      const transferData = insertTransferSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const transfer = await storage.createTransfer(transferData);
      res.json(transfer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Système de paiement sécurisé et robuste avec Square
  app.post("/api/transfers/:id/pay", authenticateToken, async (req: any, res) => {
    try {
      const transferId = parseInt(req.params.id);
      const { paymentToken, paymentMethod } = req.body;

      // 🔒 VALIDATION RIGOUREUSE DES DONNÉES D'ENTRÉE
      if (!transferId || isNaN(transferId)) {
        return res.status(400).json({
          message: "ID de transfert invalide",
          type: "validation_error"
        });
      }

      if (!paymentToken || typeof paymentToken !== 'string') {
        return res.status(400).json({
          message: "Token de paiement manquant ou invalide",
          type: "validation_error"
        });
      }

      const normalizedPaymentMethod: "card" | "afterpay" =
        paymentMethod === "afterpay" ? "afterpay" : "card";

      // 🔒 VÉRIFICATION DE L'EXISTENCE ET DE LA PROPRIÉTÉ DU TRANSFERT
      const transfer = await storage.getTransfer(transferId);
      if (!transfer) {
        return res.status(404).json({ 
          message: "Transfert non trouvé",
          type: "not_found_error" 
        });
      }

      if (transfer.userId !== req.user.id) {
        return res.status(403).json({ 
          message: "Accès non autorisé à ce transfert",
          type: "authorization_error" 
        });
      }

      // 🔒 VÉRIFICATION DU STATUT DU TRANSFERT (ÉVITER LES DOUBLES PAIEMENTS)
      if (transfer.status === 'completed') {
        return res.status(400).json({ 
          message: "Ce transfert a déjà été payé",
          type: "already_processed_error" 
        });
      }

      // 🔒 VALIDATION DES VARIABLES D'ENVIRONNEMENT SQUARE
      if (!process.env.SQUARE_ACCESS_TOKEN) {
        console.error('🚨 SQUARE_ACCESS_TOKEN manquant');
        return res.status(500).json({ 
          message: "Configuration de paiement manquante",
          type: "configuration_error" 
        });
      }

      const squareEnvironment = process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
      const baseUrl = squareEnvironment === 'production' 
        ? 'https://connect.squareup.com' 
        : 'https://connect.squareupsandbox.com';

      // 🔒 CLÉ D'IDEMPOTENCE DÉTERMINISTE (anti double débit)
      // Basée sur le token: un re-essai identique est dédupliqué par Square.
      const idempotencyKey = buildPaymentIdempotencyKey("tr", transferId, paymentToken);

      // 🔒 CONVERSION ET VALIDATION DU MONTANT
      // Apply Afterpay processing fee server-side so the client cannot bypass it
      const transferAmount = parseFloat(transfer.amount);
      const chargeAmount = normalizedPaymentMethod === "afterpay"
        ? applyAfterpayFee(transferAmount)
        : transferAmount;
      const amountInCents = Math.round(chargeAmount * 100);
      if (amountInCents <= 0 || amountInCents > 100000000) { // Max 1M USD/CAD/EUR
        return res.status(400).json({
          message: "Montant de transfert invalide",
          type: "amount_validation_error"
        });
      }

      // 🔒 PRÉPARATION DE LA REQUÊTE DE PAIEMENT SÉCURISÉE
      const paymentRequest = {
        sourceId: paymentToken,
        idempotencyKey: idempotencyKey,
        amountMoney: {
          amount: amountInCents,
          currency: transfer.currency,
        },
        locationId: process.env.SQUARE_LOCATION_ID,
        note: `Transfert d'argent - Bénéficiaire: ${transfer.recipientName}`,
        autocomplete: true,
        buyerEmailAddress: req.user.email,
        referenceId: `transfer_${transferId}`,
      };

      console.log(`💳 [PAIEMENT SÉCURISÉ] Tentative pour transfert ${transferId} - Montant: ${transfer.amount} ${transfer.currency}`);

      try {
        // 🔒 EXÉCUTION DU PAIEMENT VIA API REST SQUARE
        const response = await fetch(`${baseUrl}/v2/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'Square-Version': '2023-10-18'
          },
          body: JSON.stringify({
            source_id: paymentToken,
            idempotency_key: idempotencyKey,
            amount_money: {
              amount: amountInCents,
              currency: transfer.currency,
            },
            location_id: process.env.SQUARE_LOCATION_ID,
            note: `Transfert d'argent - Bénéficiaire: ${transfer.recipientName}`,
            autocomplete: true,
            buyer_email_address: req.user.email,
            reference_id: `transfer_${transferId}`,
          })
        });

        const result = await response.json();
        // Log only payment status, not full response
        
        if (response.ok && result.payment) {
          const payment = result.payment;
          
          console.log(`✅ [PAIEMENT RÉUSSI] ID Square: ${payment.id}`);
          
          // 🔒 MISE À JOUR SÉCURISÉE DU STATUT DU TRANSFERT
          const updatedTransfer = await storage.updateTransferStatus(
            transferId,
            "completed",
            payment.id
          );

          // 🔒 RÉPONSE DE SUCCÈS IMMÉDIATE (ne pas attendre l'email : le client
          // ne doit jamais rester bloqué sur l'écran de paiement à cause d'un
          // envoi d'email lent).
          res.json({
            success: true,
            message: "Paiement traité avec succès",
            transfer: {
              id: updatedTransfer?.id,
              status: updatedTransfer?.status,
              amount: updatedTransfer?.amount,
              currency: updatedTransfer?.currency,
              recipientName: updatedTransfer?.recipientName
            },
            paymentId: payment.id,
            timestamp: new Date().toISOString()
          });

          console.log(`🎉 [TRANSFERT COMPLÉTÉ] ${transferId} avec succès`);

          // 📧 ENVOI D'EMAIL DE CONFIRMATION EN ARRIÈRE-PLAN (fire-and-forget)
          if (updatedTransfer) {
            const paymentMethod = payment.source_type === 'BUY_NOW_PAY_LATER' ? 'afterpay' : 'card';
            sendTransferConfirmationEmail(
              updatedTransfer,
              req.user,
              payment.id,
              paymentMethod
            )
              .then((emailSent) => {
                console.log(
                  emailSent
                    ? `✅ [EMAIL] Confirmation envoyée pour le transfert ${transferId}`
                    : `⚠️ [EMAIL] Échec d'envoi pour le transfert ${transferId}`
                );
              })
              .catch((emailError) => {
                console.error(`❌ [EMAIL] Erreur lors de l'envoi:`, emailError);
              });
          }
          return;
        } else {
          console.error('🚨 [PAIEMENT] Réponse Square invalide:', result);
          res.status(400).json({ 
            message: result.errors?.[0]?.detail || "Le paiement n'a pas pu être traité",
            type: "payment_error",
            details: result.errors
          });
          return;
        }
      } catch (squareError: any) {
        console.error('🚨 [ERREUR SQUARE API]:', {
          transferId,
          userId: req.user.id,
          error: squareError.result || squareError.message || squareError
        });
        
        // 🔒 GESTION SOPHISTIQUÉE DES ERREURS SQUARE
        let errorMessage = "Erreur lors du traitement du paiement";
        let errorType = "payment_processing_error";
        
        if (squareError.result?.errors) {
          const squareErrorDetail = squareError.result.errors[0];
          
          switch (squareErrorDetail.code) {
            case 'CARD_DECLINED':
              errorMessage = "Votre carte a été refusée. Veuillez vérifier vos informations ou utiliser une autre carte.";
              errorType = "card_declined";
              break;
            case 'INSUFFICIENT_FUNDS':
              errorMessage = "Fonds insuffisants sur votre carte.";
              errorType = "insufficient_funds";
              break;
            case 'CVV_FAILURE':
              errorMessage = "Code de sécurité (CVV) incorrect.";
              errorType = "cvv_failure";
              break;
            case 'ADDRESS_VERIFICATION_FAILURE':
              errorMessage = "L'adresse de facturation ne correspond pas.";
              errorType = "address_verification_failure";
              break;
            case 'INVALID_EXPIRATION':
              errorMessage = "Date d'expiration de la carte invalide.";
              errorType = "invalid_expiration";
              break;
            case 'GENERIC_DECLINE':
              errorMessage = "Transaction refusée par votre banque. Contactez votre banque pour plus d'informations.";
              errorType = "generic_decline";
              break;
            default:
              errorMessage = squareErrorDetail.detail || "Erreur de traitement du paiement";
          }
        }
        
        return res.status(400).json({ 
          message: errorMessage,
          type: errorType,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error: any) {
      console.error('🚨 [ERREUR SYSTÈME CRITIQUE]:', {
        transferId: req.params.id,
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({ 
        message: "Erreur système lors du traitement du paiement. Veuillez réessayer.",
        type: "system_error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Orders routes
  app.get("/api/orders", authenticateToken, async (req: any, res) => {
    try {
      const orders = await storage.getOrdersByUser(req.user.id);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/:id/items", authenticateToken, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order || order.userId !== req.user.id) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const items = await storage.getOrderItems(orderId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders", authenticateToken, async (req: any, res) => {
    try {
      const { items, customerInfo, shippingAddress, paymentToken, paymentMethod } = req.body;

      // Use customerInfo if provided, otherwise fallback to shippingAddress for backward compatibility
      const addressData = customerInfo || shippingAddress || {
        firstName: 'Non spécifié',
        lastName: 'Non spécifié',
        phone: 'Non spécifié',
        note: ''
      };

      // Calculate total
      let total = 0;
      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Product ${item.productId} not found` });
        }

        // Use custom price if provided, otherwise use product price
        const itemPrice = item.customPrice ? parseFloat(item.customPrice.toString()) : parseFloat(product.price);
        total += itemPrice * item.quantity;
      }

      // Apply Afterpay processing fee server-side so the client cannot bypass it
      if (paymentMethod === "afterpay") {
        total = applyAfterpayFee(total);
      }

      // Helper: persiste la commande + ses lignes
      const createOrderWithItems = async () => {
        const order = await storage.createOrder({
          userId: req.user.id,
          total: total.toString(),
          currency: "CAD",
          shippingAddress: addressData,
        });
        for (const item of items) {
          const product = await storage.getProduct(item.productId);
          const itemPrice = item.customPrice ? item.customPrice.toString() : product!.price;
          await storage.createOrderItem({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: itemPrice,
          });
        }
        return order;
      };

      // Sans token de paiement : créer une commande en attente (rétrocompatibilité)
      if (!paymentToken) {
        const order = await createOrderWithItems();
        return res.json(order);
      }

      // Avec token : ON PAIE D'ABORD, puis on crée la commande seulement si le
      // paiement réussit. Évite les commandes orphelines en cas d'échec.
      try {
        const squareEnvironment = process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
        const baseUrl = squareEnvironment === 'production'
          ? 'https://connect.squareup.com'
          : 'https://connect.squareupsandbox.com';

        // 🔒 Clé d'idempotence déterministe (anti double débit) basée sur le token.
        const idempotencyKey = buildPaymentIdempotencyKey("or", req.user.id, paymentToken);
        const amountInCents = Math.round(total * 100);

        console.log(`💳 [PAIEMENT COMMANDE] Tentative - Client ${req.user.id} - Montant: ${total} CAD`);

        const response = await fetch(`${baseUrl}/v2/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'Square-Version': '2023-10-18'
          },
          body: JSON.stringify({
            source_id: paymentToken,
            idempotency_key: idempotencyKey,
            amount_money: {
              amount: amountInCents,
              currency: "CAD",
            },
            location_id: process.env.SQUARE_LOCATION_ID,
            note: `Achat de produits - Client ${req.user.id}`,
            autocomplete: true,
            buyer_email_address: req.user.email,
            reference_id: `order_user_${req.user.id}`,
          })
        });

        const result = await response.json();

        if (response.ok && result.payment) {
          const payment = result.payment;
          console.log(`✅ [PAIEMENT COMMANDE RÉUSSI] ID Square: ${payment.id}`);

          // 🔒 Idempotence applicative : si une commande existe déjà pour ce
          // paiement (re-essai dédupliqué par Square), la renvoyer sans doublon.
          const existingOrder = await storage.getOrderBySquarePaymentId(payment.id);
          if (existingOrder) {
            console.log(`♻️ [COMMANDE EXISTANTE] ${existingOrder.id} pour le paiement ${payment.id}`);
            return res.json(existingOrder);
          }

          // Créer la commande maintenant que le paiement est confirmé
          const order = await createOrderWithItems();
          const updatedOrder = await storage.updateOrderStatus(order.id, "processing", payment.id);
          const orderItems = await storage.getOrderItems(order.id);

          console.log(`🎉 [COMMANDE PAYÉE] ${order.id} avec succès`);

          // Répondre immédiatement, puis envoyer l'email en arrière-plan
          // (fire-and-forget) pour ne pas bloquer le client.
          res.json(updatedOrder);

          if (updatedOrder) {
            sendOrderConfirmationEmail(updatedOrder, req.user, orderItems, payment.id)
              .then(() => {
                console.log(`📧 Email de confirmation envoyé pour la commande ${order.id}`);
              })
              .catch((emailError) => {
                console.error(`❌ Erreur envoi email commande ${order.id}:`, emailError);
              });
          }
          return;
        } else {
          console.error('🚨 [PAIEMENT COMMANDE] Réponse Square invalide:', result);
          return res.status(400).json({
            message: result.errors?.[0]?.detail || "Le paiement n'a pas pu être traité",
            type: "payment_error",
            details: result.errors
          });
        }
      } catch (squareError: any) {
        console.error('🚨 [ERREUR SQUARE API COMMANDE]:', squareError);

        let errorMessage = "Erreur lors du traitement du paiement";
        if (squareError.result?.errors) {
          const squareErrorDetail = squareError.result.errors[0];
          errorMessage = squareErrorDetail.detail || errorMessage;
        }

        return res.status(500).json({
          message: errorMessage,
          type: "payment_processing_error",
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error("Order creation error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/orders/:id/pay", authenticateToken, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { paymentToken } = req.body;

      const order = await storage.getOrder(orderId);
      if (!order || order.userId !== req.user.id) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Configuration Square
      const squareEnvironment = process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
      const baseUrl = squareEnvironment === 'production' 
        ? 'https://connect.squareup.com' 
        : 'https://connect.squareupsandbox.com';

      // Génération d'une clé d'idempotence unique
      // 🔒 Clé d'idempotence déterministe (anti double débit) basée sur le token.
      const idempotencyKey = buildPaymentIdempotencyKey("or", orderId, paymentToken);

      // Conversion du montant en centimes
      const amountInCents = Math.round(parseFloat(order.total) * 100);

      console.log(`💳 [PAIEMENT COMMANDE] Tentative pour commande ${orderId} - Montant: ${order.total} ${order.currency}`);

      try {
        // Appel à l'API Square
        const response = await fetch(`${baseUrl}/v2/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'Square-Version': '2023-10-18'
          },
          body: JSON.stringify({
            source_id: paymentToken,
            idempotency_key: idempotencyKey,
            amount_money: {
              amount: amountInCents,
              currency: order.currency,
            },
            location_id: process.env.SQUARE_LOCATION_ID,
            note: `Achat de produits - Commande #${orderId}`,
            autocomplete: true,
            buyer_email_address: req.user.email,
            reference_id: `order_${orderId}`,
          })
        });

        const result = await response.json();
        // Log only payment status, not full response
        
        if (response.ok && result.payment) {
          const payment = result.payment;
          
          console.log(`✅ [PAIEMENT COMMANDE RÉUSSI] ID Square: ${payment.id}`);
          
          // Mise à jour du statut de la commande
          const updatedOrder = await storage.updateOrderStatus(
            orderId,
            "processing",
            payment.id
          );

          res.json({ 
            success: true, 
            message: "Paiement traité avec succès",
            order: updatedOrder,
            paymentId: payment.id,
            timestamp: new Date().toISOString()
          });
          
          console.log(`🎉 [COMMANDE PAYÉE] ${orderId} avec succès`);
          return;
        } else {
          console.error('🚨 [PAIEMENT COMMANDE] Réponse Square invalide:', result);
          res.status(400).json({ 
            message: result.errors?.[0]?.detail || "Le paiement n'a pas pu être traité",
            type: "payment_error",
            details: result.errors
          });
          return;
        }
      } catch (squareError: any) {
        console.error('🚨 [ERREUR SQUARE API COMMANDE]:', squareError);
        
        let errorMessage = "Erreur lors du traitement du paiement";
        if (squareError.result?.errors) {
          const squareErrorDetail = squareError.result.errors[0];
          errorMessage = squareErrorDetail.detail || errorMessage;
        }
        
        return res.status(500).json({ 
          message: errorMessage,
          type: "payment_processing_error",
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error("Order payment error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Exchange rates (mock endpoint)
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const { from, to } = req.query;
      
      if (!from || !to) {
        return res.status(400).json({ message: "Les paramètres 'from' et 'to' sont requis" });
      }

      // Récupérer le taux de change depuis la base de données
      const exchangeRate = await storage.getExchangeRate(from as string, to as string);
      
      if (!exchangeRate) {
        return res.status(404).json({ 
          message: `Taux de change non trouvé pour ${from} vers ${to}` 
        });
      }

      res.json({ 
        rate: parseFloat(exchangeRate.rate), 
        from: exchangeRate.fromCurrency, 
        to: exchangeRate.toCurrency,
        id: exchangeRate.id,
        updatedAt: exchangeRate.updatedAt
      });
    } catch (error: any) {
      console.error("Erreur lors de la récupération du taux de change:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Image upload route (général)
  app.post("/api/upload", uploadService.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      const imageUrl = `/uploads/services/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Authentication Routes
  app.post("/api/admin/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const admin = await storage.getAdminByUsername(username);
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, admin.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!admin.isActive) {
        return res.status(401).json({ message: "Account deactivated" });
      }

      const token = jwt.sign(
        { adminId: admin.id, username: admin.username, role: admin.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      await storage.updateAdminLastLogin(admin.id);

      res.json({
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin middleware - check if user is admin
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Admin access token required' });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      // Token decoded successfully
      
      const admin = await storage.getAdmin(decoded.adminId);
      console.log('Found admin:', admin ? 'Yes' : 'No', 'for ID:', decoded.adminId); // Debug log
      
      if (!admin) {
        return res.status(401).json({ message: 'Invalid admin token' });
      }

      (req as any).admin = admin;
      next();
    } catch (error) {
      console.error('Token verification error');
      return res.status(403).json({ message: 'Invalid admin token' });
    }
  };

  // Admin login route
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const admin = await storage.getAdminByUsername(username);
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await storage.updateAdminLastLogin(admin.id);

      // Generate JWT token
      const token = jwt.sign(
        { id: admin.id, username: admin.username, isAdmin: true },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({ token, admin: { id: admin.id, username: admin.username, email: admin.email } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin routes - Exchange Rates Management
  app.get("/api/admin/exchange-rates", requireAdmin, async (req: any, res) => {
    try {
      const rates = await storage.getExchangeRates();
      res.json(rates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Enregistrement d'une visite (public, léger, anonyme)
  app.post("/api/track/visit", async (req: any, res) => {
    try {
      const { visitorId, path, referrer } = req.body || {};
      if (!visitorId || typeof visitorId !== "string") {
        return res.status(400).json({ message: "visitorId requis" });
      }
      const rawIp =
        (req.headers["x-forwarded-for"]?.toString().split(",")[0] || "").trim() ||
        req.socket?.remoteAddress ||
        "";
      const ipHash = rawIp
        ? crypto.createHash("sha256").update(rawIp).digest("hex")
        : null;

      await storage.recordVisit({
        visitorId: visitorId.slice(0, 100),
        path: typeof path === "string" ? path.slice(0, 300) : null,
        referrer: typeof referrer === "string" ? referrer.slice(0, 300) : null,
        userAgent: (req.headers["user-agent"] || "").toString().slice(0, 400),
        ipHash,
      });
      res.json({ success: true });
    } catch (error: any) {
      // Ne jamais casser l'expérience visiteur pour un souci d'analytics
      res.status(200).json({ success: false });
    }
  });

  // Statistiques de visites (vue admin)
  app.get("/api/admin/visit-stats", requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getVisitStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Liste de TOUS les transferts (vue admin)
  app.get("/api/admin/transfers", requireAdmin, async (req: any, res) => {
    try {
      const allTransfers = await storage.getAllTransfers();
      res.json(allTransfers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Liste de TOUTES les commandes / achats de produits (vue admin)
  app.get("/api/admin/orders", requireAdmin, async (req: any, res) => {
    try {
      const allOrders = await storage.getAllOrders();
      res.json(allOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Renvoi manuel de la notification email d'un transfert (vue admin)
  app.post(
    "/api/admin/transfers/:id/resend-notification",
    requireAdmin,
    async (req: any, res) => {
      try {
        const transferId = parseInt(req.params.id);
        const transfer = await storage.getTransfer(transferId);
        if (!transfer) {
          return res.status(404).json({ message: "Transfert introuvable" });
        }
        const user = await storage.getUser(transfer.userId);
        if (!user) {
          return res
            .status(404)
            .json({ message: "Client associé introuvable" });
        }
        const paymentMethod =
          transfer.deliveryMethod === "afterpay" ? "afterpay" : "card";
        const sent = await sendTransferConfirmationEmail(
          transfer,
          user,
          transfer.squarePaymentId || "N/A",
          paymentMethod,
        );
        if (!sent) {
          return res
            .status(502)
            .json({ message: "L'envoi de l'email a échoué" });
        }
        console.log(
          `📧 [ADMIN] Notification renvoyée pour le transfert ${transferId}`,
        );
        res.json({ success: true, message: "Notification renvoyée" });
      } catch (error: any) {
        console.error("❌ [ADMIN] Renvoi notification transfert:", error);
        res.status(500).json({ message: error.message });
      }
    },
  );

  // Renvoi manuel de la notification email d'une commande (vue admin)
  app.post(
    "/api/admin/orders/:id/resend-notification",
    requireAdmin,
    async (req: any, res) => {
      try {
        const orderId = parseInt(req.params.id);
        const order = await storage.getOrder(orderId);
        if (!order) {
          return res.status(404).json({ message: "Commande introuvable" });
        }
        const user = await storage.getUser(order.userId);
        if (!user) {
          return res
            .status(404)
            .json({ message: "Client associé introuvable" });
        }
        const orderItems = await storage.getOrderItems(order.id);
        await sendOrderConfirmationEmail(
          order,
          user,
          orderItems,
          order.squarePaymentId || "N/A",
        );
        console.log(
          `📧 [ADMIN] Notification renvoyée pour la commande ${orderId}`,
        );
        res.json({ success: true, message: "Notification renvoyée" });
      } catch (error: any) {
        console.error("❌ [ADMIN] Renvoi notification commande:", error);
        res.status(500).json({ message: error.message });
      }
    },
  );

  app.post("/api/admin/exchange-rates", requireAdmin, async (req: any, res) => {
    try {
      const rateData = insertExchangeRateSchema.parse(req.body);
      const rate = await storage.createExchangeRate(rateData);
      res.status(201).json(rate);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/exchange-rates/:id", requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const rateData = insertExchangeRateSchema.parse(req.body);
      const rate = await storage.updateExchangeRate(id, rateData);
      if (!rate) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }
      res.json(rate);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/exchange-rates/:id", requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteExchangeRate(id);
      if (!deleted) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }
      res.json({ message: "Exchange rate deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin routes - Services Management
  app.get("/api/admin/services", requireAdmin, async (req: any, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin products route - returns full multilingual data
  app.get("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Route pour télécharger une image de service (stockage base64)
  app.post("/api/admin/upload-service-image", requireAdmin, uploadService.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      // Convertir l'image en base64
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;
      
      // Supprimer le fichier temporaire
      fs.unlinkSync(req.file.path);
      
      res.json({ imageUrl: base64Image });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Route pour télécharger une image de produit (stockage base64)
  app.post("/api/admin/upload-image", requireAdmin, uploadProduct.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      // Convertir l'image en base64
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;
      
      // Supprimer le fichier temporaire
      fs.unlinkSync(req.file.path);
      
      res.json({ imageUrl: base64Image });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/services", requireAdmin, async (req: any, res) => {
    try {
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      res.status(201).json(service);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/services/:id", requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const serviceData = insertServiceSchema.parse(req.body);
      
      // Si une ancienne image existe et qu'on la remplace, on pourrait la supprimer
      // mais pour simplifier, on garde toutes les images
      
      const service = await storage.updateService(id, serviceData);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/services/:id", requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteService(id);
      if (!deleted) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json({ message: "Service deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin Product Management Routes
  app.post("/api/admin/products", requireAdmin, async (req: any, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/products/:id", requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const productData = insertProductSchema.parse(req.body);
      
      const product = await storage.updateProduct(id, productData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ message: "Product deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Initialize default admin account and categories
  app.post("/api/init", async (req, res) => {
    try {
      // Initialize default admin if none exists
      const existingAdmin = await storage.getAdminByUsername("admin");
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await storage.createAdmin({
          username: "admin",
          email: "admin@gisabo.com",
          password: hashedPassword,
          firstName: "Admin",
          lastName: "Gisabo",
          role: "admin",
          isActive: true,
        });
      }

      // Initialize default categories if none exist
      const existingCategories = await storage.getCategories();
      if (existingCategories.length === 0) {
        const defaultCategories = [
          { name: "Alimentation", slug: "food", icon: "fas fa-seedling", color: "green" },
          { name: "Viande & Poisson", slug: "meat", icon: "fas fa-fish", color: "red" },
          { name: "Épices & Condiments", slug: "spices", icon: "fas fa-pepper-hot", color: "orange" },
          { name: "Éducation", slug: "education", icon: "fas fa-graduation-cap", color: "blue" },
          { name: "Téléphonie", slug: "telecom", icon: "fas fa-mobile-alt", color: "purple" },
          { name: "Transport", slug: "transport", icon: "fas fa-bus", color: "yellow" },
        ];

        for (const category of defaultCategories) {
          await storage.createCategory(category);
        }
      }

      res.json({ message: "Admin and categories initialized" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mobile app web version
  app.get('/mobile', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GISABO Mobile</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; min-height: 100vh; }
        .header { background: #FF6B35; color: white; padding: 60px 20px 30px; text-align: center; }
        .header h1 { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .header p { font-size: 16px; opacity: 0.9; }
        .nav { background: white; display: flex; border-radius: 10px; margin: -20px 20px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .nav-item { flex: 1; padding: 15px; text-align: center; background: white; border: none; cursor: pointer; font-size: 14px; transition: background 0.3s; }
        .nav-item.active { background: #FFF5F1; color: #FF6B35; }
        .content { padding: 20px; }
        .section { background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; }
        .product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .product-card { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .product-image { height: 100px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 32px; }
        .product-info { padding: 12px; }
        .product-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
        .product-price { font-size: 16px; color: #FF6B35; font-weight: bold; }
        .form-group { display: flex; flex-direction: column; margin-bottom: 15px; }
        .form-label { font-size: 14px; color: #333; margin-bottom: 5px; font-weight: 600; }
        .form-input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; background: #f9f9f9; }
        .btn-primary { background: #FF6B35; color: white; padding: 15px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 20px; width: 100%; }
        .hidden { display: none; }
        .api-status { background: #e8f5e8; border: 1px solid #4CAF50; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        .api-status h3 { color: #4CAF50; margin-bottom: 10px; }
        .api-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #ddd; }
        .status-success { color: #4CAF50; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>GISABO</h1>
        <p>Votre pont vers l'Afrique</p>
    </div>
    
    <div class="nav">
        <button class="nav-item active" onclick="showSection('dashboard')">📊 Dashboard</button>
        <button class="nav-item" onclick="showSection('transfer')">💸 Transfert</button>
        <button class="nav-item" onclick="showSection('marketplace')">🛒 Marketplace</button>
        <button class="nav-item" onclick="showSection('profile')">👤 Profil</button>
    </div>
    
    <div class="content">
        <div class="api-status">
            <h3>État de connexion API</h3>
            <div id="api-status-content">Chargement...</div>
        </div>
        
        <div id="dashboard-section" class="section-container">
            <div class="section">
                <div class="section-title">Bienvenue sur GISABO Mobile</div>
                <p>Application mobile connectée à votre backend en temps réel</p>
                <div style="margin-top: 20px;">
                    <button class="nav-item" onclick="showSection('transfer')" style="margin: 5px; display: inline-block;">💸 Nouveau transfert</button>
                    <button class="nav-item" onclick="showSection('marketplace')" style="margin: 5px; display: inline-block;">🛒 Marketplace</button>
                </div>
            </div>
        </div>
        
        <div id="transfer-section" class="section-container hidden">
            <div class="section">
                <div class="section-title">Nouveau transfert</div>
                <div class="form-group">
                    <label class="form-label">Nom du destinataire</label>
                    <input type="text" class="form-input" placeholder="Ex: Marie Kabila" id="recipient-name">
                </div>
                <div class="form-group">
                    <label class="form-label">Montant (CAD)</label>
                    <input type="number" class="form-input" placeholder="0.00" id="transfer-amount" oninput="calculateTransfer()">
                </div>
                <div class="form-group">
                    <label class="form-label">Pays: Burundi (BIF)</label>
                    <div id="transfer-summary" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Taux de change:</span>
                            <span id="exchange-rate">Chargement...</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Montant reçu:</span>
                            <span id="summary-received">0 BIF</span>
                        </div>
                    </div>
                </div>
                <button class="btn-primary" onclick="processTransfer()">Continuer vers le paiement</button>
            </div>
        </div>
        
        <div id="marketplace-section" class="section-container hidden">
            <div class="section">
                <div class="section-title">Marketplace</div>
                <div class="product-grid" id="products-grid">
                    <div style="grid-column: 1/-1; text-align: center; padding: 20px;">Chargement des produits...</div>
                </div>
            </div>
        </div>
        
        <div id="profile-section" class="section-container hidden">
            <div class="section">
                <div class="section-title">Mon Profil</div>
                <p>Version mobile de GISABO</p>
                <p style="margin-top: 10px;">✅ Connectée au backend</p>
                <p>✅ Données authentiques</p>
                <p>✅ API fonctionnelle</p>
            </div>
        </div>
    </div>

    <script>
        const API_BASE = window.location.origin;
        let exchangeRate = 2650;

        function showSection(section) {
            document.querySelectorAll('.section-container').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            
            document.getElementById(section + '-section').classList.remove('hidden');
            event.target.classList.add('active');
            
            if (section === 'marketplace') loadProducts();
            if (section === 'transfer') loadExchangeRate();
        }

        async function testApiConnection() {
            const endpoints = [
                { name: 'Services', url: '/api/services' },
                { name: 'Catégories', url: '/api/categories' },
                { name: 'Produits', url: '/api/products' },
                { name: 'Taux de change', url: '/api/exchange-rates?from=CAD&to=BIF' }
            ];

            let statusHtml = '';
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(API_BASE + endpoint.url);
                    if (response.ok) {
                        const data = await response.json();
                        const count = Array.isArray(data) ? data.length : 'OK';
                        statusHtml += \`<div class="api-item"><span>\${endpoint.name}</span><span class="status-success">✅ \${count}</span></div>\`;
                    } else {
                        statusHtml += \`<div class="api-item"><span>\${endpoint.name}</span><span>❌ \${response.status}</span></div>\`;
                    }
                } catch (error) {
                    statusHtml += \`<div class="api-item"><span>\${endpoint.name}</span><span>❌ Erreur</span></div>\`;
                }
            }
            document.getElementById('api-status-content').innerHTML = statusHtml;
        }

        async function loadProducts() {
            try {
                const response = await fetch(API_BASE + '/api/products');
                const products = await response.json();
                
                let html = '';
                products.slice(0, 6).forEach(product => {
                    html += \`
                        <div class="product-card">
                            <div class="product-image">📦</div>
                            <div class="product-info">
                                <div class="product-name">\${product.name || product.nameFr || 'Produit'}</div>
                                <div class="product-price">\${product.price} \${product.currency}</div>
                            </div>
                        </div>
                    \`;
                });
                document.getElementById('products-grid').innerHTML = html;
            } catch (error) {
                document.getElementById('products-grid').innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Erreur de chargement</div>';
            }
        }

        async function loadExchangeRate() {
            try {
                const response = await fetch(API_BASE + '/api/exchange-rates?from=CAD&to=BIF');
                if (response.ok) {
                    const data = await response.json();
                    exchangeRate = data.rate;
                    document.getElementById('exchange-rate').textContent = \`1 CAD = \${exchangeRate} BIF\`;
                    calculateTransfer();
                }
            } catch (error) {
                document.getElementById('exchange-rate').textContent = '1 CAD = 2650 BIF (défaut)';
            }
        }

        function calculateTransfer() {
            const amount = parseFloat(document.getElementById('transfer-amount').value) || 0;
            const received = amount * exchangeRate;
            document.getElementById('summary-received').textContent = \`\${received.toFixed(0)} BIF\`;
        }

        function processTransfer() {
            const recipientName = document.getElementById('recipient-name').value;
            const amount = document.getElementById('transfer-amount').value;

            if (!recipientName || !amount) {
                alert('Veuillez remplir tous les champs');
                return;
            }

            alert(\`Transfert préparé:\\n- Destinataire: \${recipientName}\\n- Montant: \${amount} CAD\\n- Reçu: \${(amount * exchangeRate).toFixed(0)} BIF\\n\\nVotre application mobile fonctionne parfaitement !\`);
        }

        document.addEventListener('DOMContentLoaded', () => {
            testApiConnection();
            loadExchangeRate();
        });
    </script>
</body>
</html>`);
  });

  // Chatbot API Routes - Assistant Gisabo
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      const response = await chatWithGisaboAssistant(message, conversationHistory || []);
      res.json({ response });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Erreur lors du traitement de votre message" });
    }
  });

  app.get("/api/chat/suggestions", async (req, res) => {
    try {
      const suggestions = await generateChatSuggestions();
      res.json({ suggestions });
    } catch (error: any) {
      console.error("Suggestions error:", error);
      res.json({ suggestions: [] });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
