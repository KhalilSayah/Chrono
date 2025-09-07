# BIPSEED-39 - Application Web Temps Réel

Application web collaborative avec interface terminal qui gère des cycles de 15 minutes avec phases d'entrée collaborative.

## 🚀 Installation Rapide

### Développement Local

1. Installer toutes les dépendances :
```bash
npm run install-all
```

2. Démarrer l'application en mode développement :
```bash
npm run dev
```

L'application sera accessible sur :
- Frontend : http://localhost:3000
- Backend : http://localhost:3001

### 🌐 Déploiement pour Hébergement

#### Option 1: Déploiement sur Render + Vercel (Recommandé)

**Backend sur Render :**

1. **Créer un compte sur [Render](https://render.com)**

2. **Connecter votre repository GitHub/GitLab**

3. **Créer un nouveau Web Service :**
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Environment: `Node`

4. **Configurer les variables d'environnement :**
   ```
   NODE_ENV=production
   ADMIN_SECRET_CODE=VOTRE_CODE_SECRET
   CLIENT_URL=https://votre-app.vercel.app
   ```

5. **Déployer** - Render détectera automatiquement le fichier `render.yaml`

**Frontend sur Vercel :**

1. **Créer un compte sur [Vercel](https://vercel.com)**

2. **Importer votre repository**

3. **Configurer les variables d'environnement :**
   ```
   REACT_APP_SERVER_URL=https://votre-backend.onrender.com
   ```

4. **Déployer** - Vercel utilisera automatiquement le fichier `vercel.json`

#### Option 2: Déploiement Manuel

1. **Préparer l'environnement de production :**
```bash
# Construire l'application
npm run build-all

# Configurer les variables d'environnement
# Modifier server/.env avec votre configuration
```

2. **Configurer les variables d'environnement :**
```bash
# Dans server/.env
NODE_ENV=production
PORT=3001
CLIENT_URL=*  # ou votre domaine spécifique
ADMIN_SECRET_CODE=VOTRE_CODE_SECRET
```

3. **Démarrer en production :**
```bash
npm run start-prod
```

#### Option 2: Déploiement avec Docker

1. **Construire l'image Docker :**
```bash
docker build -t bipseed-39 .
```

2. **Lancer avec Docker Compose :**
```bash
docker-compose up -d
```

#### Option 3: Déploiement sur Réseau Local

1. **Trouver votre adresse IP locale :**
```bash
# Windows
ipconfig
# Linux/Mac
ifconfig
```

2. **Configurer les variables d'environnement :**
```bash
# Dans server/.env
CLIENT_URL=*

# Dans client/.env
REACT_APP_SERVER_URL=http://VOTRE_IP:3001
```

3. **Construire et démarrer :**
```bash
npm run deploy
```

4. **Accès depuis d'autres appareils :**
- Ouvrir http://VOTRE_IP:3001 dans le navigateur
- Exemple: http://192.168.1.100:3001

## 📁 Structure des Fichiers de Configuration

```
├── render.yaml              # Configuration Render
├── vercel.json              # Configuration Vercel
├── server/
│   ├── .env.example         # Variables d'environnement Render
│   └── package.json         # Dépendances backend
└── client/
    ├── .env.example         # Variables d'environnement Vercel
    └── package.json         # Dépendances frontend
```

## Fonctionnalités

- **Cycles de 15 minutes** : Compte à rebours automatique
- **Phase d'entrée (1 minute)** : 30 utilisateurs doivent saisir un mot
- **Interface terminal rétro** : Fond noir, texte vert, style hacking
- **Temps réel** : Synchronisation via Socket.IO
- **Système de redémarrage** : Code secret admin pour relancer
- **Responsive** : Compatible mobile

## Configuration

Le code secret admin est défini dans `server/.env` :
```
ADMIN_SECRET_CODE=REBOOT2024
```

## États du système

1. **SYSTEM ACTIVE** : Cycle en cours, affichage du compte à rebours
2. **INPUT REQUIRED** : Phase d'entrée, saisie de mots (1 minute)
3. **SYSTEM FAILURE** : Échec du cycle, interface admin pour redémarrage

## 🔧 Configuration Avancée

### Ports et Pare-feu

Pour héberger l'application et la rendre accessible :

1. **Ouvrir le port 3001** dans votre pare-feu
2. **Configurer votre routeur** pour rediriger le port 3001 vers votre machine
3. **Utiliser un nom de domaine** ou votre IP publique pour l'accès externe

### Variables d'Environnement Importantes

| Variable | Description | Exemple |
|----------|-------------|----------|
| `PORT` | Port du serveur | `3001` |
| `CLIENT_URL` | Origine autorisée pour CORS | `*` ou `https://mondomaine.com` |
| `ADMIN_SECRET_CODE` | Code de redémarrage admin | `REBOOT2024` |
| `NODE_ENV` | Environnement d'exécution | `production` |
| `REACT_APP_SERVER_URL` | URL du serveur pour le client | `https://votre-backend.onrender.com` |

### 🚀 Guide de Déploiement Render + Vercel

**Étapes détaillées :**

1. **Préparer le repository :**
   ```bash
   # Copier les fichiers d'exemple
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   
   # Modifier les URLs selon vos services
   ```

2. **Déployer le backend sur Render :**
   - Créer un Web Service
   - Connecter votre repo GitHub
   - Render utilisera automatiquement `render.yaml`
   - Configurer les variables d'environnement
   - Noter l'URL générée (ex: `https://votre-app.onrender.com`)

3. **Déployer le frontend sur Vercel :**
   - Importer le projet depuis GitHub
   - Configurer `REACT_APP_SERVER_URL` avec l'URL Render
   - Vercel utilisera automatiquement `vercel.json`
   - Noter l'URL générée (ex: `https://votre-app.vercel.app`)

4. **Mettre à jour les CORS :**
   - Retourner sur Render
   - Modifier `CLIENT_URL` avec l'URL Vercel
   - Redéployer le backend

### Sécurité

- **Changez le code admin** dans `server/.env` avant le déploiement
- **Limitez CLIENT_URL** à votre domaine en production
- **Utilisez HTTPS** en production avec un reverse proxy (nginx, Apache)
- **Configurez un pare-feu** pour limiter l'accès au port 3001

### Surveillance

L'application affiche dans les logs :
- Connexions/déconnexions des utilisateurs
- Progression des cycles et phases d'entrée
- Mots soumis et succès/échecs des cycles