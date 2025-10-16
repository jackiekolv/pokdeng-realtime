/**
 * Pokdeng Real-time Game Server
 * Modern Express.js and Socket.IO implementation
 */

const express = require('express');
const path = require('path');
const config = require('./config/server');
const logger = require('./utils/logger');
const { GameManager } = require('./gameManager');
const {
    createRateLimit,
    SocketRateLimit,
    sanitizeInput,
    isValidSessionId,
    securityHeaders
} = require('./middleware/security');

// Initialize Express app
const app = express();
const port = config.port;

// Initialize Game Manager and Security
const gameManager = new GameManager();
const socketRateLimit = new SocketRateLimit(
    config.security.rateLimit.socketMax,
    config.security.rateLimit.socketWindowMs
);

// Security middleware
app.use(securityHeaders);
app.use(createRateLimit(
    config.security.rateLimit.windowMs,
    config.security.rateLimit.max
));

// Express configuration
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Express error', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(port, () => {
    logger.serverStart(port);
});

// Log server statistics periodically
setInterval(() => {
    const sessions = gameManager.getAllSessions();
    const totalPlayers = sessions.reduce((sum, session) => sum + session.playerCount, 0);

    logger.serverStats(activeConnections, sessions.length, totalPlayers);
}, config.logging.statsInterval);

// Cleanup IP connections periodically (every 5 minutes)
setInterval(() => {
    // Clean up any stale IP entries
    for (const [ip, count] of connectionsByIP.entries()) {
        if (count <= 0) {
            connectionsByIP.delete(ip);
        }
    }

    if (connectionsByIP.size > 0) {
        logger.log('debug', '🧹', `IP connections cleanup: ${connectionsByIP.size} IPs tracked`);
    }
}, 5 * 60 * 1000);

// Initialize Socket.IO with security and connection limits
const io = require('socket.io')(server, {
    cors: config.security.cors,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: config.socketIO.pingTimeout,
    pingInterval: config.socketIO.pingInterval,
    maxHttpBufferSize: config.socketIO.maxHttpBufferSize,
    connectTimeout: config.socketIO.connectTimeout
});

// Input validation helpers
const validateMessage = (data) => {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
    }
    if (!data.message || typeof data.message !== 'string') {
        throw new Error('Message is required and must be a string');
    }
    if (data.message.length > 500) {
        throw new Error('Message too long');
    }
    return true;
};

const validatePlayerName = (name) => {
    if (!name || typeof name !== 'string') {
        throw new Error('Player name is required');
    }
    if (name.length < 2 || name.length > 20) {
        throw new Error('Player name must be between 2-20 characters');
    }
    return true;
};

// Track active connections and IP addresses
let activeConnections = 0;
const connectionsByIP = new Map(); // Track connections per IP
const MAX_CONNECTIONS_PER_IP = config.maxConnectionsPerIP;

