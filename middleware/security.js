/**
 * Security middleware for Pokdeng game
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware
 */
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: 'Too many requests from this IP, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

/**
 * Socket.IO rate limiting
 */
class SocketRateLimit {
    constructor(maxRequests = 30, windowMs = 60 * 1000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.clients = new Map();
        
        // Clean up old entries every minute
        setInterval(() => {
            this.cleanup();
        }, 60 * 1000);
    }

    /**
     * Check if client is within rate limit
     * @param {string} clientId - Socket ID
     * @returns {boolean} True if within limit
     */
    checkLimit(clientId) {
        const now = Date.now();
        const clientData = this.clients.get(clientId) || { requests: [], blocked: false };
        
        // Remove old requests outside the window
        clientData.requests = clientData.requests.filter(
            timestamp => now - timestamp < this.windowMs
        );
        
        // Check if client is blocked
        if (clientData.blocked && clientData.requests.length === 0) {
            clientData.blocked = false;
        }
        
        if (clientData.blocked) {
            return false;
        }
        
        // Check rate limit
        if (clientData.requests.length >= this.maxRequests) {
            clientData.blocked = true;
            this.clients.set(clientId, clientData);
            return false;
        }
        
        // Add current request
        clientData.requests.push(now);
        this.clients.set(clientId, clientData);
        
        return true;
    }

    /**
     * Clean up old client data
     */
    cleanup() {
        const now = Date.now();
        for (const [clientId, clientData] of this.clients.entries()) {
            clientData.requests = clientData.requests.filter(
                timestamp => now - timestamp < this.windowMs
            );
            
            if (clientData.requests.length === 0 && !clientData.blocked) {
                this.clients.delete(clientId);
            }
        }
    }

    /**
     * Get client stats
     * @param {string} clientId - Socket ID
     * @returns {Object} Client rate limit stats
     */
    getStats(clientId) {
        const clientData = this.clients.get(clientId);
        if (!clientData) {
            return { requests: 0, blocked: false };
        }
        
        return {
            requests: clientData.requests.length,
            blocked: clientData.blocked,
            maxRequests: this.maxRequests,
            windowMs: this.windowMs
        };
    }
}

/**
 * Input sanitization
 */
const sanitizeInput = (input) => {
    if (typeof input !== 'string') {
        return input;
    }
    
    return input
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
};

/**
 * Validate session ID format
 */
const isValidSessionId = (sessionId) => {
    if (!sessionId || typeof sessionId !== 'string') {
        return false;
    }
    
    // Session ID should be alphanumeric and reasonable length
    return /^[a-zA-Z0-9]{10,30}$/.test(sessionId);
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Remove server header
    res.removeHeader('X-Powered-By');
    
    next();
};

/**
 * CORS configuration
 */
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] // Replace with your actual domain
        : ['http://localhost:3000', 'http://localhost:5000'],
    methods: ['GET', 'POST'],
    credentials: true
};

module.exports = {
    createRateLimit,
    SocketRateLimit,
    sanitizeInput,
    isValidSessionId,
    securityHeaders,
    corsOptions
};
