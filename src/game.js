// 游戏主逻辑
import { Deck, Hand } from './cards.js';
import { HAND_TYPES, HandEvaluator } from './handEvaluator.js';
import { createHandLevels, upgradeHand as upgradeHandLevel } from './handLevels.js';
import { isFaceCard, scorePlayedHand, sourceJoker } from './scoring.js';
import {
  applyConsumable,
  createConsumable,
  CONSUMABLES,
  PACKS,
  planetForHand,
  randomConsumable,
  rollPack,
  selectionFor
} from './consumables.js';
import { randomJokerByRarity, rarityWeights } from './jokers.js';
import {
  BLIND_REWARDS,
  bossForAnte,
  getScoreRequired as blindScoreRequired
} from './blinds.js';

const BASE_HANDS = 4;
const BASE_DISCARDS = 3;
const BASE_HAND_SIZE = 8;
const CONSUMABLE_IDS = new Set(CONSUMABLES.map(card => card.id));

export class GameState {
  constructor() {
    this.round = 1;
    this.ante = 1;
    this.blind = 'small';
    this.bossId = null;
    this.bossDisabled = false;
    this.money = 4;
    this.handsRemaining = BASE_HANDS;
    this.discardsRemaining = BASE_DISCARDS;
    this.discardsUsed = 0;
    this.handSize = BASE_HAND_SIZE;
    this.handSizeMod = 0;
    this.baseHands = BASE_HANDS;
    this.baseDiscards = BASE_DISCARDS;
    this.score = 0;
    this.scoreRequired = 0;
    this.playedHandTypes = [];
    this.handTypeCounts = {};
    this.handLevels = createHandLevels();
    this.consumables = [];
    this.maxConsumables = 2;
    this.pendingJokers = [];
    this.chaosUsed = false;
    this.stats = { tarotsUsed: 0, planetsUsed: 0, uniquePlanets: [], lastConsumable: null };
    this.flags = { grosMichelExtinct: false, blindsSkipped: 0, doubleNextPayout: false };
    this.rarityBonus = 0;

    this.deck = new Deck();
    this.hand = new Hand();
    this.jokers = [];
    this.maxJokers = 5;

    this.isFirstHand = true;
    this.lastPlay = null;
    this.beginBlind();
  }

  getScoreRequired() {
    const bossId = this.bossDisabled ? null : this.bossId;
    return blindScoreRequired(this.ante, this.blind, bossId);
  }

  isCardDebuffed(card) {
    if (!card) return false;
    if (card.debuffed) return true;
    if (this.bossDisabled) return false;
    return this.bossId === 'plant' && isFaceCard(card, this);
  }

  hasEffect(id) {
    for (let index = 0; index < this.jokers.length; index++) {
      const pair = sourceJoker(this, index);
      if (pair?.source?.id === id) return true;
    }
    return false;
  }

  probability(chance) {
    return this.hasEffect('oops') ? Math.min(1, chance * 2) : chance;
  }

  evalOptions() {
    return {
      fourFingers: this.hasEffect('four_fingers'),
      shortcut: this.hasEffect('shortcut'),
      smeared: this.hasEffect('smeared')
    };
  }

  hasFourFingers() {
    return this.hasEffect('four_fingers');
  }

  countNines() {
    return [...this.deck.cards, ...this.deck.discardPile, ...this.hand.cards]
      .filter(card => card.rank === '9' && card.enhancement !== 'stone').length;
  }

  jokerSlotsUsed() {
    return this.jokers.filter(joker => joker.edition !== 'negative' && !joker.pendingDestroy).length;
  }

  canAddJoker(joker) {
    if (!joker) return false;
    return joker.edition === 'negative' || this.jokerSlotsUsed() < this.maxJokers;
  }

  usedConsumableSlots() {
    return this.consumables.filter(card => !card.negative).length;
  }

  triggerJokers(name) {
    const snapshot = [...this.jokers];
    for (const joker of snapshot) {
      if (joker.pendingDestroy) continue;
      const index = this.jokers.indexOf(joker);
      if (index < 0) continue;
      const pair = sourceJoker(this, index);
      if (!pair || pair.source.pendingDestroy) continue;
      pair.source[name]?.(this);
    }
    this.cleanupJokers();
  }

