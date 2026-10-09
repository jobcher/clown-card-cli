// 游戏主逻辑
import { Deck, Hand } from './cards.js';
import { HandEvaluator, HAND_TYPES } from './handEvaluator.js';
import {
  BLIND_REWARDS,
  bossForAnte,
  getScoreRequired as blindScoreRequired
} from './blinds.js';

const BASE_HANDS = 4;
const BASE_DISCARDS = 3;
const BASE_HAND_SIZE = 8;

export class GameState {
  constructor() {
    this.round = 1;
    this.ante = 1;
    this.blind = 'small';
    this.bossId = null;
    this.money = 4;
    this.handsRemaining = BASE_HANDS;
    this.discardsRemaining = BASE_DISCARDS;
    this.discardsUsed = 0;
    this.handSize = BASE_HAND_SIZE;
    this.score = 0;
    this.scoreRequired = 0;
    this.playedHandTypes = [];
    this.handTypeCounts = {};

    this.deck = new Deck();
    this.hand = new Hand();
    this.jokers = [];
    this.maxJokers = 5;

    this.isFirstHand = true;
    this.beginBlind();
  }

  getScoreRequired() {
    return blindScoreRequired(this.ante, this.blind, this.bossId);
  }

  isCardDebuffed(card) {
    return this.bossId === 'plant' && card.isFaceCard();
  }

  hasFourFingers() {
    return this.jokers.some(joker => joker.enabled && joker.id === 'four_fingers');
  }

  countNines() {
    return [...this.deck.cards, ...this.deck.discardPile, ...this.hand.cards]
      .filter(card => card.rank === '9').length;
  }

  roundStats() {
    const stats = {
      hands: BASE_HANDS,
      discards: BASE_DISCARDS,
      handSize: BASE_HAND_SIZE
    };
    for (const joker of this.jokers) {
      joker.modifyRound(stats);
    }
    if (this.bossId === 'water') stats.discards = 0;
    if (this.bossId === 'needle') stats.hands = 1;
    return stats;
  }

  beginBlind() {
    this.bossId = this.blind === 'boss' ? bossForAnte(this.ante).id : null;
    const stats = this.roundStats();

    this.handsRemaining = stats.hands;
    this.discardsRemaining = stats.discards;
    this.discardsUsed = 0;
    this.handSize = stats.handSize;
    this.playedHandTypes = [];
    this.score = 0;
    this.scoreRequired = this.getScoreRequired();
    this.isFirstHand = true;

    this.deck = new Deck();
    this.hand = new Hand();
    this.hand.maxSize = this.handSize;
    this.hand.addCards(this.deck.draw(this.handSize));
    this.hand.sortByRank();
  }

  drawInitialHand() {
    this.beginBlind();
  }

  buildEffectState(playedCards, handResult) {
    const played = new Set(playedCards || []);
    return {
      hand: playedCards || [],
      handResult,
      heldCards: this.hand.cards.filter(card => !played.has(card)),
      money: this.money,
      discardsRemaining: this.discardsRemaining,
      discardsUsed: this.discardsUsed,
      jokerCount: this.jokers.length,
      isFirstHand: this.isFirstHand,
      handsRemaining: this.handsRemaining,
      handTypeCounts: this.handTypeCounts,
      ninesInDeck: this.countNines(),
      isDebuffed: (card) => this.isCardDebuffed(card)
    };
  }

  jokerScoreEffect(index, state) {
    const joker = this.jokers[index];
    if (!joker.enabled) return {};
    if (joker.id === 'blueprint') {
      const next = this.jokers[index + 1];
      if (!next || !next.enabled || next.id === 'blueprint') return {};
      return next.applyEffect(state);
    }
    return joker.applyEffect(state);
  }