// Socket.IO connection handling with security
io.on('connection', (socket) => {
    activeConnections++;

    // Get client IP address
    const clientIP = socket.handshake.address || socket.conn.remoteAddress || 'unknown';
    const ipConnections = connectionsByIP.get(clientIP) || 0;

    // Limit connections per IP
    if (ipConnections >= MAX_CONNECTIONS_PER_IP) {
        logger.warn(`Too many connections from IP: ${clientIP}`, { connections: ipConnections });
        socket.emit('error', { message: 'มีการเชื่อมต่อจาก IP นี้มากเกินไป กรุณาลองใหม่ภายหลัง' });
        socket.disconnect(true);
        activeConnections--;
        return;
    }

    // Limit total concurrent connections
    if (activeConnections > config.maxConnections) {
        logger.connectionLimitExceeded(socket.id, activeConnections);
        socket.emit('error', { message: 'เซิร์ฟเวอร์เต็ม กรุณาลองใหม่ภายหลัง' });
        socket.disconnect(true);
        activeConnections--;
        return;
    }

    // Track IP connections
    connectionsByIP.set(clientIP, ipConnections + 1);

    logger.playerConnected(socket.id, activeConnections);

    // Rate limiting wrapper for socket events
    const withRateLimit = (eventHandler) => {
        return (data) => {
            if (!socketRateLimit.checkLimit(socket.id)) {
                socket.emit('error', {
                    message: 'กรุณารอสักครู่ก่อนทำการใหม่',
                    type: 'RATE_LIMIT'
                });
                return;
            }
            eventHandler(data);
        };
    };

    // Join game session - Everyone joins the same global session
    socket.on('join_game', withRateLimit((data) => {
        try {
            let playerName = data?.playerName || `Player_${socket.id.substring(0, 6)}`;
            playerName = sanitizeInput(playerName);
            validatePlayerName(playerName);

            let userId = data?.userId || null;
            let wasHost = data?.wasHost || false;

            // Force everyone to join the same global session
            const globalSessionId = 'global_pokdeng_session';

            const session = gameManager.joinSession(globalSessionId, socket.id, playerName, userId, wasHost);
            socket.join(session.sessionId);

            // Send session info to player including all current players
            const allPlayers = Array.from(session.players.values()).map(player => ({
                id: player.id,
                name: player.name,
                isHost: session.isHost(player.id),
                chips: player.chips,
                currentBet: player.currentBet
            }));

            socket.emit('session_joined', {
                sessionId: session.sessionId,
                playerName,
                stats: session.getStats(),
                hostInfo: session.getHostInfo(),
                allPlayers: allPlayers
            });

            // Notify other players in session
            const player = session.players.get(socket.id);
            socket.to(session.sessionId).emit('player_joined', {
                playerId: socket.id,
                playerName,
                chips: player.chips,
                currentBet: player.currentBet,
                stats: session.getStats()
            });

            logger.playerJoined(playerName, session.sessionId, session.players.size);

            // Notify all players about current host (in case host rejoined)
            io.to(session.sessionId).emit('host_changed', {
                hostId: session.hostId,
                hostName: session.hostName
            });

            // Send welcome chat message
            socket.emit('chat', {
                username: 'System',
                message: 'ยินดีต้อนรับสู่เกม Pokdeng!'
            });

            logger.playerJoinedSession(playerName, session.sessionId, session.players.size);

        } catch (error) {
            console.error('Join game error:', error.message);
            socket.emit('error', { message: error.message });
        }
    }));

    // Handle game commands
    socket.on('command', withRateLimit((data) => {
        try {
            validateMessage(data);
            const session = gameManager.getPlayerSession(socket.id);

            if (!session) {
                socket.emit('error', { message: 'You must join a game session first' });
                return;
            }

            // Sanitize input
            data.message = sanitizeInput(data.message);
            const command = data.message.toLowerCase().trim();
            logger.gameCommand(socket.id, command);

            switch (command) {
                case 'shuffle':
                    // Only host can shuffle
                    if (!session.isHost(socket.id)) {
                        socket.emit('error', { message: 'เฉพาะ Host เท่านั้นที่สามารถสับไพ่ได้' });
                        return;
                    }

                    // Reshuffle deck and clear all players' cards
                    session.reshuffleDeck();

                    // Notify all players about shuffle
                    io.to(session.sessionId).emit('chat', {
                        username: 'System',
                        message: '🔄 ' + data.username + ' (Host) สับไพ่ใหม่แล้ว! ไพ่ทุกคนถูกคว่ำ'
                    });

                    // Send shuffle event to reset all players' cards
                    io.to(session.sessionId).emit('shuffle', {
                        remainingCards: session.deck.length - session.currentCardIndex,
                        shuffledBy: data.username
                    });

                    logger.log('info', '🔄', `${data.username} shuffled deck in session ${session.sessionId}`);
                    break;

                case 'pok':
                    const initialCards = session.dealInitialCards(socket.id);

                    // Lock bets when cards are dealt
                    session.lockAllBets();

                    io.to(session.sessionId).emit('chat', {
                        username: data.username || 'System',
                        message: data.username + ' ได้รับไพ่เริ่มต้น'
                    });
                    socket.emit('cards', {
                        username: data.username,
                        cards: initialCards.cards,
                        handValue: initialCards.handValue,
                        specialHand: initialCards.specialHand,
                        remainingCards: initialCards.remainingCards
                    });

                    // Notify all players that bets are locked
                    io.to(session.sessionId).emit('bets_locked');
                    break;

                case 'hit':
                    const hitResult = session.hitCard(socket.id);
                    io.to(session.sessionId).emit('chat', {
                        username: data.username || 'System',
                        message: data.username + ' เรียกไพ่เพิ่ม'
                    });
                    socket.emit('card3', {
                        username: data.username,
                        card: hitResult.card,
                        allCards: hitResult.allCards,
                        handValue: hitResult.handValue,
                        remainingCards: hitResult.remainingCards
                    });
                    break;

                default:
                    // Regular chat message - sanitize before broadcasting
                    const sanitizedData = {
                        ...data,
                        message: sanitizeInput(data.message)
                    };
                    io.to(session.sessionId).emit('chat', sanitizedData);
            }

        } catch (error) {
            logger.error('Command error', error);
            socket.emit('error', { message: error.message });
        }
    }));

    // Handle regular chat messages
    socket.on('chat', withRateLimit((data) => {
        try {
            validateMessage(data);
            const session = gameManager.getPlayerSession(socket.id);

            if (!session) {
                socket.emit('error', { message: 'You must join a game session first' });
                return;
            }

            // Sanitize chat message
            const sanitizedData = {
                ...data,
                message: sanitizeInput(data.message)
            };

            logger.chatMessage(socket.id, sanitizedData.message);
            io.to(session.sessionId).emit('chat', sanitizedData);

        } catch (error) {
            logger.error('Chat error', error);
            socket.emit('error', { message: error.message });
        }
    }));

    // Get session stats
    socket.on('get_stats', withRateLimit(() => {
        try {
            const session = gameManager.getPlayerSession(socket.id);
            if (session) {
                socket.emit('session_stats', session.getStats());
            } else {
                socket.emit('error', { message: 'Not in a game session' });
            }
        } catch (error) {
            logger.error('Get stats error', error);
            socket.emit('error', { message: error.message });
        }
    }));

    // Betting system
    socket.on('place_bet', withRateLimit((data) => {
        try {
            const session = gameManager.getPlayerSession(socket.id);
            if (!session) {
                socket.emit('error', { message: 'Not in a game session' });
                return;
            }

            const betAmount = parseInt(data.amount);
            if (!betAmount || betAmount <= 0) {
                socket.emit('error', { message: 'Invalid bet amount' });
                return;
            }

            const result = session.placeBet(socket.id, betAmount);
            if (result.success) {
                // Notify all players about the bet
                io.to(session.sessionId).emit('bet_placed', {
                    playerId: socket.id,
                    playerName: result.playerName,
                    betAmount: result.betAmount,
                    remainingChips: result.remainingChips
                });
                logger.log('info', '💰', `${result.playerName} bet ${betAmount} chips`);
            } else {
                socket.emit('error', { message: result.error });
            }
        } catch (error) {
            logger.error('Place bet error', error);
            socket.emit('error', { message: error.message });
        }
    }));

    // Calculate winnings (Host only)
    socket.on('calculate_winnings', withRateLimit(() => {
        try {
            const session = gameManager.getPlayerSession(socket.id);
            if (!session) {
                socket.emit('error', { message: 'Not in a game session' });
                return;
            }

            if (!session.isHost(socket.id)) {
                socket.emit('error', { message: 'Only host can calculate winnings' });
                return;
            }

            const results = session.calculateWinnings(socket.id);
            if (results.success) {
                // Send results to all players
                io.to(session.sessionId).emit('game_results', {
                    hostHand: results.hostHand,
                    hostValue: results.hostValue,
                    hostChips: results.hostChips,
                    results: results.results
                });
                logger.log('info', '🎯', `Game results calculated for session ${session.sessionId}`);
            } else {
                socket.emit('error', { message: results.error });
            }
        } catch (error) {
            logger.error('Calculate winnings error', error);
            socket.emit('error', { message: error.message });
        }
    }));

    // Host management
    // Direct host change - no approval needed
    socket.on('become_host', withRateLimit((data) => {
        try {
            const session = gameManager.getPlayerSession(socket.id);
            if (!session) {
                socket.emit('error', { message: 'Not in a game session' });
                return;
            }

            const playerName = sanitizeInput(data.username) || `Player_${socket.id.substring(0, 6)}`;

            // Change host directly
            const result = session.changeHost(socket.id);
            if (result.success) {
                io.to(session.sessionId).emit('host_changed', {
                    hostId: result.hostId,
                    hostName: result.hostName
                });
                logger.log('info', '👑', `${playerName} became host of session ${session.sessionId}`);
            }
        } catch (error) {
            logger.error('Become host error', error);
            socket.emit('error', { message: error.message });
        }
    }));



    // Handle disconnection
    socket.on('disconnect', (reason) => {
        activeConnections = Math.max(0, activeConnections - 1);

        // Decrease IP connection count
        const clientIP = socket.handshake.address || socket.conn.remoteAddress || 'unknown';
        const ipConnections = connectionsByIP.get(clientIP) || 0;
        if (ipConnections > 1) {
            connectionsByIP.set(clientIP, ipConnections - 1);
        } else {
            connectionsByIP.delete(clientIP);
        }

        logger.playerDisconnected(socket.id, reason, activeConnections);

        const session = gameManager.getPlayerSession(socket.id);
        if (session) {
            socket.to(session.sessionId).emit('player_left', {
                playerId: socket.id,
                stats: session.getStats()
            });
        }

        gameManager.leaveSession(socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
        logger.error('Socket error', error);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
