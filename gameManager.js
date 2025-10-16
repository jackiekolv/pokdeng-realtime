/**
 * Game Manager for Pokdeng Real-time Game
 */

const { generateDeck, shuffleDeck, calculateHandValue, checkSpecialHand } = require('./deck');
const logger = require('./utils/logger');

class GameSession {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.deck = shuffleDeck(generateDeck());
        this.currentCardIndex = 0;
        this.players = new Map();
        this.createdAt = new Date();
        this.lastActivity = new Date();
        this.hostId = null; // Track current host
        this.hostName = null;
    }

    /**
     * Add a player to the session
     * @param {string} playerId - Socket ID
     * @param {string} playerName - Player name
     * @param {string} userId - Persistent user ID
     * @param {boolean} wasHost - Whether user was previously host
     */
    addPlayer(playerId, playerName, userId = null, wasHost = false) {
        this.players.set(playerId, {
            id: playerId,
            name: playerName,
            userId: userId,
            cards: [],
            handValue: 0,
            isActive: true,
            wasHost: wasHost,
            joinedAt: new Date(),
            chips: 0, // Starting chips
            currentBet: 0,
            betLocked: false
        });

        // Set first player as host if no host exists
        // Or if this player was previously host, give them priority
        if (!this.hostId || wasHost) {
            this.hostId = playerId;
            this.hostName = playerName;
        }

        this.updateActivity();
    }

    /**
     * Remove a player from the session
     * @param {string} playerId - Socket ID
     */
    removePlayer(playerId) {
        this.players.delete(playerId);

        // If host left, assign new host
        if (this.hostId === playerId) {
            const remainingPlayers = Array.from(this.players.values());
            if (remainingPlayers.length > 0) {
                this.hostId = remainingPlayers[0].id;
                this.hostName = remainingPlayers[0].name;
            } else {
                this.hostId = null;
                this.hostName = null;
            }
        }

        this.updateActivity();
    }

    /**
     * Deal initial cards to a player (2 cards for Pokdeng)
     * @param {string} playerId - Socket ID
     * @returns {Object} Result with cards and hand info
     */
    dealInitialCards(playerId) {
        if (!this.players.has(playerId)) {
            throw new Error('Player not found in session');
        }

        const player = this.players.get(playerId);

        // Check if player already has cards
        if (player.cards.length > 0) {
            return {
                cards: player.cards,
                handValue: player.handValue,
                specialHand: checkSpecialHand(player.cards),
                remainingCards: this.deck.length - this.currentCardIndex
            };
        }

        if (this.currentCardIndex + 2 > this.deck.length) {
            this.reshuffleDeck();
        }

        // Deal 2 cards from shared deck
        const cards = [
            this.deck[this.currentCardIndex++],
            this.deck[this.currentCardIndex++]
        ];

        player.cards = cards;
        player.handValue = calculateHandValue(cards);

        const specialHand = checkSpecialHand(cards);

        this.updateActivity();

        return {
            cards,
            handValue: player.handValue,
            specialHand,
            remainingCards: this.deck.length - this.currentCardIndex
        };
    }

    /**
     * Deal one additional card to a player
     * @param {string} playerId - Socket ID
     * @returns {Object} Result with new card and updated hand info
     */
    hitCard(playerId) {
        if (!this.players.has(playerId)) {
            throw new Error('Player not found in session');
        }

        const player = this.players.get(playerId);
        
        if (player.cards.length >= 3) {
            throw new Error('Player already has maximum cards');
        }

        if (this.currentCardIndex >= this.deck.length) {
            this.reshuffleDeck();
        }

        const newCard = this.deck[this.currentCardIndex++];
        player.cards.push(newCard);
        player.handValue = calculateHandValue(player.cards);

        const specialHand = checkSpecialHand(player.cards);

        this.updateActivity();

        return {
            card: newCard,
            allCards: player.cards,
            handValue: player.handValue,
            specialHand,
            remainingCards: this.deck.length - this.currentCardIndex
        };
    }

    /**
     * Reshuffle the deck and reset all players' cards
     */
    reshuffleDeck() {
        this.deck = shuffleDeck(generateDeck());
        this.currentCardIndex = 0;

        // Clear all players' cards and reset betting when shuffling
        for (const player of this.players.values()) {
            player.cards = [];
            player.handValue = 0;
            player.betLocked = false;
        }

        this.updateActivity();
    }

    /**
     * Change host to a new player
     * @param {string} newHostId - New host socket ID
     * @returns {Object} Host change result
     */
    changeHost(newHostId) {
        const newHost = this.players.get(newHostId);
        if (!newHost) {
            return { success: false, error: 'Player not found' };
        }

        this.hostId = newHostId;
        this.hostName = newHost.name;
        this.updateActivity();

        return {
            success: true,
            hostId: this.hostId,
            hostName: this.hostName
        };
    }

    /**
     * Place a bet for a player
     * @param {string} playerId - Socket ID
     * @param {number} amount - Bet amount
     * @returns {Object} Bet result
     */
    placeBet(playerId, amount) {
        const player = this.players.get(playerId);
        if (!player) {
            return { success: false, error: 'Player not found' };
        }

        if (player.betLocked) {
            return { success: false, error: 'Bet already locked' };
        }

        // Allow negative chips - remove this check
        // if (amount > player.chips) {
        //     return { success: false, error: 'Insufficient chips' };
        // }

        if (amount <= 0) {
            return { success: false, error: 'Invalid bet amount' };
        }

        player.currentBet = amount;
        this.updateActivity();

        return {
            success: true,
            playerId,
            playerName: player.name,
            betAmount: amount,
            remainingChips: player.chips
        };
    }

    /**
     * Lock all bets when cards are dealt
     */
    lockAllBets() {
        for (const player of this.players.values()) {
            if (player.currentBet > 0) {
                player.betLocked = true;
            }
        }
        this.updateActivity();
    }

    /**
     * Calculate and distribute winnings
     * @param {string} hostId - Host player ID
     * @returns {Object} Results for all players
     */
    calculateWinnings(hostId) {
        const host = this.players.get(hostId);
        if (!host || host.cards.length === 0) {
            return { success: false, error: 'Host has no cards' };
        }

        const hostHand = checkSpecialHand(host.cards);
        const hostValue = host.handValue;
        const results = [];

        for (const [playerId, player] of this.players.entries()) {
            if (playerId === hostId || player.currentBet === 0) {
                continue; // Skip host and players with no bet
            }

            if (player.cards.length === 0) {
                continue; // Skip players with no cards
            }

            const playerHand = checkSpecialHand(player.cards);
            const playerValue = player.handValue;
            const betAmount = player.currentBet;

            let result = this.compareHands(playerHand, playerValue, hostHand, hostValue);
            let winAmount = 0;

            if (result === 'win') {
                winAmount = betAmount * playerHand.multiplier;
                player.chips += winAmount;
                host.chips -= winAmount;
            } else if (result === 'lose') {
                winAmount = -betAmount;
                player.chips -= betAmount;
                host.chips += betAmount;
            }
            // Draw: no chips change

            results.push({
                playerId,
                playerName: player.name,
                playerHand,
                playerValue,
                betAmount,
                result,
                winAmount,
                newChips: player.chips
            });

            // Reset bet
            player.currentBet = 0;
            player.betLocked = false;
        }

        // Reset host bet
        host.currentBet = 0;
        host.betLocked = false;

        this.updateActivity();

        return {
            success: true,
            hostHand,
            hostValue,
            hostChips: host.chips,
            results
        };
    }

    /**
     * Compare two hands to determine winner
     * @param {Object} playerHand - Player's hand info
     * @param {number} playerValue - Player's hand value
     * @param {Object} hostHand - Host's hand info
     * @param {number} hostValue - Host's hand value
     * @returns {string} 'win', 'lose', or 'draw'
     */
    compareHands(playerHand, playerValue, hostHand, hostValue) {
        // Special hand rankings (higher is better)
        const handRanks = {
            'tong': 8,
            'straight_flush': 7,
            'sam_luang': 6,
            'straight': 5,
            'sam_deng': 4,
            'pokdeng': 3,
            'song_deng': 2,
            'pair': 2,
            'normal': 1
        };

        const playerRank = handRanks[playerHand.type] || 1;
        const hostRank = handRanks[hostHand.type] || 1;

        // Compare by hand type first
        if (playerRank > hostRank) {
            return 'win';
        } else if (playerRank < hostRank) {
            return 'lose';
        }

        // Same hand type, compare by value
        if (playerValue > hostValue) {
            return 'win';
        } else if (playerValue < hostValue) {
            return 'lose';
        }

        // Same value
        return 'draw';
    }

    /**
     * Get host information
     * @returns {Object} Host info
     */
    getHostInfo() {
        return {
            hostId: this.hostId,
            hostName: this.hostName
        };
    }

    /**
     * Check if player is host
     * @param {string} playerId - Socket ID
     * @returns {boolean} Is host
     */
    isHost(playerId) {
        return this.hostId === playerId;
    }

    /**
     * Get session statistics
     * @returns {Object} Session stats
     */
    getStats() {
        return {
            sessionId: this.sessionId,
            playerCount: this.players.size,
            remainingCards: this.deck.length - this.currentCardIndex,
            createdAt: this.createdAt,
            lastActivity: this.lastActivity,
            hostInfo: this.getHostInfo(),
            players: Array.from(this.players.values()).map(player => ({
                id: player.id,
                name: player.name,
                cardCount: player.cards.length,
                handValue: player.handValue,
                isActive: player.isActive
            }))
        };
    }

    /**
     * Update last activity timestamp
     */
    updateActivity() {
        this.lastActivity = new Date();
    }

    /**
     * Check if session is expired (inactive for more than 1 hour)
     * @returns {boolean}
     */
    isExpired() {
        const oneHour = 60 * 60 * 1000;
        return Date.now() - this.lastActivity.getTime() > oneHour;
    }
}

