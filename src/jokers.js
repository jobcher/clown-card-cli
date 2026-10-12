// 小丑牌。效果定义在 jokerCatalog.js。
import { EDITIONS } from './cards.js';
import { JOKER_DEFS } from './jokerCatalog.js';

export const JOKER_TYPES = Object.fromEntries(JOKER_DEFS.map(def => [def.id.toUpperCase(), def]));

function formatStat(value) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export const RARITY_COLORS = {
  普通: '#b0b0b0',
  罕见: '#35a855',
  稀有: '#3d7dff',
  传说: '#ffaa00'
};

export class Joker {
  constructor(type, data) {
    const jokerType = JOKER_TYPES[type] || JOKER_DEFS.find(def => def.id === type);
    if (!jokerType) throw new Error(`未知的小丑牌类型: ${type}`);

    this.typeKey = jokerType.id.toUpperCase();
    this.def = jokerType;
    this.id = jokerType.id;
    this.name = jokerType.name;
    this.description = jokerType.description;
    this.rarity = jokerType.rarity;
    this.cost = jokerType.cost;
    this.enabled = true;
    this.edition = null;
    this.pendingDestroy = false;
    const initial = typeof jokerType.initialData === 'function' ? jokerType.initialData() : {};
    this.data = { ...initial, ...(data || {}) };
  }

  sellPrice() {
    return Math.max(1, Math.floor(this.cost / 3) + (this.data.extraSell || 0));
  }

  onScoredCard(card, state, actor) {
    this.def.onScoredCard?.call(this, card, state, actor || this);
  }

  retriggerScored(card, scored, state) {
    return this.def.retriggerScored?.call(this, card, scored, state) || 0;
  }

  retriggerHeld(card, state) {
    return this.def.retriggerHeld?.call(this, card, state) || 0;
  }

  onHeldCard(card, state, actor) {
    this.def.onHeldCard?.call(this, card, state, actor || this);
  }

  onHand(state, actor) {
    this.def.onHand?.call(this, state, actor || this);
  }

  onDiscard(game, cards, destroyed) {
    this.def.onDiscard?.call(this, game, cards || [], destroyed);
  }

  onCashOut(game) {
    return this.def.onCashOut?.call(this, game) || 0;
  }

  modifyRound(stats) {
    this.def.modifyRound?.call(this, stats);
  }

  onBlindSelected(game) {
    this.def.onBlindSelected?.call(this, game);
  }

  onRoundEnd(game) {
    this.def.onRoundEnd?.call(this, game);
  }

  onBossDefeated(game) {
    this.def.onBossDefeated?.call(this, game);
  }

  onSell(game) {
    this.def.onSell?.call(this, game);
  }

  onPackSkipped(game) {
    this.def.onPackSkipped?.call(this, game);
  }

  onPackOpened(game) {
    this.def.onPackOpened?.call(this, game);
  }

  onReroll(game) {
    this.def.onReroll?.call(this, game);
  }

  onCardDestroyed(card, game) {
    this.def.onCardDestroyed?.call(this, card, game);
  }

  onCardSold(game) {
    this.def.onCardSold?.call(this, game);
  }

  onShopEnd(game) {
    this.def.onShopEnd?.call(this, game);
  }

  onPlanet(game) {
    this.def.onPlanet?.call(this, game);
  }

  onPlayingCard(game) {
    this.def.onPlayingCard?.call(this, game);
  }

  extraLine() {
    const parts = [];
    if (typeof this.def.extraLine === 'function') {
      const custom = this.def.extraLine.call(this);
      if (custom) parts.push(String(custom).replace(/^（|）$/g, ''));
    }
    if (typeof this.data.chips === 'number') parts.push(`+${formatStat(this.data.chips)} 筹码`);
    if (typeof this.data.mult === 'number') parts.push(`+${formatStat(this.data.mult)} 倍率`);
    if (typeof this.data.x === 'number') parts.push(`X${formatStat(this.data.x)}`);
    if (typeof this.data.payout === 'number') parts.push(`+$${formatStat(this.data.payout)}`);
    if (typeof this.data.left === 'number') parts.push(`剩余 ${this.data.left} 次`);
    return parts.length ? `（${parts.join('，')}）` : '';
  }

  clone() {
    const copy = new Joker(this.typeKey, { ...this.data });
    copy.edition = this.edition;
    return copy;
  }

  toString() {
    const edition = this.edition ? EDITIONS[this.edition] : '';
    const extra = this.extraLine();
    return `[${this.rarity}] ${this.name}${edition ? ' ' + edition : ''}: ${this.description}${extra ? ' ' + extra : ''}`;
  }
}

function poolFor(rarity, game, allowOwned) {
  return Object.entries(JOKER_TYPES).filter(([, def]) => {
    if (rarity === '传说') {
      if (def.rarity !== '传说') return false;
    } else if (rarity === 'any') {
      if (def.rarity === '传说') return false;
    } else if (def.rarity !== rarity) {
      return false;
    }
    if (def.id === 'cavendish' && !game?.flags?.grosMichelExtinct) return false;
    if (def.id === 'gros_michel' && game?.flags?.grosMichelExtinct) return false;
    const showman = Boolean(game?.hasEffect?.('showman'));
    if (!allowOwned && !showman && game?.jokers?.some(joker => joker.id === def.id)) return false;
    return true;
  });
}

export function shopPool(game) {
  return Object.entries(JOKER_TYPES).filter(([, def]) => {
    if (def.id === 'cavendish' && !game?.flags?.grosMichelExtinct) return false;
    if (def.id === 'gros_michel' && game?.flags?.grosMichelExtinct) return false;
    return true;
  });
}

export function rarityWeights(game) {
  const take = Math.min(69, Math.max(0, game?.rarityBonus || 0) * 5);
  const toUncommon = Math.floor(take * 2 / 5);
  const toRare = Math.floor(take * 2 / 5);
  const toLegend = take - toUncommon - toRare;
  return [
    ['普通', 69 - take],
    ['罕见', 25 + toUncommon],
    ['稀有', 5 + toRare],
    ['传说', 1 + toLegend]
  ];
}

export function randomJokerByRarity(rarity, game) {
  const owned = poolFor(rarity, game, false);
  const pool = owned.length ? owned : poolFor(rarity, game, true);
  if (!pool.length) return null;
  const [key] = pool[Math.floor(Math.random() * pool.length)];
  return new Joker(key);
}

export function getRandomJoker(game) {
  const weights = rarityWeights(game);
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  let rarity = '普通';
  for (const [name, weight] of weights) {
    if (weight <= 0) continue;
    roll -= weight;
    if (roll <= 0) {
      rarity = name;
      break;
    }
  }
  return randomJokerByRarity(rarity, game) || randomJokerByRarity('any', game);
}