  cleanupJokers() {
    this.jokers = this.jokers.filter(joker => !joker.pendingDestroy && !joker.destroyed);
  }

  roundStats() {
    const stats = {
      hands: BASE_HANDS,
      discards: BASE_DISCARDS,
      handSize: BASE_HAND_SIZE + this.handSizeMod
    };
    for (let index = 0; index < this.jokers.length; index++) {
      sourceJoker(this, index)?.source.modifyRound(stats);
    }
    stats.hands = Math.max(1, stats.hands);
    stats.discards = Math.max(0, stats.discards);
    stats.handSize = Math.max(1, stats.handSize);
    this.baseHands = stats.hands;
    this.baseDiscards = stats.discards;
    if (!this.bossDisabled && this.bossId === 'water') stats.discards = 0;
    if (!this.bossDisabled && this.bossId === 'needle') stats.hands = 1;
    return stats;
  }

  beginBlind() {
    this.bossId = this.blind === 'boss' ? bossForAnte(this.ante).id : null;
    this.bossDisabled = this.hasEffect('chicot');
    const stats = this.roundStats();

    this.handsRemaining = stats.hands;
    this.discardsRemaining = stats.discards;
    this.discardsUsed = 0;
    this.handSize = stats.handSize;
    this.playedHandTypes = [];
    this.score = 0;
    this.scoreRequired = this.getScoreRequired();
    this.isFirstHand = true;
    this.lastPlay = null;

    if (this.hand?.cards?.length) this.deck.cards.push(...this.hand.cards);
    this.deck.cards.push(...this.deck.discardPile);
    this.deck.discardPile = [];
    this.deck.shuffle();

    this.hand = new Hand();
    this.hand.maxSize = Math.max(this.handSize, 1);
    this.hand.addCards(this.deck.draw(this.handSize));
    this.hand.sortByRank();
    this.triggerJokers('onBlindSelected');
  }

  drawInitialHand() {
    this.beginBlind();
  }

  upgradeHand(type) {
    return upgradeHandLevel(this.handLevels, type);
  }

  noteTarot(id) {
    this.stats.tarotsUsed += 1;
    this.stats.lastConsumable = id;
  }

  notePlanet(id) {
    this.stats.planetsUsed += 1;
    if (id && !this.stats.uniquePlanets.includes(id)) this.stats.uniquePlanets.push(id);
    this.stats.lastConsumable = id;
    this.triggerJokers('onPlanet');
  }

  onPlayingCardAdded() {
    this.triggerJokers('onPlayingCard');
  }

  noteCardDestroyed(card) {
    for (let index = 0; index < this.jokers.length; index++) {
      const pair = sourceJoker(this, index);
      pair?.source.onCardDestroyed?.(card, this);
    }
  }

  gainConsumable(kindOrId) {
    const card = CONSUMABLE_IDS.has(kindOrId)
      ? createConsumable(kindOrId, this)
      : randomConsumable(kindOrId, this);
    return this.addConsumable(card);
  }

  addConsumable(card) {
    if (!card) return null;
    if (!card.negative && this.usedConsumableSlots() >= this.maxConsumables) return null;
    this.consumables.push(card);
    return card;
  }

  gainJoker(rarity) {
    const joker = randomJokerByRarity(rarity, this);
    if (!this.canAddJoker(joker)) return null;
    this.jokers.push(joker);
    return joker;
  }

  useConsumable(index, indices = []) {
    const card = this.consumables[index];
    if (!card) return '没有这张消耗牌';
    const targets = indices.map(choice => this.hand.cards[choice]).filter(Boolean);
    const rule = selectionFor(this, card);
    if (rule && (targets.length < rule[0] || targets.length > rule[1])) return '选牌数量不对';
    this.consumables.splice(index, 1);
    return applyConsumable(this, card, targets);
  }

  packCost(packId) {
    if (packId === 'celestial' && this.hasEffect('astronomer')) return 0;
    return PACKS[packId]?.cost ?? 4;
  }

  buyPack(packId) {
    const cost = this.packCost(packId);
    if (this.money < cost || !PACKS[packId]) return null;
    this.money -= cost;
    this.triggerJokers('onPackOpened');
    return rollPack(packId, this);
  }

