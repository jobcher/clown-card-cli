// 存档系统
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Card, Deck, Hand } from './cards.js';
import { Joker, JOKER_TYPES } from './jokers.js';
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
    hand: game.hand.cards.map(card => ({ suit: card.suit, rank: card.rank })),
    deck: game.deck.cards.map(card => ({ suit: card.suit, rank: card.rank })),
    discardPile: game.deck.discardPile.map(card => ({ suit: card.suit, rank: card.rank })),
    jokers: game.jokers.map(joker => ({ id: joker.id, data: joker.data }))
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

    const jokerMap = jokerKeyById();
    game.jokers = (saveData.jokers || []).map(entry => {
      const id = typeof entry === 'string' ? entry : entry.id;
      const data = typeof entry === 'string' ? undefined : entry.data;
      const key = jokerMap[id];
      return key ? new Joker(key, data) : null;
    }).filter(joker => joker !== null);

    if (saveData.handSize) {
      game.handSize = saveData.handSize;
    } else {
      game.handSize = game.roundStats().handSize;
    }

    game.hand = new Hand();
    game.hand.maxSize = Math.max(game.handSize, saveData.hand?.length || 0);
    (saveData.hand || []).forEach(card => {
      game.hand.addCards([new Card(card.suit, card.rank)]);
    });

    game.deck = new Deck();
    game.deck.cards = (saveData.deck || []).map(card => new Card(card.suit, card.rank));
    game.deck.discardPile = (saveData.discardPile || []).map(card => new Card(card.suit, card.rank));

    game.scoreRequired = game.getScoreRequired();
  }

  static deleteSave() {
    if (this.saveExists()) {
      fs.unlinkSync(SAVE_FILE);
    }
  }
}
