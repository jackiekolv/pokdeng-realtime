/**
 * Deck management utilities for Pokdeng game
 */

// Card suits and values
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const VALUES = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];

/**
 * Generate a complete deck of cards using the original deck array
 * @returns {Array<string>} Array of card image filenames
 */
function generateDeck() {
    // Use the original deck array to match existing card images
    return [
        "ace_of_spades2.png","2_of_spades.png","3_of_spades.png","4_of_spades.png","5_of_spades.png","6_of_spades.png","7_of_spades.png","8_of_spades.png","9_of_spades.png","10_of_spades.png","jack_of_spades2.png","queen_of_spades2.png","king_of_spades2.png",
        "ace_of_hearts.png","2_of_hearts.png","3_of_hearts.png","4_of_hearts.png","5_of_hearts.png","6_of_hearts.png","7_of_hearts.png","8_of_hearts.png","9_of_hearts.png","10_of_hearts.png","jack_of_hearts2.png","queen_of_hearts2.png","king_of_hearts2.png",
        "ace_of_diamonds.png","2_of_diamonds.png","3_of_diamonds.png","4_of_diamonds.png","5_of_diamonds.png","6_of_diamonds.png","7_of_diamonds.png","8_of_diamonds.png","9_of_diamonds.png","10_of_diamonds.png","jack_of_diamonds2.png","queen_of_diamonds2.png","king_of_diamonds2.png",
        "ace_of_clubs.png","2_of_clubs.png","3_of_clubs.png","4_of_clubs.png","5_of_clubs.png","6_of_clubs.png","7_of_clubs.png","8_of_clubs.png","9_of_clubs.png","10_of_clubs.png","jack_of_clubs2.png","queen_of_clubs2.png","king_of_clubs2.png"
    ];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleDeck(array) {
    const shuffled = [...array]; // Create a copy to avoid mutating original
    
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
}

/**
 * Get card value for Pokdeng game
 * @param {string} cardFilename - Card filename
 * @returns {number} Card value (1-10)
 */
function getCardValue(cardFilename) {
    const cardName = cardFilename.split('_')[0];
    
    switch (cardName) {
        case 'ace':
            return 1;
        case 'jack':
        case 'queen':
        case 'king':
            return 10;
        default:
            return parseInt(cardName) || 0;
    }
}

/**
 * Calculate Pokdeng hand value
 * @param {Array<string>} cards - Array of card filenames
 * @returns {number} Hand value (0-9)
 */
function calculateHandValue(cards) {
    const total = cards.reduce((sum, card) => sum + getCardValue(card), 0);
    return total % 10;
}

/**
 * Get card suit from filename
 * @param {string} cardFilename - Card filename
 * @returns {string} Card suit
 */
function getCardSuit(cardFilename) {
    const parts = cardFilename.split('_');
    if (parts.length >= 3) {
        return parts[2].replace('.png', '').replace('2', '');
    }
    return '';
}

/**
 * Get card name from filename
 * @param {string} cardFilename - Card filename
 * @returns {string} Card name
 */
function getCardName(cardFilename) {
    return cardFilename.split('_')[0];
}

/**
 * Check if hand is a special Pokdeng combination
 * @param {Array<string>} cards - Array of card filenames
 * @returns {Object} Result with type, multiplier, and Thai name
 */
function checkSpecialHand(cards) {
    if (!cards || cards.length === 0) {
        return { type: 'normal', multiplier: 1, name: 'ปกติ' };
    }

    const values = cards.map(getCardValue);
    const suits = cards.map(getCardSuit);
    const names = cards.map(getCardName);
    const handValue = calculateHandValue(cards);

    console.log('Debug checkSpecialHand:', { cards, suits, values, handValue });

    // 3-card hands
    if (cards.length === 3) {
        // ตอง (Three of a kind) - 3 ใบเลขเดียวกัน
        if (values[0] === values[1] && values[1] === values[2]) {
            return { type: 'tong', multiplier: 5, name: 'ตอง' };
        }

        // เรียงฟลัช (Straight Flush) - 3 ใบเรียงกัน + ดอกเดียวกัน
        const sortedValues = [...values].sort((a, b) => a - b);
        const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
        const isStraight = checkStraight(sortedValues);

        if (isFlush && isStraight) {
            return { type: 'straight_flush', multiplier: 5, name: 'เรียงฟลัช' };
        }

        // เรียง (Straight) - 3 ใบเรียงกัน
        if (isStraight) {
            return { type: 'straight', multiplier: 3, name: 'เรียง' };
        }

        // สามเหลือง (Three court cards) - J Q K
        const courtCards = names.filter(name => ['jack', 'queen', 'king'].includes(name));
        if (courtCards.length === 3) {
            return { type: 'sam_luang', multiplier: 3, name: 'สามเหลือง' };
        }

        // สามเด้ง (Three same suit) - 3 ใบดอกเดียวกัน
        console.log('Debug สามเด้ง check:', { suits, isFlush, cards });
        if (isFlush) {
            console.log('Found สามเด้ง!');
            return { type: 'sam_deng', multiplier: 3, name: 'สามเด้ง' };
        }
    }

    // 2-card hands
    if (cards.length === 2) {
        // ป๊อก (Pokdeng) - 8 or 9 with 2 cards
        if (handValue >= 8) {
            const multiplier = handValue === 9 ? 2 : 1;
            return { type: 'pokdeng', multiplier, name: `ป๊อก${handValue}` };
        }

        // สองเด้ง (Same suit) - 2 ใบดอกเดียวกัน
        if (suits[0] === suits[1]) {
            return { type: 'song_deng', multiplier: 2, name: 'สองเด้ง' };
        }

        // คู่ (Pair) - 2 ใบเลขเดียวกัน
        if (values[0] === values[1]) {
            return { type: 'pair', multiplier: 2, name: 'คู่' };
        }
    }

    return { type: 'normal', multiplier: 1, name: 'ปกติ' };
}

/**
 * Check if values form a straight
 * @param {Array<number>} sortedValues - Sorted card values
 * @returns {boolean} True if straight
 */
function checkStraight(sortedValues) {
    if (sortedValues.length !== 3) return false;

    // Normal straight
    if (sortedValues[1] - sortedValues[0] === 1 && sortedValues[2] - sortedValues[1] === 1) {
        return true;
    }

    // Special case: A-K-Q (treat A as 14)
    if (sortedValues[0] === 1 && sortedValues[1] === 10 && sortedValues[2] === 10) {
        // Need to check actual card names for K-Q-A
        return false; // This needs more complex logic, skip for now
    }

    return false;
}

module.exports = {
    generateDeck,
    shuffleDeck,
    getCardValue,
    getCardSuit,
    getCardName,
    calculateHandValue,
    checkSpecialHand,
    checkStraight,
    SUITS,
    VALUES
};
