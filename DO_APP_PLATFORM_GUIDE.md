# 🌊 Guide Digital Ocean App Platform - GISABO

## ⚡ Déploiement en 5 Étapes

### Étape 1: Préparer le Code pour GitHub

```bash
# Ajouter tous les fichiers
git add .

# Commit avec un message descriptif
git commit -m "🚀 Ready for Digital Ocean App Platform deployment

✨ Features ready for production:
- Complete money transfer system with Square/Afterpay
- Marketplace with secure checkout
- JWT authentication system
- Real-time exchange rates
- PostgreSQL with auto-configuration
- Health monitoring endpoints
- Mobile-responsive interface"

# Pousser vers GitHub
git push origin main
```

### Étape 2: Créer l'Application sur Digital Ocean

1. **Connectez-vous à Digital Ocean**
2. **App Platform → Create App**
3. **Source → GitHub** (connectez votre compte)
4. **Sélectionnez votre dépôt**: `gisabo-platform`
5. **Branch**: `main`
6. **Auto-detect configuration**: Digital Ocean détectera `.do/app.yaml`

### Étape 3: Configuration Automatique

Digital Ocean utilisera automatiquement notre fichier `.do/app.yaml` qui configure :

- **Service Web Node.js** sur port 5000
- **Base PostgreSQL 15** managed
- **Health check** sur `/api/health`
- **Variables d'environnement** de base

### Étape 4: Variables d'Environnement Critiques

Dans **App Settings → Environment Variables**, ajoutez :

```bash
# Square Production (OBLIGATOIRE)
SQUARE_ACCESS_TOKEN=sq0atp-VOTRE_TOKEN_PRODUCTION
SQUARE_APPLICATION_ID=sq0idp-VOTRE_APP_ID
SQUARE_LOCATION_ID=LVOTRE_LOCATION_ID
SQUARE_ENVIRONMENT=production

# Variables client Square
VITE_SQUARE_APPLICATION_ID=sq0idp-VOTRE_APP_ID  
VITE_SQUARE_LOCATION_ID=LVOTRE_LOCATION_ID

# Email SendGrid
SENDGRID_API_KEY=SG.VOTRE_CLE_SENDGRID

# Sécurité (64 caractères minimum)
SESSION_SECRET=votre_secret_session_tres_securise_64_caracteres_minimum_ici

# DATABASE_URL sera auto-générée par Digital Ocean
```

### Étape 5: Déploiement et Vérification

1. **Cliquez "Create Resources"**
2. **Attendez le déploiement** (5-10 minutes)
3. **Testez l'application** sur l'URL fournie par DO

---

## 🔧 Configuration Avancée

### Base de Données Automatique

Digital Ocean va :
- Créer une base PostgreSQL 15 managed
- Générer automatiquement `DATABASE_URL`
- Connecter l'app à la base via variables d'environnement
- Appliquer nos migrations Drizzle automatiquement

### Domaine Personnalisé

Après déploiement, dans **App Settings → Domains** :
1. Ajouter votre domaine (ex: `app.gisabogroup.ca`)
2. Configurer les DNS selon les instructions DO
3. SSL automatique via Let's Encrypt

### Scaling Automatique

Dans **App Settings → App Spec** :
```yaml
instance_size_slug: basic-xxs  # Démarrage petit
instance_count: 1              # Une instance
# Scaling manuel disponible
```

---

## 📱 URLs de Production

Une fois déployé, votre app sera disponible sur :

- **Web App**: `https://gisabo-platform-xxxxx.ondigitalocean.app`
- **Mobile**: `https://gisabo-platform-xxxxx.ondigitalocean.app/mobile.html`
- **Admin**: `https://gisabo-platform-xxxxx.ondigitalocean.app/admin/login`
- **API Health**: `https://gisabo-platform-xxxxx.ondigitalocean.app/api/health`

---

## 🔒 Sécurité Production

### Variables Automatiquement Sécurisées
- Toutes les variables sont cryptées par Digital Ocean
- `DATABASE_URL` générée avec SSL obligatoire
- HTTPS forcé sur tous les endpoints

### Certificats SSL
- Certificat Let's Encrypt automatique
- Renouvellement automatique
- Redirection HTTP → HTTPS

---

## 💰 Coûts Estimés

### Configuration Recommandée
- **App (basic-xxs)**: ~$5/mois
- **Base PostgreSQL (basic-xxs)**: ~$15/mois
- **Total**: ~$20/mois pour démarrer

### Scaling selon l'usage
- Instance size ajustable selon le trafic
- Base de données scalable
- Paiement à l'usage réel

---

## 📊 Monitoring Inclus

### Métriques Automatiques
- CPU, RAM, Network usage
- Requêtes par seconde
- Temps de réponse
- Erreurs HTTP

### Logs en Temps Réel
- Application logs dans l'interface DO
- Base de données logs
- Système logs

### Alertes
- Configuration d'alertes email/Slack
- Seuils personnalisables
- Notifications de déploiement

---

## 🚀 Déploiement Continu

### Auto-Deploy sur Push
- Chaque `git push origin main` redéploie automatiquement
- Build et tests automatiques
- Rollback automatique en cas d'échec

### Branches et Environnements
- Branch `main` → Production
- Branch `develop` → Staging (optionnel)
- Preview deploys pour pull requests

---

## 🛠️ Maintenance

### Mises à Jour
Digital Ocean gère automatiquement :
- Mises à jour sécurité OS
- Patches PostgreSQL
- Renouvellement SSL
- Backups quotidiens

### Backups Base de Données
- Backup quotidien automatique
- Restoration point-in-time
- Export manuel disponible

---

## ✅ Checklist de Déploiement

**Avant le déploiement :**
- [ ] Code poussé sur GitHub
- [ ] Tokens Square en mode production configurés
- [ ] Variables d'environnement préparées
- [ ] Tests locaux réussis

**Après le déploiement :**
- [ ] Health check répond (200 OK)
- [ ] Interface web accessible
- [ ] Transferts d'argent fonctionnels
- [ ] Marketplace opérationnelle
- [ ] Paiements Square testés
- [ ] Admin panel accessible

---

## 🆘 Dépannage

### Build Failed
```bash
# Vérifier dans Runtime Logs de Digital Ocean
# Problèmes courants :
# - Dépendances manquantes → vérifier package.json
# - Variables env → configurer dans App Settings
```

### Database Connection Error
```bash
# Digital Ocean gère automatiquement DATABASE_URL
# Vérifier dans App Settings → Environment que la variable existe
```

### Square Payments Failed
```bash
# Vérifier dans App Settings → Environment :
SQUARE_ENVIRONMENT=production  # Pas 'sandbox'
SQUARE_ACCESS_TOKEN=sq0atp-... # Token production
```

---

## 📞 Support

**Digital Ocean App Platform** inclut :
- Documentation complète
- Support chat 24/7 (plans payants)
- Community support
- Status page temps réel

**GISABO Support** :
- Guide complet dans ce repository
- Issues GitHub pour bugs
- Documentation technique dans `/docs`

---

## 🎉 Résultat Final

Après déploiement, vous aurez :

✅ **Application 100% fonctionnelle** sur Digital Ocean  
✅ **Base de données managed** avec backups automatiques  
✅ **HTTPS + domaine personnalisé** disponible  
✅ **Scaling automatique** selon l'usage  
✅ **Monitoring complet** intégré  
✅ **Déploiement continu** depuis GitHub  

**Votre plateforme GISABO sera prête pour la production !**