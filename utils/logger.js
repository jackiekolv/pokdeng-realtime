/**
 * Logger utility with configurable levels and formatting
 */

const config = require('../config/server');

class Logger {
    constructor() {
        this.config = config.logging;
        this.connectionCount = 0;
        this.disconnectionCount = 0;
    }

    /**
     * Format timestamp
     */
    getTimestamp() {
        return new Date().toLocaleString();
    }

    /**
     * Log with level and formatting
     */
    log(level, emoji, message, data = null) {
        if (!this.shouldLog(level)) return;

        const timestamp = this.getTimestamp();
        let logMessage = `${emoji} ${message}`;
        
        if (data) {
            logMessage += ` ${JSON.stringify(data)}`;
        }

        console.log(`[${timestamp}] ${logMessage}`);
    }

    /**
     * Check if should log based on level
     */
    shouldLog(level) {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const currentLevel = levels[this.config.level] || 2;
        const messageLevel = levels[level] || 2;
        
        return messageLevel <= currentLevel;
    }

    /**
     * Server startup
     */
    serverStart(port) {
        this.log('info', '🚀', `Pokdeng server listening on port: ${port}`);
        this.log('info', '📊', `Server started at ${this.getTimestamp()}`);
        this.log('info', '⚙️', `Log level: ${this.config.level}, Max connections: ${config.maxConnections}`);
    }

    /**
     * Player connection (with throttling)
     */
    playerConnected(socketId, activeConnections) {
        if (!this.config.enableConnectionLogs) return;

        this.connectionCount++;
        
        // Log every Nth connection or first few connections
        if (this.connectionCount % this.config.connectionLogInterval === 0 || activeConnections <= 5) {
            this.log('info', '🔌', `Player connected: ${socketId} (${activeConnections} active)`);
        }
    }

    /**
     * Player disconnection (with throttling)
     */
    playerDisconnected(socketId, reason, activeConnections) {
        if (!this.config.enableConnectionLogs) return;

        this.disconnectionCount++;
        
        // Log important disconnections or every Nth disconnect
        const importantReasons = ['transport error', 'ping timeout', 'server namespace disconnect'];
        const isImportant = importantReasons.some(r => reason.includes(r));
        
        if (isImportant || this.disconnectionCount % this.config.connectionLogInterval === 0 || activeConnections <= 5) {
            this.log('info', '🔌', `Player disconnected: ${socketId}, reason: ${reason} (${activeConnections} active)`);
        }
    }

    /**
     * Player joined session
     */
    playerJoinedSession(playerName, sessionId, playerCount) {
        this.log('info', '👤', `${playerName} joined session: ${sessionId} (${playerCount} players)`);
    }

    /**
     * Game command
     */
    gameCommand(socketId, command) {
        if (!this.config.enableCommandLogs) return;
        this.log('debug', '🎮', `Command from ${socketId}: ${command}`);
    }

    /**
     * Chat message
     */
    chatMessage(socketId, message) {
        if (!this.config.enableChatLogs) return;
        this.log('debug', '💬', `Chat from ${socketId}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    }

    /**
     * Error logging
     */
    error(message, error = null) {
        if (!this.config.enableErrorLogs) return;
        this.log('error', '❌', message, error ? { error: error.message, stack: error.stack } : null);
    }

    /**
     * Warning logging
     */
    warn(message, data = null) {
        this.log('warn', '⚠️', message, data);
    }

    /**
     * Server statistics
     */
    serverStats(activeConnections, sessions, totalPlayers) {
        if (activeConnections > 0 || sessions > 0) {
            this.log('info', '📊', `Server Stats: ${activeConnections} connections, ${sessions} sessions, ${totalPlayers} players`);
        }
    }

    /**
     * Connection limit exceeded
     */
    connectionLimitExceeded(socketId, activeConnections) {
        this.warn(`Connection limit exceeded. Rejecting: ${socketId}`, { activeConnections, limit: config.maxConnections });
    }

    /**
     * Session cleanup
     */
    sessionCleanup(sessionId) {
        this.log('info', '🧹', `Cleaned up expired session: ${sessionId}`);
    }

    playerJoined(playerName, sessionId, totalPlayers) {
        this.log('info', '👥', `${playerName} joined global session (${totalPlayers} total players)`);
    }

    /**
     * Rate limit exceeded
     */
    rateLimitExceeded(socketId, type = 'general') {
        this.warn(`Rate limit exceeded for ${socketId}`, { type });
    }
}

// Export singleton instance
module.exports = new Logger();
