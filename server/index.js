const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;
const ADMIN_SECRET = process.env.ADMIN_SECRET_CODE || 'REBOOT2024';

// Middleware
app.use(cors());
app.use(express.json());

// État global du système
let systemState = {
  status: 'ACTIVE', // ACTIVE, INPUT_PHASE, FAILED
  cycleStartTime: Date.now(),
  inputPhaseStartTime: null,
  wordsSubmitted: [],
  connectedUsers: 0,
  currentCycleId: 1,
  isTransitioning: false // Flag to prevent race conditions
};

// Messages de chat anonymes
let chatMessages = [];

// Timer management
let cycleTimer = null;
let inputPhaseTimer = null;

// Constantes
const CYCLE_DURATION = 15 * 60 * 1000; // 15 minutes en millisecondes
const INPUT_PHASE_DURATION = 60 * 1000; // 1 minute en millisecondes
const REQUIRED_WORDS = 30;

// Fonction pour calculer le temps restant
function getTimeRemaining() {
  const now = Date.now();
  
  if (systemState.status === 'ACTIVE') {
    const elapsed = now - systemState.cycleStartTime;
    const remaining = CYCLE_DURATION - elapsed;
    return Math.max(0, remaining);
  }
  
  if (systemState.status === 'INPUT_PHASE') {
    const elapsed = now - systemState.inputPhaseStartTime;
    const remaining = INPUT_PHASE_DURATION - elapsed;
    return Math.max(0, remaining);
  }
  
  return 0;
}

// Fonction pour démarrer la phase d'entrée
function startInputPhase() {
  // Clear any existing timers
  if (cycleTimer) {
    clearTimeout(cycleTimer);
    cycleTimer = null;
  }
  
  systemState.status = 'INPUT_PHASE';
  systemState.inputPhaseStartTime = Date.now();
  systemState.wordsSubmitted = [];
  systemState.isTransitioning = false;
  
  console.log(`Cycle ${systemState.currentCycleId}: Phase d'entrée démarrée`);
  
  // Émettre le changement d'état
  io.emit('systemUpdate', {
    ...systemState,
    timeRemaining: getTimeRemaining()
  });
  
  // Timer pour la fin de la phase d'entrée
  inputPhaseTimer = setTimeout(() => {
    checkInputPhaseResult();
  }, INPUT_PHASE_DURATION);
}

// Fonction pour vérifier le résultat de la phase d'entrée
function checkInputPhaseResult() {
  // Prevent multiple executions
  if (systemState.isTransitioning) {
    return;
  }
  
  systemState.isTransitioning = true;
  
  // Clear input phase timer
  if (inputPhaseTimer) {
    clearTimeout(inputPhaseTimer);
    inputPhaseTimer = null;
  }
  
  if (systemState.wordsSubmitted.length >= REQUIRED_WORDS) {
    // Succès : nouveau cycle
    startNewCycle();
  } else {
    // Échec : système en panne
    systemState.status = 'FAILED';
    systemState.isTransitioning = false;
    console.log(`Cycle ${systemState.currentCycleId}: ÉCHEC - Seulement ${systemState.wordsSubmitted.length}/${REQUIRED_WORDS} mots soumis`);
    
    io.emit('systemUpdate', {
      ...systemState,
      timeRemaining: 0
    });
  }
}

