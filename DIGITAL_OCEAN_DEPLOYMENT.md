# 🌊 Guide de Déploiement Digital Ocean App Platform - GISABO

## 📋 Prérequis

1. **Compte Digital Ocean** avec accès à App Platform
2. **Code pushé sur GitHub** : https://github.com/yeoyedjande/gisabo-v2
3. **Tokens et clés API** prêts à configurer

## 🚀 Étapes de Déploiement

### Étape 1: Créer l'App sur Digital Ocean

1. Connectez-vous à votre tableau de bord Digital Ocean
2. Allez dans **Apps** → **Create App**
3. Sélectionnez **GitHub** comme source
4. Choisissez votre repository : `yeoyedjande/gisabo-v2`
5. Sélectionnez la branche `main`

### Étape 2: Configuration automatique

Le fichier `.do/app.yaml` est déjà configuré et sera détecté automatiquement par Digital Ocean.

### Étape 3: Configurer les Variables d'Environnement

Dans l'interface App Platform, ajoutez ces variables d'environnement :

```bash
# 🗄️ BASE DE DONNÉES (sera fournie automatiquement par Digital Ocean)
DATABASE_URL=${gisabo-db.DATABASE_URL}

# 💳 SQUARE PAYMENT (PRODUCTION)
SQUARE_ACCESS_TOKEN=votre_token_production_square
SQUARE_APPLICATION_ID=votre_app_id_square
SQUARE_LOCATION_ID=votre_location_id_square
SQUARE_ENVIRONMENT=production
VITE_SQUARE_APPLICATION_ID=votre_app_id_square
VITE_SQUARE_LOCATION_ID=votre_location_id_square

# 🤖 OPENAI (pour Assistant Gisabo)
OPENAI_API_KEY=votre_openai_api_key

# 📧 SENDGRID (pour les emails)
SENDGRID_API_KEY=votre_sendgrid_api_key

# 🔐 SÉCURITÉ
SESSION_SECRET=votre_session_secret_très_sécurisé_64_caractères_minimum
JWT_SECRET=votre_jwt_secret_très_sécurisé

# 🌐 APPLICATION
NODE_ENV=production
PORT=5000
```

### Étape 4: Déploiement

1. Cliquez sur **Next** pour passer en revue la configuration
2. Vérifiez que la base de données PostgreSQL est bien configurée
3. Cliquez sur **Create Resources**

## 📊 Monitoring et Vérification

### Health Check
L'application expose un endpoint de santé : `/health`

### Logs
Surveillez les logs pour vérifier :
- ✅ Connexion à la base de données
- ✅ Migrations appliquées
- ✅ Serveur démarré sur le port 5000
- ✅ Variables d'environnement chargées

### Tests Post-Déploiement

1. **Page d'accueil** : Vérifiez que le site se charge
2. **Authentification** : Testez la connexion utilisateur
3. **Assistant Gisabo** : Vérifiez que le chatbot fonctionne
4. **Paiements** : Testez l'intégration Square
5. **Base de données** : Vérifiez les opérations CRUD

## 🚨 Résolution de Problèmes

### Si l'application ne démarre pas :
1. Vérifiez les logs dans l'onglet "Runtime Logs"
2. Assurez-vous que toutes les variables d'environnement sont définies
3. Vérifiez la connexion à la base de données

### Si les migrations échouent :
1. Connectez-vous à la console de base de données
2. Exécutez manuellement les migrations si nécessaire
3. Redémarrez l'application

### Si les paiements ne fonctionnent pas :
1. Vérifiez les tokens Square en mode production
2. Testez les endpoints de paiement
3. Vérifiez les logs d'erreur

## 📞 Support

En cas de problème :
1. Consultez les logs Digital Ocean
2. Vérifiez la documentation Square
3. Contactez le support technique si nécessaire

---

**Note importante** : Après le déploiement, mettez à jour vos domaines personnalisés si nécessaire et configurez SSL (automatique avec Digital Ocean).