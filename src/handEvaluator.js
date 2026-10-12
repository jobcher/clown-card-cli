// 牌型判断系统
import { RANK_VALUES, cardMatchesSuit } from './cards.js';

export const HAND_TYPES = {
  HIGH_CARD: { name: '高牌', chips: 5, mult: 1, order: 0 },
  PAIR: { name: '对子', chips: 10, mult: 2, order: 1 },
  TWO_PAIR: { name: '两对', chips: 20, mult: 2, order: 2 },
  THREE_OF_A_KIND: { name: '三条', chips: 30, mult: 3, order: 3 },
  STRAIGHT: { name: '顺子', chips: 30, mult: 4, order: 4 },
  FLUSH: { name: '同花', chips: 35, mult: 4, order: 5 },
  FULL_HOUSE: { name: '葫芦', chips: 40, mult: 4, order: 6 },
  FOUR_OF_A_KIND: { name: '炸弹', chips: 60, mult: 7, order: 7 },
  STRAIGHT_FLUSH: { name: '同花顺', chips: 100, mult: 8, order: 8 },
  ROYAL_FLUSH: { name: '皇家同花顺', chips: 100, mult: 8, order: 9 },
  FIVE_OF_A_KIND: { name: '五同', chips: 120, mult: 12, order: 11 },
  FLUSH_HOUSE: { name: '同花葫芦', chips: 140, mult: 14, order: 12 },
  FLUSH_FIVE: { name: '同花五条', chips: 160, mult: 16, order: 13 }
};

export class HandEvaluator {
  static evaluate(cards, options = {}) {
    if (cards.length < 1) return null;

    const minStraight = options.fourFingers ? 4 : 5;
    const minFlush = options.fourFingers ? 4 : 5;
    const sorted = [...cards].filter(card => card.enhancement !== 'stone').sort((a, b) => b.value - a.value);
    const rankCounts = this.getRankCounts(sorted);
    const suitCounts = this.getSuitCounts(sorted, options);

    const results = [];

    const flushFive = this.checkFlushFive(rankCounts, sorted, options);
    if (flushFive) results.push(flushFive);

    const fiveOfAKind = this.checkFiveOfAKind(rankCounts, sorted);
    if (fiveOfAKind) results.push(fiveOfAKind);

    const royalFlush = this.checkRoyalFlush(sorted, suitCounts, options);
    if (royalFlush) results.push(royalFlush);

    const straightFlush = this.checkStraightFlush(sorted, suitCounts, minStraight, options);
    if (straightFlush) results.push(straightFlush);

    const flushHouse = this.checkFlushHouse(rankCounts, sorted, options);
    if (flushHouse) results.push(flushHouse);

    const fourOfAKind = this.checkFourOfAKind(rankCounts, sorted);
    if (fourOfAKind) results.push(fourOfAKind);

    const fullHouse = this.checkFullHouse(rankCounts, sorted);
    if (fullHouse) results.push(fullHouse);

    const flush = this.checkFlush(suitCounts, sorted, minFlush, options);
    if (flush) results.push(flush);

    const straight = this.checkStraight(sorted, minStraight, options);
    if (straight) results.push(straight);

    const threeOfAKind = this.checkThreeOfAKind(rankCounts, sorted);
    if (threeOfAKind) results.push(threeOfAKind);

    const twoPair = this.checkTwoPair(rankCounts, sorted);
    if (twoPair) results.push(twoPair);

    const pair = this.checkPair(rankCounts, sorted);
    if (pair) results.push(pair);

    if (results.length > 0) {
      return results.sort((a, b) => HAND_TYPES[b.type].order - HAND_TYPES[a.type].order)[0];
    }

    const pool = sorted.length > 0 ? sorted : [...cards];
    return {
      type: 'HIGH_CARD',
      primaryCard: pool[0],
      cards: pool[0] ? [pool[0]] : [],
      chips: HAND_TYPES.HIGH_CARD.chips,
      mult: HAND_TYPES.HIGH_CARD.mult
    };
  }

  static getRankCounts(cards) {
    const counts = {};
    for (const card of cards) {
      if (card.enhancement === 'stone') continue;
      counts[card.rank] = (counts[card.rank] || 0) + 1;
    }
    return counts;
  }

