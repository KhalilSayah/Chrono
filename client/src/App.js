import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const App = () => {
  const [socket, setSocket] = useState(null);
  const [systemState, setSystemState] = useState({
    status: 'ACTIVE',
    timeRemaining: 0,
    wordsSubmitted: [],
    connectedUsers: 0,
    currentCycleId: 1
  });
  const [inputWord, setInputWord] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Connexion...');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const inputRef = useRef(null);
  const adminInputRef = useRef(null);
  const chatInputRef = useRef(null);
  const audioRef = useRef(null);
  const chatMessagesRef = useRef(null);

  // Connexion Socket.IO
  useEffect(() => {
    const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
    const newSocket = io(serverUrl);
    
    newSocket.on('connect', () => {
      setConnectionStatus('Connecté');
      setSocket(newSocket);
    });
    
    newSocket.on('disconnect', () => {
      setConnectionStatus('Déconnecté');
    });
    
    newSocket.on('systemUpdate', (data) => {
      setSystemState(data);
    });
    
    newSocket.on('timeUpdate', (data) => {
      setSystemState(prev => ({
        ...prev,
        timeRemaining: data.timeRemaining,
        status: data.status
      }));
    });
    
    newSocket.on('newMessage', (message) => {
      setChatMessages(prev => [...prev, message]);
    });
    
    newSocket.on('chatHistory', (messages) => {
      setChatMessages(messages);
    });
    
    return () => {
      newSocket.close();
    };
  }, []);

  // Focus automatique sur les champs d'entrée
  useEffect(() => {
    if (systemState.status === 'INPUT_PHASE' && inputRef.current) {
      inputRef.current.focus();
    }
    if (systemState.status === 'FAILED' && adminInputRef.current) {
      adminInputRef.current.focus();
    }
  }, [systemState.status]);

  // Auto-scroll du chat
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Formatage du temps
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Soumission de mot
  const handleWordSubmit = (e) => {
    e.preventDefault();
    if (socket && inputWord.trim() && systemState.status === 'INPUT_PHASE') {
      socket.emit('submitWord', { word: inputWord.trim() });
      setInputWord('');
    }
  };

  // Redémarrage admin
  const handleAdminRestart = (e) => {
    e.preventDefault();
    if (socket && adminCode.trim()) {
      socket.emit('adminRestart', { code: adminCode.trim() });
      setAdminCode('');
    }
  };
  
  // Envoi de message de chat
  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (socket && chatInput.trim()) {
      socket.emit('sendMessage', { message: chatInput.trim() });
      setChatInput('');
    }
  };
  
  // Gestion de l'audio d'ambiance
  const toggleAudio = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioRef.current.play();
        setIsAudioPlaying(true);
      }
    }
  };

  // Rendu conditionnel selon l'état du système
  const renderContent = () => {
    switch (systemState.status) {
      case 'ACTIVE':
        return (
          <div className="terminal-content">
            <div className="status-line">
              SYSTEM ACTIVE - Next input phase in: {formatTime(systemState.timeRemaining)}
            </div>
            <div className="info-line">
              Cycle #{systemState.currentCycleId} | Users connected: {systemState.connectedUsers}
            </div>
            <div className="waiting-message">
              Waiting for input phase...
            </div>
          </div>
        );
      
      case 'INPUT_PHASE':
        return (
          <div className="terminal-content">
            <div className="status-line urgent">
              INPUT REQUIRED - Enter your word now (Users: {systemState.wordsSubmitted.length}/30)
            </div>
            <div className="time-line">
              Time remaining: {formatTime(systemState.timeRemaining)}
            </div>
            <form onSubmit={handleWordSubmit} className="input-form">
              <div className="input-line">
                <span className="prompt">$ </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  className="terminal-input"
                  placeholder="Enter your word..."
                  maxLength={50}
                  autoComplete="off"
                />
              </div>
            </form>
            {systemState.wordsSubmitted.length > 0 && (
              <div className="words-display">
                Words submitted: {systemState.wordsSubmitted.slice(-10).join(', ')}
                {systemState.wordsSubmitted.length > 10 && '...'}
              </div>
            )}
          </div>
        );
      
      case 'FAILED':
        return (
          <div className="terminal-content">
            <div className="status-line error">
              SYSTEM FAILURE - Enter admin code to relaunch
            </div>
            <div className="error-details">
              Last cycle failed: Only {systemState.wordsSubmitted.length}/30 words submitted
            </div>
            <form onSubmit={handleAdminRestart} className="input-form">
              <div className="input-line">
                <span className="prompt error">ADMIN$ </span>
                <input
                  ref={adminInputRef}
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  className="terminal-input error"
                  placeholder="Enter admin code..."
                  autoComplete="off"
                />
              </div>
            </form>
          </div>
        );
      
      default:
        return (
          <div className="terminal-content">
            <div className="status-line">
              SYSTEM INITIALIZING...
            </div>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <div className="main-container">
        {/* Terminal principal */}
        <div className="terminal">
          <div className="terminal-header">
            <div className="terminal-title">BIPSEED-39 v1.0</div>
            <div className="connection-status">
              Status: {connectionStatus}
            </div>
          </div>
          
          <div className="terminal-body">
            {renderContent()}
          </div>
          
          <div className="terminal-footer">
            <div className="footer-line">
              System requires 30 unique words every 15 minutes to stay active
            </div>
            {/* Contrôles audio */}
            <div className="audio-controls">
              <button 
                className={`audio-btn ${isAudioPlaying ? 'playing' : ''}`}
                onClick={toggleAudio}
              >
                {isAudioPlaying ? '🔊 PAUSE AMBIENT' : '🔇 PLAY AMBIENT'}
              </button>
              <audio 
                ref={audioRef}
                loop
                preload="auto"
              >
                <source src="/whatthehellisthat.wav" type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        </div>
        
        {/* Section de chat à droite */}
        <div className="chat-section">
          <div className="chat-header">
            <div className="chat-title">ANONYMOUS CHAT</div>
            <div className="chat-users">Users: {systemState.connectedUsers}</div>
          </div>
          
          <div className="chat-messages" ref={chatMessagesRef}>
            {chatMessages.length === 0 ? (
              <div className="chat-empty">No messages yet...</div>
            ) : (
              chatMessages.map((message) => {
                const isAdminMessage = message.text.startsWith('/admin ');
                const displayText = isAdminMessage ? message.text.substring(7) : message.text;
                const displayUser = isAdminMessage ? 'admin' : message.user;
                
                return (
                  <div key={message.id} className={`chat-message ${isAdminMessage ? 'admin-message' : ''}`}>
                    <div className="message-header">
                      <span className={`message-user ${isAdminMessage ? 'admin-user' : ''}`}>{displayUser}</span>
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={`message-text ${isAdminMessage ? 'admin-text' : ''}`}>{displayText}</div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="chat-input-section">
            <form onSubmit={handleChatSubmit} className="chat-form">
              <div className="chat-input-line">
                <span className="chat-prompt"></span>
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="chat-input"
                  placeholder="Type your message..."
                  maxLength={200}
                  autoComplete="off"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;