# Dockerfile pour BIPSEED-39
FROM node:18-alpine

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers package.json
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Installer les dépendances
RUN npm run install-all

# Copier le code source
COPY . .

# Construire l'application client
RUN npm run build

# Exposer le port
EXPOSE 3001

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3001
ENV CLIENT_URL=*

# Démarrer l'application
CMD ["npm", "run", "start-prod"]