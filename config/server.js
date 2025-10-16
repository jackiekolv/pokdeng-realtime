/**
 * Server configuration
 */

const config = {
    // Server settings
    port: process.env.PORT || 5000,
    maxConnections: parseInt(process.env.MAX_CONNECTIONS) || 500, // Increased from 100
    maxConnectionsPerIP: parseInt(process.env.MAX_CONNECTIONS_PER_IP) || 20, // Increased from 5
    
    // Logging settings
    logging: {
        // Log every Nth connection to reduce noise
        connectionLogInterval: parseInt(process.env.CONNECTION_LOG_INTERVAL) || 10,
        
        // Log server stats interval (in milliseconds)
        statsInterval: parseInt(process.env.STATS_INTERVAL) || 5 * 60 * 1000, // 5 minutes
        
        // Enable/disable different log types
        enableConnectionLogs: process.env.ENABLE_CONNECTION_LOGS !== 'false',
        enableCommandLogs: process.env.ENABLE_COMMAND_LOGS !== 'false',
        enableChatLogs: process.env.ENABLE_CHAT_LOGS !== 'false',
        enableErrorLogs: process.env.ENABLE_ERROR_LOGS !== 'false',
        
        // Log levels: 'error', 'warn', 'info', 'debug'
        level: process.env.LOG_LEVEL || 'info'
    },
    
    // Socket.IO settings
    socketIO: {
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e6,
        connectTimeout: 45000,
        
        // Client reconnection settings
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 5
    },
    
    // Security settings
    security: {
        // Rate limiting - Relaxed for normal gameplay
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 500, // requests per window (increased from 100)
            socketMax: 100, // socket events per minute (increased from 30)
            socketWindowMs: 60 * 1000 // 1 minute
        },
        
        // CORS settings
        cors: {
            origin: process.env.NODE_ENV === 'production' 
                ? (process.env.ALLOWED_ORIGINS || '').split(',')
                : ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:3001'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    },
    
    // Game settings
    game: {
        // Session cleanup interval (in milliseconds)
        sessionCleanupInterval: 30 * 60 * 1000, // 30 minutes
        
        // Session expiry time (in milliseconds)
        sessionExpiryTime: 60 * 60 * 1000, // 1 hour
        
        // Maximum cards per player
        maxCardsPerPlayer: 3,
        
        // Deck settings
        autoShuffle: true,
        shuffleThreshold: 10 // Reshuffle when less than 10 cards remain
    }
};

module.exports = config;
