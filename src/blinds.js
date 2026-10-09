// 盲注与 Boss

export const ANTE_BASES = [300, 420, 560, 750, 1000, 1300, 1700, 2200];

export const BLIND_LABELS = {
  small: '小盲注',
  big: '大盲注',
  boss: 'Boss 盲注'
};

export const BLIND_REWARDS = {
  small: 3,
  big: 4,
  boss: 5
};

export const BOSSES = [
  { id: 'hook', name: '钩子', description: '每次出牌后，随机弃掉 2 张剩余手牌' },
  { id: 'water', name: '水', description: '本盲注弃牌次数为 0' },
  { id: 'needle', name: '针', description: '本盲注只能出 1 次牌' },
  { id: 'psychic', name: '灵媒', description: '每次必须正好打出 5 张牌' },
  { id: 'plant', name: '植物', description: '人头牌（J/Q/K）不计筹码，也不触发花色小丑' },
  { id: 'flint', name: '燧石', description: '牌型基础筹码和倍率减半' },
  { id: 'eye', name: '眼睛', description: '不能重复打出同一种牌型' },
  { id: 'wall', name: '墙', description: '目标分数翻倍' }
];

export function anteBase(ante) {
  if (ante >= 1 && ante <= ANTE_BASES.length) {
    return ANTE_BASES[ante - 1];
  }
  return Math.round(ANTE_BASES[ANTE_BASES.length - 1] * (1.25 ** (ante - ANTE_BASES.length)));
}

export function bossForAnte(ante) {
  return BOSSES[(Math.max(1, ante) - 1) % BOSSES.length];
}

export function getBoss(bossId) {
  return BOSSES.find(boss => boss.id === bossId) || null;
}

export function blindFromRound(round) {
  const order = ['small', 'big', 'boss'];
  const index = ((round || 1) - 1) % 3;
  return order[index];
}

export function getScoreRequired(ante, blind, bossId) {
  let multiplier = 1;
  if (blind === 'big') multiplier = 1.5;
  if (blind === 'boss') multiplier = 2;
  if (bossId === 'wall') multiplier *= 2;
  return Math.floor(anteBase(ante) * multiplier);
}
