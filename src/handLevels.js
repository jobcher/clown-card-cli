// 牌型等级。皇家同花顺与同花顺共用海王星。

export const HAND_LEVELS = {
  HIGH_CARD: { name: '高牌', baseChips: 5, baseMult: 1, chips: 10, mult: 1 },
  PAIR: { name: '对子', baseChips: 10, baseMult: 2, chips: 15, mult: 1 },
  TWO_PAIR: { name: '两对', baseChips: 20, baseMult: 2, chips: 20, mult: 1 },
  THREE_OF_A_KIND: { name: '三条', baseChips: 30, baseMult: 3, chips: 20, mult: 2 },
  STRAIGHT: { name: '顺子', baseChips: 30, baseMult: 4, chips: 30, mult: 3 },
  FLUSH: { name: '同花', baseChips: 35, baseMult: 4, chips: 15, mult: 2 },
  FULL_HOUSE: { name: '葫芦', baseChips: 40, baseMult: 4, chips: 25, mult: 2 },
  FOUR_OF_A_KIND: { name: '四条', baseChips: 60, baseMult: 7, chips: 30, mult: 3 },
  STRAIGHT_FLUSH: { name: '同花顺', baseChips: 100, baseMult: 8, chips: 40, mult: 4 },
  FIVE_OF_A_KIND: { name: '五同', baseChips: 120, baseMult: 12, chips: 35, mult: 3 },
  FLUSH_HOUSE: { name: '同花葫芦', baseChips: 140, baseMult: 14, chips: 40, mult: 4 },
  FLUSH_FIVE: { name: '同花五条', baseChips: 160, baseMult: 16, chips: 50, mult: 3 }
};

const LEVEL_KEY = {
  ROYAL_FLUSH: 'STRAIGHT_FLUSH'
};

export function levelKey(type) {
  return LEVEL_KEY[type] || type;
}

export function createHandLevels(saved) {
  const levels = {};
  for (const key of Object.keys(HAND_LEVELS)) {
    levels[key] = saved?.[key] || 1;
  }
  return levels;
}

export function handStats(levels, type) {
  const key = levelKey(type);
  const def = HAND_LEVELS[key] || HAND_LEVELS.HIGH_CARD;
  const level = levels[key] || 1;
  return {
    level,
    chips: def.baseChips + (level - 1) * def.chips,
    mult: def.baseMult + (level - 1) * def.mult
  };
}

export function upgradeHand(levels, type) {
  const key = levelKey(type);
  if (!HAND_LEVELS[key]) return null;
  levels[key] = (levels[key] || 1) + 1;
  return { type: key, level: levels[key], ...handStats(levels, key) };
}