  skipPack() {
    this.triggerJokers('onPackSkipped');
  }

  takeReroll() {
    const free = this.hasEffect('chaos') && !this.chaosUsed;
    const cost = free ? 0 : 5;
    if (this.money < cost) return false;
    this.money -= cost;
    if (free) this.chaosUsed = true;
    this.triggerJokers('onReroll');
    return true;
  }

  drawUp() {
    const deficit = this.handSize - this.hand.cards.length;
    if (deficit > 0) this.hand.addCards(this.deck.draw(deficit));
    this.hand.sortByRank();
  }

  resolveDiscard(cards, spend) {
    const destroyed = new Set();
    for (let index = 0; index < this.jokers.length; index++) {
      const pair = sourceJoker(this, index);
      if (!pair) continue;
      if (!spend && ['trading', 'burnt', 'green_joker'].includes(pair.source.id)) continue;
      pair.source.onDiscard(this, cards, destroyed);
    }
    for (const card of cards) {
      if (destroyed.has(card)) {
        this.noteCardDestroyed(card);
        continue;
      }
      if (card.seal === 'purple') this.gainConsumable('tarot');
    }
    this.deck.discard(cards.filter(card => !destroyed.has(card)));
    this.cleanupJokers();
  }

  playHand(selectedIndices) {
    if (this.handsRemaining <= 0) return null;

    if (!this.bossDisabled && this.bossId === 'psychic' && selectedIndices.length !== 5) {
      return { error: '灵媒：必须正好打出 5 张牌' };
    }

    const selectedCards = selectedIndices.map(index => this.hand.cards[index]);
    const handResult = HandEvaluator.evaluate(selectedCards, this.evalOptions());
    if (!handResult) return null;

    if (!this.bossDisabled && this.bossId === 'eye' && this.playedHandTypes.includes(handResult.type)) {
      const name = HAND_TYPES[handResult.type].name;
      return { error: `眼睛：本盲注已经打出过${name}` };
    }

    this.handTypeCounts[handResult.type] = (this.handTypeCounts[handResult.type] || 0) + 1;
    this.playedHandTypes.push(handResult.type);

    const result = scorePlayedHand(this, selectedCards, handResult);
    this.lastPlay = {
      name: HAND_TYPES[handResult.type].name,
      level: result.level,
      chips: result.chips,
      mult: result.mult,
      score: result.score
    };
    this.score += result.score;
    this.handsRemaining -= 1;
    if (result.dollars) this.money += result.dollars;

    const removed = this.hand.removeCards(selectedIndices);
    const destroyed = new Set(result.destroyed);
    for (const card of destroyed) this.noteCardDestroyed(card);
    this.deck.discard(removed.filter(card => !destroyed.has(card)));

    for (const copy of result.copies) {
      if (!this.hand.addCards([copy])) this.deck.cards.push(copy);
      this.onPlayingCardAdded();
    }

    let bossTriggered = false;
    if (!this.bossDisabled && this.bossId === 'flint') bossTriggered = true;
    if (!this.bossDisabled && this.bossId === 'plant' && selectedCards.some(card => isFaceCard(card, this))) {
      bossTriggered = true;
    }
    if (!this.bossDisabled && this.bossId === 'hook' && this.hand.cards.length > 0) {
      const count = Math.min(2, this.hand.cards.length);
      const pool = this.hand.cards.map((_, index) => index);
      const hookIndices = [];
      for (let i = 0; i < count; i++) {
        const pick = Math.floor(Math.random() * pool.length);
        hookIndices.push(pool.splice(pick, 1)[0]);
      }
      this.resolveDiscard(this.hand.removeCards(hookIndices), false);
      bossTriggered = true;
    }
    if (bossTriggered) {
      for (let index = 0; index < this.jokers.length; index++) {
        const pair = sourceJoker(this, index);
        if (pair?.source.id === 'matador') this.money += 8;
      }
    }

    this.drawUp();
    this.isFirstHand = false;
    this.cleanupJokers();
    return result;
  }