// Fonction pour démarrer un nouveau cycle
function startNewCycle() {
  // Clear any existing timers
  if (inputPhaseTimer) {
    clearTimeout(inputPhaseTimer);
    inputPhaseTimer = null;
  }
  if (cycleTimer) {
    clearTimeout(cycleTimer);
    cycleTimer = null;
  }
  
  systemState.currentCycleId++;
  systemState.status = 'ACTIVE';
  systemState.cycleStartTime = Date.now();
  systemState.inputPhaseStartTime = null;
  systemState.wordsSubmitted = [];
  systemState.isTransitioning = false;
  
  console.log(`Cycle ${systemState.currentCycleId}: Nouveau cycle démarré`);
  
  // Émettre le changement d'état
  io.emit('systemUpdate', {
    ...systemState,
    timeRemaining: getTimeRemaining()
  });
  
  // Timer pour démarrer la phase d'entrée
  cycleTimer = setTimeout(() => {
    if (systemState.status === 'ACTIVE' && !systemState.isTransitioning) {
      startInputPhase();
    }
  }, CYCLE_DURATION);
}

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  systemState.connectedUsers++;
  console.log(`Utilisateur connecté. Total: ${systemState.connectedUsers}`);
  
  // Envoyer l'état actuel au nouvel utilisateur
  socket.emit('systemUpdate', {
    ...systemState,
    timeRemaining: getTimeRemaining()
  });
  
  // Gestion de la soumission de mots
  socket.on('submitWord', (data) => {
    if (systemState.status === 'INPUT_PHASE' && data.word && data.word.trim() && !systemState.isTransitioning) {
      const word = data.word.trim().toLowerCase();
      
      // Vérifier si le mot n'a pas déjà été soumis (atomic check)
      if (!systemState.wordsSubmitted.includes(word)) {
        systemState.wordsSubmitted.push(word);
        
        console.log(`Mot soumis: "${word}" (${systemState.wordsSubmitted.length}/${REQUIRED_WORDS})`);
        
        // Émettre la mise à jour à tous les clients
        io.emit('systemUpdate', {
          ...systemState,
          timeRemaining: getTimeRemaining()
        });
        
        // Vérifier si on a atteint l'objectif (with race condition protection)
        if (systemState.wordsSubmitted.length >= REQUIRED_WORDS && !systemState.isTransitioning) {
          systemState.isTransitioning = true;
          
          // Clear the input phase timer since we're completing early
          if (inputPhaseTimer) {
            clearTimeout(inputPhaseTimer);
            inputPhaseTimer = null;
          }
          
          setTimeout(() => {
            if (systemState.isTransitioning) { // Double-check to prevent race conditions
              startNewCycle();
            }
          }, 1000); // Petit délai pour que les utilisateurs voient le succès
        }
      }
    }
  });
  
  // Gestion du code admin pour redémarrage
  socket.on('adminRestart', (data) => {
    if (data.code === ADMIN_SECRET && systemState.status === 'FAILED') {
      console.log('Redémarrage admin autorisé');
      startNewCycle();
    }
  });
  
  // Gestion des messages de chat anonymes
  socket.on('sendMessage', (data) => {
    if (data.message && data.message.trim()) {
      const message = {
        id: Date.now() + Math.random(),
        text: data.message.trim(),
        timestamp: Date.now(),
        user: `Anonyme ${Math.floor(Math.random() * 1000)}`
      };
      
      chatMessages.push(message);
      
      // Garder seulement les 50 derniers messages
      if (chatMessages.length > 50) {
        chatMessages = chatMessages.slice(-50);
      }
      
      // Émettre le nouveau message à tous les clients
      io.emit('newMessage', message);
      
      console.log(`Message de chat: ${message.user}: ${message.text}`);
    }
  });
  
  // Envoyer l'historique des messages au nouvel utilisateur
  socket.emit('chatHistory', chatMessages);
  
  // Gestion de la déconnexion
  socket.on('disconnect', () => {
    systemState.connectedUsers--;
    console.log(`Utilisateur déconnecté. Total: ${systemState.connectedUsers}`);
  });
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    systemState: systemState,
    timeRemaining: getTimeRemaining()
  });
});

// Démarrer le serveur
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur BIPSEED-39 démarré sur le port ${PORT}`);
  console.log(`Serveur accessible sur toutes les interfaces réseau`);
  console.log(`Code secret admin: ${ADMIN_SECRET}`);
  
  // Démarrer le premier cycle
  startNewCycle();
});

// Cleanup function for graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  if (cycleTimer) clearTimeout(cycleTimer);
  if (inputPhaseTimer) clearTimeout(inputPhaseTimer);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  if (cycleTimer) clearTimeout(cycleTimer);
  if (inputPhaseTimer) clearTimeout(inputPhaseTimer);
  process.exit(0);
});

// Mise à jour périodique du temps restant
setInterval(() => {
  if (systemState.status !== 'FAILED') {
    io.emit('timeUpdate', {
      timeRemaining: getTimeRemaining(),
      status: systemState.status
    });
  }
}, 1000); // Mise à jour chaque seconde