  playHand(selectedIndices) {
    if (this.handsRemaining <= 0) return null;

    if (this.bossId === 'psychic' && selectedIndices.length !== 5) {
      return { error: '灵媒：必须正好打出 5 张牌' };
    }

    const selectedCards = selectedIndices.map(index => this.hand.cards[index]);
    const handResult = HandEvaluator.evaluate(selectedCards, {
      fourFingers: this.hasFourFingers()
    });

    if (!handResult) return null;

    if (this.bossId === 'eye' && this.playedHandTypes.includes(handResult.type)) {
      const name = HAND_TYPES[handResult.type].name;
      return { error: `眼睛：本盲注已经打出过${name}` };
    }

    this.handTypeCounts[handResult.type] = (this.handTypeCounts[handResult.type] || 0) + 1;
    this.playedHandTypes.push(handResult.type);

    const state = this.buildEffectState(selectedCards, handResult);

    let chipBonus = 0;
    let multBonus = 0;
    let multMult = 1;
    let scoreMult = 1;

    const hasOops = this.jokers.some(joker => joker.id === 'oops' && joker.enabled);
    const extraMultFromOops = hasOops ? (this.jokers.length - 1) * 6 : 0;

    for (let i = 0; i < this.jokers.length; i++) {
      const effect = this.jokerScoreEffect(i, state);
      chipBonus += effect.chipBonus || 0;
      multBonus += effect.multBonus || 0;
      if (effect.multMult !== undefined) {
        multMult *= effect.multMult;
      }
      if (effect.scoreMult !== undefined) {
        scoreMult = effect.scoreMult;
      }
    }

    multBonus += extraMultFromOops;

    let handChips = handResult.chips;
    let handMult = handResult.mult;
    if (this.bossId === 'flint') {
      handChips = Math.max(1, Math.floor(handChips / 2));
      handMult = Math.max(1, Math.floor(handMult / 2));
    }

    const cardChips = handResult.cards.reduce((sum, card) => {
      if (this.isCardDebuffed(card)) return sum;
      return sum + card.getChipValue();
    }, 0);

    const bonusChips = selectedCards.reduce((sum, card) => {
      if (this.isCardDebuffed(card)) return sum;
      return sum + (card.bonusChips || 0);
    }, 0);
    const bonusMult = selectedCards.reduce((sum, card) => {
      if (this.isCardDebuffed(card)) return sum;
      return sum + (card.bonusMult || 0);
    }, 0);

    const totalChips = cardChips + handChips + chipBonus + bonusChips;
    let totalMult = Math.max(1, handMult + multBonus + bonusMult) * multMult;
    let roundScore = Math.floor(totalChips * totalMult * scoreMult);

    this.score += roundScore;
    this.handsRemaining--;

    const removed = this.hand.removeCards(selectedIndices);
    this.deck.discard(removed);

    if (this.bossId === 'hook' && this.hand.cards.length > 0) {
      const count = Math.min(2, this.hand.cards.length);
      const pool = this.hand.cards.map((_, index) => index);
      const hookIndices = [];
      for (let i = 0; i < count; i++) {
        const pick = Math.floor(Math.random() * pool.length);
        hookIndices.push(pool.splice(pick, 1)[0]);
      }
      this.deck.discard(this.hand.removeCards(hookIndices));
    }

    const deficit = this.handSize - this.hand.cards.length;
    if (deficit > 0) {
      this.hand.addCards(this.deck.draw(deficit));
    }
    this.hand.sortByRank();
    this.isFirstHand = false;

    return {
      handResult,
      chips: totalChips,
      mult: totalMult,
      score: roundScore,
      cardChips
    };
  }

  discard(indices) {
    if (this.discardsRemaining <= 0) return false;

    const removed = this.hand.removeCards(indices);
    this.deck.discard(removed);

    const state = this.buildEffectState([], null);
    for (const joker of this.jokers) {
      joker.onDiscard(state);
    }

    this.discardsUsed++;
    this.discardsRemaining--;

    const deficit = this.handSize - this.hand.cards.length;
    if (deficit > 0) {
      this.hand.addCards(this.deck.draw(deficit));
    }
    this.hand.sortByRank();
    return true;
  }

  isRoundComplete() {
    return this.score >= this.scoreRequired || this.handsRemaining <= 0;
  }

  isVictory() {
    return this.score >= this.scoreRequired;
  }

  isAnteFinalBoss() {
    return this.ante === 8 && this.blind === 'boss';
  }

  cashOut() {
    const interest = Math.min(5, Math.floor(this.money / 5));
    const reward = BLIND_REWARDS[this.blind] ?? 0;
    const handsBonus = this.handsRemaining;
    const state = this.buildEffectState([], null);
    const jokerPayouts = [];

    for (const joker of this.jokers) {
      const amount = joker.onCashOut(state);
      if (amount) {
        jokerPayouts.push({ name: joker.name, amount });
      }
    }

    const jokerBonus = jokerPayouts.reduce((sum, entry) => sum + entry.amount, 0);
    const total = interest + reward + handsBonus + jokerBonus;
    this.money += total;

    return { interest, reward, handsBonus, jokerBonus, jokerPayouts, total };
  }

  advanceBlind() {
    if (this.blind === 'boss') {
      for (const joker of this.jokers) {
        if (joker.id === 'rocket') {
          joker.data.payout = (joker.data.payout || 1) + 2;
        }
      }
      this.ante += 1;
      this.blind = 'small';
    } else if (this.blind === 'small') {
      this.blind = 'big';
    } else {
      this.blind = 'boss';
    }

    this.round += 1;
    this.beginBlind();
    return true;
  }

  nextRound() {
    if (!this.isVictory()) return false;
    return this.advanceBlind();
  }

  buyJoker(joker) {
    if (this.money < joker.cost) return false;
    if (this.jokers.length >= this.maxJokers) return false;

    this.money -= joker.cost;
    this.jokers.push(joker);
    return true;
  }

  sellJoker(index) {
    if (index < 0 || index >= this.jokers.length) return null;

    const joker = this.jokers[index];
    const sellPrice = Math.max(1, Math.floor(joker.cost / 3));
    this.money += sellPrice;
    this.jokers.splice(index, 1);
    return { joker, sellPrice };
  }
}