  discard(indices) {
    if (this.discardsRemaining <= 0 || !indices?.length) return false;
    const removed = this.hand.removeCards(indices);
    this.resolveDiscard(removed, true);
    this.discardsUsed += 1;
    this.discardsRemaining -= 1;
    this.drawUp();
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

  tryMrBones() {
    if (this.isVictory() || this.score < this.scoreRequired * 0.25) return false;
    let found = false;
    for (let index = 0; index < this.jokers.length; index++) {
      const pair = sourceJoker(this, index);
      if (pair?.source.id !== 'mr_bones') continue;
      pair.source.pendingDestroy = true;
      found = true;
    }
    if (!found) return false;
    this.score = this.scoreRequired;
    this.cleanupJokers();
    return true;
  }

  cashOut() {
    const steps = Math.floor(Math.max(0, this.money) / 5);
    let interest = Math.min(5, steps);
    if (this.hasEffect('to_the_moon')) interest += steps;
    const reward = BLIND_REWARDS[this.blind] ?? 0;
    const handsBonus = this.handsRemaining;
    const jokerPayouts = [];

    for (let index = 0; index < this.jokers.length; index++) {
      const pair = sourceJoker(this, index);
      if (!pair) continue;
      const amount = pair.source.onCashOut(this);
      if (amount) jokerPayouts.push({ name: pair.source.name, amount });
    }

    const jokerBonus = jokerPayouts.reduce((sum, entry) => sum + entry.amount, 0);
    let cardBonus = 0;
    for (const card of this.hand.cards) {
      if (card.enhancement === 'gold') cardBonus += 3;
    }

    let total = interest + reward + handsBonus + jokerBonus + cardBonus;
    if (this.flags.doubleNextPayout) {
      total *= 2;
      this.flags.doubleNextPayout = false;
    }
    this.money += total;

    const lastType = this.playedHandTypes[this.playedHandTypes.length - 1];
    const planet = lastType ? planetForHand(lastType) : null;
    if (planet) {
      for (const card of this.hand.cards) {
        if (card.seal === 'blue') this.gainConsumable(planet);
      }
    }
    this.triggerJokers('onRoundEnd');

    return { interest, reward, handsBonus, jokerBonus, jokerPayouts, cardBonus, total };
  }

  advanceBlind(defeated = true) {
    if (this.blind === 'boss') {
      if (defeated) this.triggerJokers('onBossDefeated');
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

  skipBlind() {
    this.flags.blindsSkipped += 1;
    return this.advanceBlind(false);
  }

  nextRound() {
    if (!this.isVictory()) return false;
    return this.advanceBlind(true);
  }

  endShop() {
    this.chaosUsed = false;
    this.triggerJokers('onShopEnd');
  }

  buyJoker(joker) {
    const floor = this.hasEffect('credit_card') ? -20 : 0;
    if (this.money - joker.cost < floor) return false;
    if (!this.canAddJoker(joker)) return false;
    this.money -= joker.cost;
    this.jokers.push(joker);
    return true;
  }

  sellJoker(index) {
    if (index < 0 || index >= this.jokers.length) return null;
    const joker = this.jokers[index];
    joker.onSell(this);
    const sellPrice = joker.sellPrice();
    this.jokers.splice(index, 1);
    this.money += sellPrice;
    for (const extra of this.pendingJokers) {
      if (this.canAddJoker(extra)) this.jokers.push(extra);
    }
    this.pendingJokers = [];
    this.triggerJokers('onCardSold');
    return { joker, sellPrice };
  }

  rarityOddsText() {
    return rarityWeights(this).map(([name, weight]) => `${name} ${weight}%`).join('  ');
  }

  applySecret(word) {
    const text = String(word || '').trim();
    if (text === '发大财') {
      this.money += 50;
      return { ok: true, message: '口袋里多了 $50' };
    }
    if (text === '欧气') {
      this.rarityBonus += 1;
      return { ok: true, message: '商店里的稀有牌更常见了' };
    }
    return { ok: false, message: '什么都没有发生。' };
  }

  sellConsumable(index) {
    const card = this.consumables[index];
    if (!card) return null;
    const sellPrice = Math.max(1, Math.floor(card.cost / 3) + (card.extraSell || 0));
    this.consumables.splice(index, 1);
    this.money += sellPrice;
    this.triggerJokers('onCardSold');
    return { card, sellPrice };
  }
}