class GameManager {
    constructor() {
        this.sessions = new Map();
        this.playerSessions = new Map(); // Track which session each player is in
        
        // Clean up expired sessions every 30 minutes
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 30 * 60 * 1000);
    }

    /**
     * Create or join a game session
     * @param {string} sessionId - Session ID (optional, creates new if not provided)
     * @param {string} playerId - Socket ID
     * @param {string} playerName - Player name
     * @param {string} userId - Persistent user ID
     * @param {boolean} wasHost - Whether user was previously host
     * @returns {GameSession} Game session
     */
    joinSession(sessionId, playerId, playerName, userId = null, wasHost = false) {
        // Remove player from any existing session
        this.leaveSession(playerId);

        if (!sessionId || !this.sessions.has(sessionId)) {
            sessionId = sessionId || this.generateSessionId();
            this.sessions.set(sessionId, new GameSession(sessionId));
        }

        const session = this.sessions.get(sessionId);
        session.addPlayer(playerId, playerName, userId, wasHost);
        this.playerSessions.set(playerId, sessionId);

        return session;
    }

    /**
     * Remove player from their current session
     * @param {string} playerId - Socket ID
     */
    leaveSession(playerId) {
        const sessionId = this.playerSessions.get(playerId);
        if (sessionId && this.sessions.has(sessionId)) {
            const session = this.sessions.get(sessionId);
            session.removePlayer(playerId);
            
            // Remove empty sessions
            if (session.players.size === 0) {
                this.sessions.delete(sessionId);
            }
        }
        this.playerSessions.delete(playerId);
    }

    /**
     * Get session for a player
     * @param {string} playerId - Socket ID
     * @returns {GameSession|null} Game session or null
     */
    getPlayerSession(playerId) {
        const sessionId = this.playerSessions.get(playerId);
        return sessionId ? this.sessions.get(sessionId) : null;
    }

    /**
     * Generate a unique session ID
     * @returns {string} Session ID
     */
    generateSessionId() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.isExpired()) {
                // Remove all players from expired session
                for (const playerId of session.players.keys()) {
                    this.playerSessions.delete(playerId);
                }
                this.sessions.delete(sessionId);
                logger.sessionCleanup(sessionId);
            }
        }
    }

    /**
     * Get all active sessions
     * @returns {Array} Array of session stats
     */
    getAllSessions() {
        return Array.from(this.sessions.values()).map(session => session.getStats());
    }
}

module.exports = { GameManager, GameSession };
