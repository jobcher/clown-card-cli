// 官方 150 张小丑。复杂效果挂在各自的触发函数上。
import { Card, SUITS, RANKS, cardMatchesSuit } from './cards.js';
import { HAND_TYPES, HandEvaluator } from './handEvaluator.js';
import { isFaceCard } from './scoring.js';

const defs = [];
const COST = { 普通: 4, 罕见: 6, 稀有: 8, 传说: 20 };
const TODO_TYPES = Object.keys(HAND_TYPES);

function add(id, name, description, rarity, hooks = {}) {
  defs.push({ id, name, description, rarity, cost: COST[rarity], ...hooks });
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function matches(card, suit, game) {
  return cardMatchesSuit(card, suit, { smeared: game.hasEffect('smeared') });
}

function contains(type, kind) {
  const groups = {
    PAIR: ['PAIR', 'TWO_PAIR', 'THREE_OF_A_KIND', 'FULL_HOUSE', 'FOUR_OF_A_KIND', 'FIVE_OF_A_KIND', 'FLUSH_HOUSE', 'FLUSH_FIVE'],
    THREE: ['THREE_OF_A_KIND', 'FULL_HOUSE', 'FOUR_OF_A_KIND', 'FIVE_OF_A_KIND', 'FLUSH_HOUSE', 'FLUSH_FIVE'],
    TWO_PAIR: ['TWO_PAIR'],
    STRAIGHT: ['STRAIGHT', 'STRAIGHT_FLUSH', 'ROYAL_FLUSH'],
    FLUSH: ['FLUSH', 'STRAIGHT_FLUSH', 'ROYAL_FLUSH', 'FLUSH_HOUSE', 'FLUSH_FIVE'],
    FOUR: ['FOUR_OF_A_KIND', 'FIVE_OF_A_KIND', 'FLUSH_FIVE']
  };
  return groups[kind].includes(type);
}

function fullDeck(game) {
  return [...game.deck.cards, ...game.deck.discardPile, ...game.hand.cards];
}

function once(state, actor, key) {
  if (!state._once) state._once = {};
  if (!state._once[key]) state._once[key] = new Set();
  if (state._once[key].has(actor)) return false;
  state._once[key].add(actor);
  return true;
}

function chipRank(card) {
  if (card.rank === 'A') return 11;
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
  return Number(card.rank);
}

function handBonus(kind, mult = 0, chips = 0, x = 0) {
  return (state) => {
    if (!contains(state.handResult.type, kind)) return;
    if (mult) state.mult += mult;
    if (chips) state.chips += chips;
    if (x) state.mult *= x;
  };
}

function suitMult(suit) {
  return (card, state) => {
    if (matches(card, suit, state.game)) state.mult += 3;
  };
}

function xMult(state) {
  const x = this.data.x || 1;
  if (x !== 1) state.mult *= x;
}

add('joker', '小丑', '+4 倍率', '普通', { onHand: (state) => { state.mult += 4; } });
add('greedy_joker', '贪婪小丑', '计分的方块 +3 倍率', '普通', { onScoredCard: suitMult('♦') });
add('lusty_joker', '色欲小丑', '计分的红桃 +3 倍率', '普通', { onScoredCard: suitMult('♥') });
add('wrathful_joker', '愤怒小丑', '计分的黑桃 +3 倍率', '普通', { onScoredCard: suitMult('♠') });
add('gluttonous_joker', '暴食小丑', '计分的梅花 +3 倍率', '普通', { onScoredCard: suitMult('♣') });
add('jolly_joker', '开心小丑', '牌型包含对子时 +8 倍率', '普通', { onHand: handBonus('PAIR', 8) });
add('zany_joker', '滑稽小丑', '牌型包含三条时 +12 倍率', '普通', { onHand: handBonus('THREE', 12) });
add('mad_joker', '疯狂小丑', '牌型包含两对时 +10 倍率', '普通', { onHand: handBonus('TWO_PAIR', 10) });
add('crazy_joker', '狂野小丑', '牌型包含顺子时 +12 倍率', '普通', { onHand: handBonus('STRAIGHT', 12) });
add('droll_joker', '古怪小丑', '牌型包含同花时 +10 倍率', '普通', { onHand: handBonus('FLUSH', 10) });
add('sly_joker', '狡诈小丑', '牌型包含对子时 +50 筹码', '普通', { onHand: handBonus('PAIR', 0, 50) });
add('wily_joker', '诡诈小丑', '牌型包含三条时 +100 筹码', '普通', { onHand: handBonus('THREE', 0, 100) });
add('clever_joker', '聪慧小丑', '牌型包含两对时 +80 筹码', '普通', { onHand: handBonus('TWO_PAIR', 0, 80) });
add('devious_joker', '阴险小丑', '牌型包含顺子时 +100 筹码', '普通', { onHand: handBonus('STRAIGHT', 0, 100) });
add('crafty_joker', '精明小丑', '牌型包含同花时 +80 筹码', '普通', { onHand: handBonus('FLUSH', 0, 80) });
add('half_joker', '半张小丑', '打出不超过 3 张牌时 +20 倍率', '普通', {
  onHand: (state) => { if (state.playedCards.length <= 3) state.mult += 20; }
});
add('stencil', '小丑模具', '每个空小丑槽 X1 倍率，含自身', '罕见', {
  onHand(state) {
    const others = state.game.jokers.filter(joker => joker !== this && joker.edition !== 'negative').length;
    state.mult *= Math.max(0, state.game.maxJokers - others);
  }
});
add('four_fingers', '四指', '顺子和同花可以只由 4 张牌组成', '罕见');
add('mime', '哑剧', '手牌中的效果额外触发一次', '罕见', { retriggerHeld: () => 1 });
add('credit_card', '信用卡', '可以负债，最多到 -$20', '普通');
add('ceremonial_dagger', '仪式匕首', '选择盲注时摧毁右侧小丑，将其售价的两倍加入倍率', '罕见', {
  initialData: () => ({ mult: 0 }),
  onBlindSelected(game) {
    const right = game.jokers[game.jokers.indexOf(this) + 1];
    if (!right || right.pendingDestroy) return;
    this.data.mult += right.sellPrice() * 2;
    right.pendingDestroy = true;
  },
  onHand(state) { if (this.data.mult) state.mult += this.data.mult; }
});
add('banner', '旗帜', '每有一次剩余弃牌 +30 筹码', '普通', {
  onHand: (state) => { state.chips += state.game.discardsRemaining * 30; }
});
add('mystic_summit', '神秘之峰', '没有剩余弃牌时 +15 倍率', '普通', {
  onHand: (state) => { if (state.game.discardsRemaining === 0) state.mult += 15; }
});
add('marble', '大理石小丑', '选择盲注时，向牌组加入 1 张石头牌', '罕见', {
  onBlindSelected(game) {
    game.deck.cards.push(new Card('♠', 'A', { enhancement: 'stone' }));
    game.onPlayingCardAdded();
  }
});
add('loyalty', '会员卡', '每打出 6 手牌，X4 倍率', '罕见', {
  initialData: () => ({ hands: 0 }),
  onHand(state) {
    this.data.hands += 1;
    if (this.data.hands % 6 === 0) state.mult *= 4;
  }
});
add('eight_ball', '八号球', '每张计分的 8 有 1/4 几率生成一张塔罗牌', '普通', {
  onScoredCard(card, state) {
    if (card.enhancement === 'stone' || card.rank !== '8') return;
    if (Math.random() < state.game.probability(1 / 4)) state.game.gainConsumable('tarot');
  }
});
add('misprint', '错版', '+0 到 +23 倍率', '普通', {
  onHand: (state) => { state.mult += Math.floor(Math.random() * 24); }
});
add('dusk', '黄昏', '最后一次出牌时，每张计分牌额外触发一次', '罕见', {
  retriggerScored: (_card, _scored, state) => (state.game.handsRemaining === 1 ? 1 : 0)
});
add('raised_fist', '扬拳', '将手牌中最小牌点数的两倍加入倍率', '普通', {
  onHand(state) {
    const held = state.heldCards.filter(card => card.enhancement !== 'stone');
    if (!held.length) return;
    const lowest = held.reduce((best, card) => (chipRank(card) < chipRank(best) ? card : best));
    state.mult += chipRank(lowest) * 2;
  }
});
add('chaos', '混沌小丑', '每次进入商店有 1 次免费重掷', '普通');
add('fibonacci', '斐波那契', '计分的 A、2、3、5、8 +8 倍率', '罕见', {
  onScoredCard(card, state) {
    if (card.enhancement !== 'stone' && ['A', '2', '3', '5', '8'].includes(card.rank)) state.mult += 8;
  }
});
add('steel_joker', '钢铁小丑', '牌组中每张钢牌 X0.2 倍率', '罕见', {
  onHand(state) {
    const count = fullDeck(state.game).filter(card => card.enhancement === 'steel').length;
    const x = 1 + count * 0.2;
    if (x !== 1) state.mult *= x;
  }
});
add('scary_face', '恐怖面孔', '计分的人头牌 +30 筹码', '普通', {
  onScoredCard: (card, state) => { if (isFaceCard(card, state.game)) state.chips += 30; }
});
add('abstract', '抽象小丑', '每张小丑牌 +3 倍率', '普通', {
  onHand: (state) => { state.mult += state.game.jokers.length * 3; }
});
add('delayed_gratification', '延迟满足', '回合结束时，若没有弃牌，每次弃牌机会 +$2', '普通', {
  onCashOut: (game) => (game.discardsUsed === 0 ? game.discardsRemaining * 2 : 0)
});
add('hack', '黑客', '计分的 2、3、4、5 额外触发一次', '罕见', {
  retriggerScored: (card) => (card.enhancement !== 'stone' && ['2', '3', '4', '5'].includes(card.rank) ? 1 : 0)
});
add('pareidolia', '幻视', '所有牌都视为人头牌', '罕见');
add('gros_michel', '大麦克', '+15 倍率，回合结束有 1/6 几率摧毁', '普通', {
  onHand: (state) => { state.mult += 15; },
  onRoundEnd(game) {
    if (Math.random() < game.probability(1 / 6)) {
      this.pendingDestroy = true;
      game.flags.grosMichelExtinct = true;
    }
  }
});
add('even_steven', '偶数史蒂文', '计分的偶数牌 +4 倍率', '普通', {
  onScoredCard(card, state) {
    if (card.enhancement !== 'stone' && ['2', '4', '6', '8', '10'].includes(card.rank)) state.mult += 4;
  }
});
add('odd_todd', '奇数托德', '计分的奇数牌 +31 筹码', '普通', {
  onScoredCard(card, state) {
    if (card.enhancement !== 'stone' && ['A', '3', '5', '7', '9'].includes(card.rank)) state.chips += 31;
  }
});
add('scholar', '学者', '计分的 A +20 筹码、+4 倍率', '普通', {
  onScoredCard(card, state) {
    if (card.enhancement !== 'stone' && card.rank === 'A') {
      state.chips += 20;
      state.mult += 4;
    }
  }
});
add('business_card', '名片', '计分的人头牌有 1/2 几率 +$2', '普通', {
  onScoredCard(card, state) {
    if (isFaceCard(card, state.game) && Math.random() < state.game.probability(1 / 2)) state.dollars += 2;
  }
});
add('supernova', '超新星', '这手牌型本局每打出过一次 +1 倍率', '普通', {
  onHand: (state) => { state.mult += state.game.handTypeCounts[state.handResult.type] || 0; }
});
add('ride_the_bus', '搭巴士', '连续打出不含计分人头牌的手牌时 +1 倍率', '普通', {
  initialData: () => ({ mult: 0 }),
  onHand(state) {
    if (state.scoredCards.some(card => isFaceCard(card, state.game))) this.data.mult = 0;
    else {
      this.data.mult += 1;
      state.mult += this.data.mult;
    }
  }
});
add('space_joker', '太空小丑', '1/4 几率升级打出的牌型', '罕见', {
  onHand(state) {
    if (Math.random() < state.game.probability(1 / 4)) state.game.upgradeHand(state.handResult.type);
  }
});
add('egg', '鸡蛋', '回合结束时售价 +$3', '普通', {
  initialData: () => ({ extraSell: 0 }),
  onRoundEnd() { this.data.extraSell += 3; }
});
add('burglar', '窃贼', '选择盲注时 +3 出牌次数，弃牌次数变为 0', '罕见', {
  modifyRound(stats) {
    stats.hands += 3;
    stats.discards = 0;
  }
});
add('blackboard', '黑板', '留在手牌中的牌都是黑桃或梅花时 X3 倍率', '罕见', {
  onHand(state) {
    const ok = state.heldCards.every(card => card.enhancement !== 'stone' && card.enhancement !== 'wild' && (card.suit === '♠' || card.suit === '♣'));
    if (ok) state.mult *= 3;
  }
});
add('runner', '跑步者', '打出顺子时永久 +15 筹码', '普通', {
  initialData: () => ({ chips: 0 }),
  onHand(state) {
    if (!contains(state.handResult.type, 'STRAIGHT')) return;
    this.data.chips += 15;
    state.chips += this.data.chips;
  }
});
add('ice_cream', '冰淇淋', '+100 筹码，每次出牌 -5 筹码', '普通', {
  initialData: () => ({ chips: 100 }),
  onHand(state) {
    state.chips += this.data.chips;
    this.data.chips -= 5;
    if (this.data.chips <= 0) this.pendingDestroy = true;
  }
});
add('dna', 'DNA', '回合第一手若只打出 1 张牌，复制它到牌组并抽上手', '稀有', {
  onHand(state) {
    if (!state.game.isFirstHand || state.playedCards.length !== 1) return;
    state.copies.push(state.playedCards[0].clone());
  }
});
add('splash', '飞溅', '打出的每张牌都会计分', '普通');
add('blue_joker', '蓝色小丑', '牌组中每剩一张牌 +2 筹码', '普通', {
  onHand: (state) => { state.chips += state.game.deck.cards.length * 2; }
});
add('sixth_sense', '第六感', '回合第一手若是单张 6，摧毁它并生成一张幻灵牌', '罕见', {
  onHand(state) {
    if (!state.game.isFirstHand || state.playedCards.length !== 1) return;
    const card = state.playedCards[0];
    if (card.rank !== '6' || card.enhancement === 'stone') return;
    if (!state.destroyed.includes(card)) state.destroyed.push(card);
    state.game.gainConsumable('spectral');
  }
});
add('constellation', '星座', '每使用一张行星牌 X0.1 倍率', '罕见', {
  initialData: () => ({ x: 1 }),
  onPlanet() { this.data.x += 0.1; },
  onHand: xMult
});
add('hiker', '登山者', '计分的牌永久 +5 筹码', '罕见', {
  onScoredCard(card) { card.bonusChips = (card.bonusChips || 0) + 5; }
});
add('faceless', '无面小丑', '一次弃掉至少 3 张人头牌时 +$5', '普通', {
  onDiscard(game, cards) {
    if (cards.filter(card => isFaceCard(card, game)).length >= 3) game.money += 5;
  }
});
add('green_joker', '绿色小丑', '出牌 +1 倍率，弃牌 -1 倍率', '普通', {
  initialData: () => ({ mult: 0 }),
  onHand(state) {
    this.data.mult += 1;
    state.mult += this.data.mult;
  },
  onDiscard() { this.data.mult = Math.max(0, this.data.mult - 1); }
});
add('superposition', '叠加态', '打出的牌同时包含 A 和顺子时，生成一张塔罗牌', '普通', {
  onHand(state) {
    const ace = state.playedCards.some(card => card.rank === 'A' && card.enhancement !== 'stone');
    if (ace && contains(state.handResult.type, 'STRAIGHT')) state.game.gainConsumable('tarot');
  }
});
add('todo', '待办清单', '打出指定牌型时 +$4，然后更换目标', '普通', {
  initialData: () => ({ handType: pick(TODO_TYPES) }),
  onHand(state) {
    if (state.handResult.type !== this.data.handType) return;
    state.dollars += 4;
    const next = TODO_TYPES.filter(type => type !== this.data.handType);
    this.data.handType = pick(next);
  },
  extraLine() { return `（当前：${HAND_TYPES[this.data.handType]?.name || '牌型'}）`; }
});
add('cavendish', '卡文迪许', 'X3 倍率。大麦克被摧毁后才会出现，回合结束有 1/1000 几率摧毁', '普通', {
  onHand: (state) => { state.mult *= 3; },
  onRoundEnd(game) {
    if (Math.random() < game.probability(1 / 1000)) this.pendingDestroy = true;
  }
});
add('card_sharp', '老千', '本盲注已经打出过这种牌型时 X3 倍率', '罕见', {
  onHand(state) {
    const seen = state.game.playedHandTypes.filter(type => type === state.handResult.type).length;
    if (seen >= 2) state.mult *= 3;
  }
});
add('red_card', '红牌', '跳过补充包时 +3 倍率', '普通', {
  initialData: () => ({ mult: 0 }),
  onPackSkipped() { this.data.mult += 3; },
  onHand(state) { if (this.data.mult) state.mult += this.data.mult; }
});
add('madness', '狂乱', '选择小盲注或大盲注时 X0.5，并摧毁一张其他小丑', '罕见', {
  initialData: () => ({ x: 1 }),
  onBlindSelected(game) {
    if (game.blind === 'boss') return;
    this.data.x += 0.5;
    const others = game.jokers.filter(joker => joker !== this && !joker.pendingDestroy);
    if (others.length) others[Math.floor(Math.random() * others.length)].pendingDestroy = true;
  },
  onHand: xMult
});
add('square', '方形小丑', '正好打出 4 张牌时永久 +4 筹码', '普通', {
  initialData: () => ({ chips: 0 }),
  onHand(state) {
    if (state.playedCards.length !== 4) return;
    this.data.chips += 4;
    state.chips += this.data.chips;
  }
});
add('seance', '降灵', '打出同花顺时生成一张幻灵牌', '罕见', {
  onHand(state) {
    if (state.handResult.type === 'STRAIGHT_FLUSH' || state.handResult.type === 'ROYAL_FLUSH') {
      state.game.gainConsumable('spectral');
    }
  }
});
add('riff_raff', '乌合之众', '选择盲注时生成 2 张普通小丑（有空位时）', '普通', {
  onBlindSelected(game) {
    game.gainJoker('普通');
    game.gainJoker('普通');
  }
});
add('vampire', '吸血鬼', '移除计分牌的强化，每移除一次 X0.1 倍率', '罕见', {
  initialData: () => ({ x: 1 }),
  onScoredCard(card) {
    if (!card.enhancement) return;
    card.enhancement = null;
    card.enhanced = false;
    this.data.x += 0.1;
  },
  onHand: xMult
});
add('shortcut', '捷径', '顺子可以间隔一个点数', '罕见');
add('hologram', '全息图', '每有一张牌加入牌组 X0.25 倍率', '罕见', {
  initialData: () => ({ x: 1 }),
  onPlayingCard() { this.data.x += 0.25; },
  onHand: xMult
});
add('vagabond', '流浪者', '出牌时若金钱不超过 $4，生成一张塔罗牌', '稀有', {
  onHand: (state) => { if (state.game.money <= 4) state.game.gainConsumable('tarot'); }
});
add('baron', '男爵', '留在手牌中的每张 K X1.5 倍率', '稀有', {
  onHeldCard(card, state) {
    if (card.enhancement !== 'stone' && card.rank === 'K') state.mult *= 1.5;
  }
});
add('cloud_9', '云9', '回合结束时，完整牌组中每张 9 +$1', '罕见', {
  onCashOut: (game) => game.countNines()
});
add('rocket', '火箭', '回合结束时 +$1，击败 Boss 后额外 +$2', '罕见', {
  initialData: () => ({ payout: 1 }),
  onCashOut() { return this.data.payout || 1; },
  onBossDefeated() { this.data.payout = (this.data.payout || 1) + 2; }
});
add('obelisk', '方尖碑', '连续打出不是最常用牌型的手牌时 X0.2，打出最常用牌型则重置', '稀有', {
  initialData: () => ({ x: 1 }),
  onHand(state) {
    const counts = state.game.handTypeCounts || {};
    const values = Object.values(counts);
    const max = values.length ? Math.max(...values) : 0;
    const current = counts[state.handResult.type] || 0;
    if (max > 0 && current >= max) this.data.x = 1;
    else this.data.x += 0.2;
    state.mult *= this.data.x;
  }
});
add('midas', '迈达斯面具', '计分的人头牌变成黄金牌', '罕见', {
  onScoredCard(card, state) {
    if (isFaceCard(card, state.game)) {
      card.enhancement = 'gold';
      card.enhanced = true;
    }
  }
});
add('luchador', '摔角手', '出售后使当前 Boss 失效', '罕见', {
  onSell(game) {
    game.bossDisabled = true;
    game.scoreRequired = game.getScoreRequired();
    if (game.bossId === 'water') game.discardsRemaining = game.baseDiscards;
  }
});
add('photograph', '照片', '第一张计分的人头牌 X2 倍率', '普通', {
  onScoredCard(card, state, actor) {
    if (!isFaceCard(card, state.game) || !once(state, actor, 'photograph')) return;
    state.mult *= 2;
  }
});
add('gift_card', '礼品卡', '回合结束时，每张小丑和消耗牌的售价 +$1', '罕见', {
  onRoundEnd(game) {
    for (const joker of game.jokers) joker.data.extraSell = (joker.data.extraSell || 0) + 1;
    for (const card of game.consumables) card.extraSell = (card.extraSell || 0) + 1;
  }
});
add('turtle_bean', '黑豆', '+5 手牌上限，每回合 -1，降到 0 时摧毁', '罕见', {
  initialData: () => ({ bonus: 5 }),
  modifyRound(stats) { stats.handSize += this.data.bonus || 0; },
  onRoundEnd() {
    this.data.bonus -= 1;
    if (this.data.bonus <= 0) this.pendingDestroy = true;
  }
});
add('erosion', '侵蚀', '完整牌组中每少一张牌 +4 倍率', '罕见', {
  onHand(state) {
    const missing = 52 - fullDeck(state.game).length;
    if (missing > 0) state.mult += missing * 4;
  }
});
add('reserved_parking', '专用停车位', '计分的人头牌有 1/2 几率 +$1', '普通', {
  onScoredCard(card, state) {
    if (isFaceCard(card, state.game) && Math.random() < state.game.probability(1 / 2)) state.dollars += 1;
  }
});
add('mail_rebate', '邮件回扣', '弃掉指定点数时，每张 +$5', '罕见', {
  initialData: () => ({ rank: pick(RANKS) }),
  onBlindSelected() { this.data.rank = pick(RANKS); },
  onDiscard(game, cards) {
    const hits = cards.filter(card => card.enhancement !== 'stone' && card.rank === this.data.rank).length;
    game.money += hits * 5;
  },
  extraLine() { return `（当前：${this.data.rank}）`; }
});
add('to_the_moon', '登月', '每 $5 额外获得 $1 利息，不受 $5 上限影响', '罕见');
add('hallucination', '幻觉', '打开补充包时有 1/2 几率生成一张塔罗牌', '罕见', {
  onPackOpened(game) {
    if (Math.random() < game.probability(1 / 2)) game.gainConsumable('tarot');
  }
});
add('fortune_teller', '占卜师', '本局每使用过一张塔罗牌 +1 倍率', '普通', {
  onHand(state) {
    if (state.game.stats.tarotsUsed) state.mult += state.game.stats.tarotsUsed;
  }
});
add('juggler', '杂耍小丑', '+1 手牌上限', '罕见', { modifyRound: (stats) => { stats.handSize += 1; } });
add('drunkard', '醉汉', '+1 弃牌次数', '罕见', { modifyRound: (stats) => { stats.discards += 1; } });
add('stone_joker', '石头小丑', '完整牌组中每张石头牌 +25 筹码', '罕见', {
  onHand(state) {
    state.chips += fullDeck(state.game).filter(card => card.enhancement === 'stone').length * 25;
  }
});
add('golden_joker', '黄金小丑', '回合结束时 +$4', '普通', { onCashOut: () => 4 });
add('lucky_cat', '幸运猫', '幸运牌每成功触发一次 X0.25 倍率', '罕见', {
  initialData: () => ({ x: 1 }),
  onScoredCard(_card, state) {
    if (state.luckyProc) this.data.x += 0.25 * state.luckyProc;
  },
  onHand: xMult
});
add('baseball', '棒球卡', '每张罕见小丑 X1.5 倍率', '稀有', {
  onHand(state) {
    const count = state.game.jokers.filter(joker => joker.rarity === '罕见').length;
    if (count) state.mult *= 1.5 ** count;
  }
});
add('bull', '公牛', '每拥有 $1 +2 筹码', '普通', {
  onHand: (state) => { state.chips += Math.max(0, Math.floor(state.game.money)) * 2; }
});
add('diet_cola', '健怡可乐', '出售后，下一次结算奖励翻倍', '罕见', {
  onSell: (game) => { game.flags.doubleNextPayout = true; }
});
add('trading', '交易卡', '回合中第一次弃牌若只有 1 张，摧毁它并 +$3', '罕见', {
  initialData: () => ({ used: false }),
  onBlindSelected() { this.data.used = false; },
  onDiscard(game, cards, destroyed) {
    if (this.data.used || game.discardsUsed !== 0 || cards.length !== 1) return;
    this.data.used = true;
    destroyed.add(cards[0]);
    game.money += 3;
  }
});
add('flash_card', '闪卡', '每次重掷商店 +2 倍率', '罕见', {
  initialData: () => ({ mult: 0 }),
  onReroll() { this.data.mult += 2; },
  onHand(state) { if (this.data.mult) state.mult += this.data.mult; }
});
add('popcorn', '爆米花', '+20 倍率，每回合 -4 倍率', '普通', {
  initialData: () => ({ mult: 20 }),
  onHand(state) { if (this.data.mult > 0) state.mult += this.data.mult; },
  onRoundEnd() {
    this.data.mult -= 4;
    if (this.data.mult <= 0) this.pendingDestroy = true;
  }
});
add('spare_trousers', '备用裤子', '打出两对时永久 +2 倍率', '罕见', {
  initialData: () => ({ mult: 0 }),
  onHand(state) {
    if (!contains(state.handResult.type, 'TWO_PAIR')) return;
    this.data.mult += 2;
    state.mult += this.data.mult;
  }
});
add('ancient', '古老小丑', '指定花色的计分牌 X1.5 倍率，每回合更换花色', '稀有', {
  initialData: () => ({ suit: pick(SUITS) }),
  onBlindSelected() { this.data.suit = pick(SUITS); },
  onScoredCard(card, state) {
    if (matches(card, this.data.suit, state.game)) state.mult *= 1.5;
  },
  extraLine() { return `（当前：${this.data.suit}）`; }
});
add('ramen', '拉面', 'X2 倍率，每弃一张牌减少 X0.01', '罕见', {
  initialData: () => ({ x: 2 }),
  onDiscard(_game, cards) { this.data.x = Math.max(1, this.data.x - cards.length * 0.01); },
  onHand(state) { state.mult *= this.data.x; }
});
add('walkie', '对讲机', '计分的 10 或 4 +10 筹码、+4 倍率', '普通', {
  onScoredCard(card, state) {
    if (card.enhancement !== 'stone' && (card.rank === '10' || card.rank === '4')) {
      state.chips += 10;
      state.mult += 4;
    }
  }
});
add('seltzer', '苏打水', '接下来 10 次出牌，计分牌额外触发一次', '罕见', {
  initialData: () => ({ left: 10 }),
  retriggerScored() { return this.data.left > 0 ? 1 : 0; },
  onHand(state) {
    if (this.data.left <= 0 || this._hand === state) return;
    this._hand = state;
    this.data.left -= 1;
    if (this.data.left <= 0) this.pendingDestroy = true;
  }
});
add('castle', '城堡', '弃掉指定花色时永久 +3 筹码，每回合更换花色', '罕见', {
  initialData: () => ({ suit: pick(SUITS), chips: 0 }),
  onBlindSelected() { this.data.suit = pick(SUITS); },
  onDiscard(game, cards) {
    for (const card of cards) {
      if (matches(card, this.data.suit, game)) this.data.chips += 3;
    }
  },
  onHand(state) { if (this.data.chips) state.chips += this.data.chips; },
  extraLine() { return `（当前：${this.data.suit}）`; }
});
add('smiley', '笑脸', '计分的人头牌 +5 倍率', '普通', {
  onScoredCard: (card, state) => { if (isFaceCard(card, state.game)) state.mult += 5; }
});
add('campfire', '营火', '每售出一张牌 X0.25 倍率，击败 Boss 后重置', '稀有', {
  initialData: () => ({ x: 1 }),
  onCardSold() { this.data.x += 0.25; },
  onBossDefeated() { this.data.x = 1; },
  onHand: xMult
});
add('golden_ticket', '黄金门票', '计分的黄金牌 +$4', '普通', {
  onScoredCard: (card, state) => { if (card.enhancement === 'gold') state.dollars += 4; }
});
add('mr_bones', '骷髅', '若得分至少达到目标的 25%，可避免失败一次', '罕见');
add('acrobat', '杂技演员', '最后一次出牌 X3 倍率', '罕见', {
  onHand: (state) => { if (state.game.handsRemaining === 1) state.mult *= 3; }
});
add('sock_buskin', '短袜与舞鞋', '计分的人头牌额外触发一次', '罕见', {
  retriggerScored: (card, _scored, state) => (isFaceCard(card, state.game) ? 1 : 0)
});
add('swashbuckler', '侠盗', '将其他小丑的售价加入倍率', '普通', {
  onHand(state) {
    const total = state.game.jokers.filter(joker => joker !== this).reduce((sum, joker) => sum + joker.sellPrice(), 0);
    if (total) state.mult += total;
  }
});
add('troubadour', '游吟诗人', '+2 手牌上限，-1 出牌次数', '罕见', {
  modifyRound(stats) {
    stats.handSize += 2;
    stats.hands -= 1;
  }
});
add('certificate', '证书', '选择盲注时，向牌组加入 1 张随机蜡封牌', '罕见', {
  onBlindSelected(game) {
    const card = new Card(pick(SUITS), pick(RANKS), { seal: pick(['gold', 'red', 'blue', 'purple']) });
    game.deck.cards.push(card);
    game.onPlayingCardAdded();
  }
});
add('smeared', '模糊小丑', '红桃与方块视为同花色，黑桃与梅花视为同花色', '罕见');
add('throwback', '回溯', '每跳过一个盲注 X0.25 倍率', '罕见', {
  onHand(state) {
    const x = 1 + (state.game.flags.blindsSkipped || 0) * 0.25;
    if (x !== 1) state.mult *= x;
  }
});
add('hanging_chad', '吊坠', '第一张计分牌额外触发两次', '普通', {
  retriggerScored: (card, scored) => (scored[0] === card ? 2 : 0)
});
add('rough_gem', '原石', '计分的方块 +$1', '罕见', {
  onScoredCard: (card, state) => { if (matches(card, '♦', state.game)) state.dollars += 1; }
});
add('bloodstone', '血石', '计分的红桃有 1/2 几率 X1.5 倍率', '罕见', {
  onScoredCard(card, state) {
    if (matches(card, '♥', state.game) && Math.random() < state.game.probability(1 / 2)) state.mult *= 1.5;
  }
});
add('arrowhead', '箭头', '计分的黑桃 +50 筹码', '罕见', {
  onScoredCard: (card, state) => { if (matches(card, '♠', state.game)) state.chips += 50; }
});
add('onyx_agate', '缟玛瑙', '计分的梅花 +7 倍率', '罕见', {
  onScoredCard: (card, state) => { if (matches(card, '♣', state.game)) state.mult += 7; }
});
add('glass_joker', '玻璃小丑', '每摧毁一张玻璃牌 X0.75 倍率', '罕见', {
  initialData: () => ({ x: 1 }),
  onCardDestroyed(card) {
    if (card.enhancement === 'glass' || card._glassBroken) this.data.x += 0.75;
  },
  onHand: xMult
});
add('showman', '马戏团', '商店和补充包可以再次出现你已经拥有的牌', '普通');
add('flower_pot', '花盆', '计分牌同时包含四种花色时 X3 倍率', '罕见', {
  onHand(state) {
    const ready = ['♠', '♥', '♦', '♣'].every(suit => state.scoredCards.some(card => matches(card, suit, state.game)));
    if (ready) state.mult *= 3;
  }
});
add('blueprint', '蓝图', '复制右侧小丑的效果', '稀有');
add('wee', '小小丑', '计分的 2 使这张小丑永久 +8 筹码', '稀有', {
  initialData: () => ({ chips: 0 }),
  onScoredCard(card, state) {
    if (card.enhancement === 'stone' || card.rank !== '2') return;
    this.data.chips += 8;
    state.chips += this.data.chips;
  }
});
add('merry_andy', '快乐安迪', '+3 弃牌次数，-1 手牌上限', '罕见', {
  modifyRound(stats) {
    stats.discards += 3;
    stats.handSize -= 1;
  }
});
add('oops', '六六大顺', '所有列出的概率变为两倍', '罕见');
add('idol', '偶像', '指定点数和花色的计分牌 X2 倍率，每回合更换', '罕见', {
  initialData: () => ({ rank: pick(RANKS), suit: pick(SUITS) }),
  onBlindSelected() {
    this.data.rank = pick(RANKS);
    this.data.suit = pick(SUITS);
  },
  onScoredCard(card, state) {
    if (card.enhancement === 'stone') return;
    if (card.rank === this.data.rank && matches(card, this.data.suit, state.game)) state.mult *= 2;
  },
  extraLine() { return `（当前：${this.data.rank}${this.data.suit}）`; }
});
add('seeing_double', '重影', '计分牌中有梅花和其他花色时 X2 倍率', '罕见', {
  onHand(state) {
    const present = new Set();
    for (const card of state.scoredCards) {
      if (card.enhancement === 'stone') continue;
      if (card.enhancement === 'wild') ['♠', '♥', '♦', '♣'].forEach(suit => present.add(suit));
      else if (state.game.hasEffect('smeared')) {
        (card.suit === '♥' || card.suit === '♦' ? ['♥', '♦'] : ['♠', '♣']).forEach(suit => present.add(suit));
      } else present.add(card.suit);
    }
    if (present.has('♣') && [...present].some(suit => suit !== '♣')) state.mult *= 2;
  }
});
add('matador', '斗牛士', '打出的牌触发 Boss 能力时 +$8', '罕见');
add('hit_the_road', '上路', '本回合每弃一张 J，X0.5 倍率', '稀有', {
  initialData: () => ({ jacks: 0 }),
  onDiscard(_game, cards) {
    this.data.jacks += cards.filter(card => card.rank === 'J' && card.enhancement !== 'stone').length;
  },
  onHand(state) {
    const x = 1 + this.data.jacks * 0.5;
    if (x !== 1) state.mult *= x;
  },
  onRoundEnd() { this.data.jacks = 0; }
});
add('duo', '二重奏', '牌型包含对子时 X2 倍率', '稀有', { onHand: handBonus('PAIR', 0, 0, 2) });
add('trio', '三重奏', '牌型包含三条时 X3 倍率', '稀有', { onHand: handBonus('THREE', 0, 0, 3) });
add('family', '家族', '牌型包含四条时 X4 倍率', '稀有', { onHand: handBonus('FOUR', 0, 0, 4) });
add('order', '秩序', '牌型包含顺子时 X3 倍率', '稀有', { onHand: handBonus('STRAIGHT', 0, 0, 3) });
add('tribe', '部落', '牌型包含同花时 X2 倍率', '稀有', { onHand: handBonus('FLUSH', 0, 0, 2) });
add('stuntman', '特技演员', '+250 筹码，-2 手牌上限', '稀有', {
  modifyRound: (stats) => { stats.handSize -= 2; },
  onHand: (state) => { state.chips += 250; }
});
add('invisible', '隐形小丑', '经过 2 个回合后出售，可复制一张其他小丑', '稀有', {
  initialData: () => ({ rounds: 0 }),
  onRoundEnd() { this.data.rounds += 1; },
  onSell(game) {
    if (this.data.rounds < 2) return;
    const others = game.jokers.filter(joker => joker !== this && !joker.pendingDestroy);
    if (!others.length) return;
    game.pendingJokers.push(others[Math.floor(Math.random() * others.length)].clone());
  }
});
add('brainstorm', '头脑风暴', '复制最左侧小丑的效果', '稀有');
add('satellite', '卫星', '回合结束时，本局每种使用过的行星牌 +$1', '罕见', {
  onCashOut: (game) => game.stats.uniquePlanets.length
});
add('shoot_the_moon', '射月', '留在手牌中的每张 Q +13 倍率', '普通', {
  onHeldCard(card, state) {
    if (card.enhancement !== 'stone' && card.rank === 'Q') state.mult += 13;
  }
});
add('drivers_license', '驾照', '完整牌组中至少有 16 张强化牌时 X3 倍率', '稀有', {
  onHand(state) {
    if (fullDeck(state.game).filter(card => card.enhancement).length >= 16) state.mult *= 3;
  }
});
add('cartomancer', '卡牌大师', '选择盲注时生成一张塔罗牌', '罕见', {
  onBlindSelected: (game) => game.gainConsumable('tarot')
});
add('astronomer', '天文学家', '行星牌和天体包免费', '罕见');
add('burnt', '烧焦小丑', '每回合第一次弃牌的牌型升级', '稀有', {
  initialData: () => ({ used: false }),
  onBlindSelected() { this.data.used = false; },
  onDiscard(game, cards) {
    if (this.data.used || !cards.length) return;
    this.data.used = true;
    const result = HandEvaluator.evaluate(cards, game.evalOptions());
    if (result?.type) game.upgradeHand(result.type);
  }
});
add('bootstraps', '靴带', '每拥有 $5 +2 倍率', '罕见', {
  onHand: (state) => { state.mult += Math.floor(Math.max(0, state.game.money) / 5) * 2; }
});
add('canio', '卡尼奥', '每摧毁一张人头牌 X1 倍率', '传说', {
  initialData: () => ({ x: 1 }),
  onCardDestroyed(card, game) { if (isFaceCard(card, game)) this.data.x += 1; },
  onHand: xMult
});
add('triboulet', '特里布莱', '计分的 K 和 Q X2 倍率', '传说', {
  onScoredCard(card, state) {
    if (card.enhancement !== 'stone' && (card.rank === 'K' || card.rank === 'Q')) state.mult *= 2;
  }
});
add('yorick', '约里克', '每弃掉 23 张牌 X1 倍率', '传说', {
  initialData: () => ({ x: 1, discarded: 0 }),
  onDiscard(_game, cards) {
    this.data.discarded += cards.length;
    while (this.data.discarded >= 23) {
      this.data.discarded -= 23;
      this.data.x += 1;
    }
  },
  onHand: xMult
});
add('chicot', '希科', '使当前 Boss 盲注失效', '传说', {
  onBlindSelected(game) {
    game.bossDisabled = true;
    game.scoreRequired = game.getScoreRequired();
    if (game.bossId === 'water') game.discardsRemaining = game.baseDiscards;
    if (game.bossId === 'needle') game.handsRemaining = game.baseHands;
  }
});
add('perkeo', '佩尔科', '离开商店时，随机复制一张消耗牌为负片', '传说', {
  onShopEnd(game) {
    const pool = game.consumables.filter(card => !card.negative);
    if (!pool.length) return;
    const source = pool[Math.floor(Math.random() * pool.length)];
    game.consumables.push({ ...source, negative: true });
  }
});

if (defs.length !== 150) {
  throw new Error(`小丑牌数量应为 150，当前是 ${defs.length}`);
}

const ids = new Set();
for (const def of defs) {
  if (ids.has(def.id)) throw new Error(`重复的小丑 id: ${def.id}`);
  ids.add(def.id);
}

export const JOKER_DEFS = defs;