  static getSuitCounts(cards, options = {}) {
    const counts = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 };
    for (const card of cards) {
      for (const suit of Object.keys(counts)) {
        if (cardMatchesSuit(card, suit, options)) counts[suit] += 1;
      }
    }
    return counts;
  }

  static cardsOfSuit(cards, suit, options = {}) {
    return cards.filter(card => cardMatchesSuit(card, suit, options));
  }

  static checkFlushFive(rankCounts, sorted, options = {}) {
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count < 5) continue;
      const cards = sorted.filter(card => card.rank === rank);
      const suits = this.getSuitCounts(cards, options);
      if (Object.values(suits).some(total => total >= 5)) {
        return {
          type: 'FLUSH_FIVE',
          primaryCard: cards[0],
          cards: cards.slice(0, 5),
          chips: HAND_TYPES.FLUSH_FIVE.chips,
          mult: HAND_TYPES.FLUSH_FIVE.mult
        };
      }
    }
    return null;
  }

  static checkFlushHouse(rankCounts, sorted, options = {}) {
    const full = this.checkFullHouse(rankCounts, sorted);
    if (!full) return null;
    const suits = this.getSuitCounts(full.cards, options);
    if (!Object.values(suits).some(total => total >= full.cards.length)) return null;
    return {
      type: 'FLUSH_HOUSE',
      primaryCard: full.primaryCard,
      cards: full.cards,
      chips: HAND_TYPES.FLUSH_HOUSE.chips,
      mult: HAND_TYPES.FLUSH_HOUSE.mult
    };
  }

  static checkFiveOfAKind(rankCounts, sorted) {
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count >= 5) {
        const cards = sorted.filter(c => c.rank === rank);
        return {
          type: 'FIVE_OF_A_KIND',
          primaryCard: cards[0],
          cards,
          chips: HAND_TYPES.FIVE_OF_A_KIND.chips,
          mult: HAND_TYPES.FIVE_OF_A_KIND.mult
        };
      }
    }
    return null;
  }

  static checkRoyalFlush(cards, suitCounts, options = {}) {
    const royalRanks = ['10', 'J', 'Q', 'K', 'A'];
    for (const [suit, count] of Object.entries(suitCounts)) {
      if (count >= 5) {
        const suitedCards = this.cardsOfSuit(cards, suit, options);
        const hasAllRoyal = royalRanks.every(rank => suitedCards.some(card => card.rank === rank));
        if (hasAllRoyal) {
          const royalCards = suitedCards.filter(card => royalRanks.includes(card.rank));
          return {
            type: 'ROYAL_FLUSH',
            primaryCard: royalCards.find(card => card.rank === 'A'),
            cards: royalCards,
            chips: HAND_TYPES.ROYAL_FLUSH.chips,
            mult: HAND_TYPES.ROYAL_FLUSH.mult
          };
        }
      }
    }
    return null;
  }

  static checkStraightFlush(cards, suitCounts, minStraight = 5, options = {}) {
    for (const [suit, count] of Object.entries(suitCounts)) {
      if (count >= minStraight) {
        const suitedCards = this.cardsOfSuit(cards, suit, options).sort((a, b) => b.value - a.value);
        const straight = this.findStraight(suitedCards, minStraight, options);
        if (straight) {
          return {
            type: 'STRAIGHT_FLUSH',
            primaryCard: straight[0],
            cards: straight,
            chips: HAND_TYPES.STRAIGHT_FLUSH.chips,
            mult: HAND_TYPES.STRAIGHT_FLUSH.mult
          };
        }
      }
    }
    return null;
  }

  static checkFourOfAKind(rankCounts, sorted) {
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count >= 4) {
        const cards = sorted.filter(c => c.rank === rank);
        return {
          type: 'FOUR_OF_A_KIND',
          primaryCard: cards[0],
          cards,
          chips: HAND_TYPES.FOUR_OF_A_KIND.chips,
          mult: HAND_TYPES.FOUR_OF_A_KIND.mult
        };
      }
    }
    return null;
  }

  static checkFullHouse(rankCounts, sorted) {
    let threeRank = null;
    let pairRank = null;

    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count >= 3 && !threeRank) {
        threeRank = rank;
      } else if (count >= 2 && !pairRank) {
        pairRank = rank;
      }
    }

    if (threeRank && pairRank) {
      const threeCards = sorted.filter(c => c.rank === threeRank).slice(0, 3);
      const pairCards = sorted.filter(c => c.rank === pairRank).slice(0, 2);
      return {
        type: 'FULL_HOUSE',
        primaryCard: threeCards[0],
        cards: [...threeCards, ...pairCards],
        chips: HAND_TYPES.FULL_HOUSE.chips,
        mult: HAND_TYPES.FULL_HOUSE.mult
      };
    }
    return null;
  }

  static checkFlush(suitCounts, sorted, minFlush = 5, options = {}) {
    for (const [suit, count] of Object.entries(suitCounts)) {
      const take = count >= 5 ? 5 : (count >= minFlush ? count : 0);
      if (take > 0) {
        const cards = this.cardsOfSuit(sorted, suit, options).slice(0, take);
        return {
          type: 'FLUSH',
          primaryCard: cards[0],
          cards,
          chips: HAND_TYPES.FLUSH.chips,
          mult: HAND_TYPES.FLUSH.mult
        };
      }
    }
    return null;
  }

  static checkStraight(sorted, minStraight = 5, options = {}) {
    const straight = this.findStraight(sorted, minStraight, options);
    if (straight) {
      return {
        type: 'STRAIGHT',
        primaryCard: straight[0],
        cards: straight,
        chips: HAND_TYPES.STRAIGHT.chips,
        mult: HAND_TYPES.STRAIGHT.mult
      };
    }
    return null;
  }

  static findStraight(cards, minLength = 5, options = {}) {
    const five = this.findStraightOfLength(cards, 5, false);
    if (five) return five;
    if (options.shortcut) {
      const gapped = this.findStraightOfLength(cards, 5, true);
      if (gapped) return gapped;
    }
    if (minLength <= 4) {
      const four = this.findStraightOfLength(cards, 4, false);
      if (four) return four;
      if (options.shortcut) return this.findStraightOfLength(cards, 4, true);
    }
    return null;
  }

  static findStraightOfLength(cards, length, shortcut = false) {
    if (cards.length < length) return null;
    const high = this.findStraightValues(cards.map(card => card.value), length, shortcut);
    if (high) return high.map(value => cards.find(card => card.value === value));
    const lowValues = cards.map(card => (card.value === 14 ? 1 : card.value));
    const low = this.findStraightValues(lowValues, length, shortcut);
    if (!low) return null;
    return low.map(value => cards.find(card => (value === 1 ? card.value === 14 : card.value === value)));
  }

  static findStraightValues(values, length, shortcut) {
    const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
    const allowed = (gap) => gap === 1 || (shortcut && gap === 2);
    for (let i = 0; i <= uniqueValues.length - length; i++) {
      let isStraight = true;
      for (let j = 0; j < length - 1; j++) {
        if (!allowed(uniqueValues[i + j] - uniqueValues[i + j + 1])) {
          isStraight = false;
          break;
        }
      }
      if (isStraight) return uniqueValues.slice(i, i + length);
    }
    return null;
  }

  static checkThreeOfAKind(rankCounts, sorted) {
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count >= 3) {
        const cards = sorted.filter(c => c.rank === rank);
        return {
          type: 'THREE_OF_A_KIND',
          primaryCard: cards[0],
          cards,
          chips: HAND_TYPES.THREE_OF_A_KIND.chips,
          mult: HAND_TYPES.THREE_OF_A_KIND.mult
        };
      }
    }
    return null;
  }

  static checkTwoPair(rankCounts, sorted) {
    const pairs = [];
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count >= 2) {
        pairs.push(rank);
      }
    }
    if (pairs.length >= 2) {
      pairs.sort((a, b) => RANK_VALUES[b] - RANK_VALUES[a]);
      const pair1Cards = sorted.filter(c => c.rank === pairs[0]).slice(0, 2);
      const pair2Cards = sorted.filter(c => c.rank === pairs[1]).slice(0, 2);
      return {
        type: 'TWO_PAIR',
        primaryCard: pair1Cards[0],
        cards: [...pair1Cards, ...pair2Cards],
        chips: HAND_TYPES.TWO_PAIR.chips,
        mult: HAND_TYPES.TWO_PAIR.mult
      };
    }
    return null;
  }

  static checkPair(rankCounts, sorted) {
    for (const [rank, count] of Object.entries(rankCounts)) {
      if (count >= 2) {
        const cards = sorted.filter(c => c.rank === rank);
        return {
          type: 'PAIR',
          primaryCard: cards[0],
          cards,
          chips: HAND_TYPES.PAIR.chips,
          mult: HAND_TYPES.PAIR.mult
        };
      }
    }
    return null;
  }
}
