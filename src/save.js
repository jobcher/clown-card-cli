// 存档系统
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Card, Deck, Hand } from './cards.js';
import { Joker, JOKER_TYPES } from './jokers.js';
import { createConsumable } from './consumables.js';
import { createHandLevels } from './handLevels.js';
import { blindFromRound, bossForAnte } from './blinds.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAVE_FILE = path.join(__dirname, '../save.json');

function jokerKeyById() {
  const jokerMap = {};
  Object.keys(JOKER_TYPES).forEach(key => {
    jokerMap[JOKER_TYPES[key].id] = key;
  });
  return jokerMap;
}

function serializeCard(card) {
  return {
    suit: card.suit,
    rank: card.rank,
    enhancement: card.enhancement || null,
    edition: card.edition || null,
    seal: card.seal || null,
    bonusChips: card.bonusChips || 0
  };
}

function restoreCard(card) {
  return new Card(card.suit, card.rank, {
    enhancement: card.enhancement || null,
    edition: card.edition || null,
    seal: card.seal || null,
    bonusChips: card.bonusChips || 0
  });
}

export function serializeGame(game) {
  return {
    round: game.round,
    ante: game.ante,
    blind: game.blind,
    bossId: game.bossId,
    money: game.money,
    handsRemaining: game.handsRemaining,
    discardsRemaining: game.discardsRemaining,
    discardsUsed: game.discardsUsed,
    handSize: game.handSize,
    score: game.score,
    scoreRequired: game.scoreRequired,
    isFirstHand: game.isFirstHand,
    maxJokers: game.maxJokers,
    playedHandTypes: game.playedHandTypes,
    handTypeCounts: game.handTypeCounts,
    handLevels: game.handLevels,
    consumables: (game.consumables || []).map(card => ({
      id: card.id,
      negative: Boolean(card.negative),
      extraSell: card.extraSell || 0
    })),
    handSizeMod: game.handSizeMod || 0,
    rarityBonus: game.rarityBonus || 0,
    bossDisabled: Boolean(game.bossDisabled),
    stats: game.stats,
    flags: game.flags,
    hand: game.hand.cards.map(serializeCard),
    deck: game.deck.cards.map(serializeCard),
    discardPile: game.deck.discardPile.map(serializeCard),
    jokers: game.jokers.map(joker => ({ id: joker.id, data: joker.data, edition: joker.edition || null }))
  };
}

export class SaveManager {
  static saveExists() {
    return fs.existsSync(SAVE_FILE);
  }

  static saveGame(game) {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(serializeGame(game), null, 2));
  }

  static loadGame() {
    if (!this.saveExists()) return null;

    try {
      const data = fs.readFileSync(SAVE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('读取存档失败:', e);
      return null;
    }
  }

  static restoreGame(game, saveData) {
    game.round = saveData.round;
    game.ante = saveData.ante;
    game.money = saveData.money;
    game.handsRemaining = saveData.handsRemaining;
    game.discardsRemaining = saveData.discardsRemaining;
    game.discardsUsed = saveData.discardsUsed || 0;
    game.score = saveData.score;
    game.isFirstHand = saveData.isFirstHand;
    game.maxJokers = saveData.maxJokers;
    game.playedHandTypes = saveData.playedHandTypes ? [...saveData.playedHandTypes] : [];
    game.handTypeCounts = saveData.handTypeCounts ? { ...saveData.handTypeCounts } : {};

    game.blind = saveData.blind || blindFromRound(saveData.round);
    if (game.blind === 'boss') {
      game.bossId = saveData.bossId || bossForAnte(game.ante).id;
    } else {
      game.bossId = null;
    }

    game.handLevels = createHandLevels(saveData.handLevels);
    game.handSizeMod = saveData.handSizeMod || 0;
    game.rarityBonus = saveData.rarityBonus || 0;
    game.bossDisabled = Boolean(saveData.bossDisabled);
    game.stats = {
      tarotsUsed: 0,
      planetsUsed: 0,
      uniquePlanets: [],
      lastConsumable: null,
      ...(saveData.stats || {})
    };
    if (!Array.isArray(game.stats.uniquePlanets)) game.stats.uniquePlanets = [];
    game.flags = {
      grosMichelExtinct: false,
      blindsSkipped: 0,
      doubleNextPayout: false,
      ...(saveData.flags || {})
    };
    game.consumables = (saveData.consumables || []).map(entry => {
      const card = createConsumable(entry.id);
      if (!card) return null;
      card.negative = Boolean(entry.negative);
      card.extraSell = entry.extraSell || 0;
      return card;
    }).filter(Boolean);

    const jokerMap = jokerKeyById();
    game.jokers = (saveData.jokers || []).map(entry => {
      const id = typeof entry === 'string' ? entry : entry.id;
      const data = typeof entry === 'string' ? undefined : entry.data;
      const key = jokerMap[id];
      if (!key) return null;
      const joker = new Joker(key, data);
      joker.edition = typeof entry === 'string' ? null : (entry.edition || null);
      return joker;
    }).filter(joker => joker !== null);

    if (saveData.handSize) {
      game.handSize = saveData.handSize;
    } else {
      game.handSize = game.roundStats().handSize;
    }

    game.hand = new Hand();
    game.hand.maxSize = Math.max(game.handSize, saveData.hand?.length || 0);
    (saveData.hand || []).forEach(card => {
      game.hand.addCards([restoreCard(card)]);
    });

    game.deck = new Deck();
    game.deck.cards = (saveData.deck || []).map(restoreCard);
    game.deck.discardPile = (saveData.discardPile || []).map(restoreCard);

    game.scoreRequired = game.getScoreRequired();
  }

  static deleteSave() {
    if (this.saveExists()) {
      fs.unlinkSync(SAVE_FILE);
    }
  }
}
