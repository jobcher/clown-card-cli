// 塔罗、行星和幻灵，以及普通补充包。
import { Card, SUITS, RANKS, RANK_VALUES } from './cards.js';
import { HAND_LEVELS } from './handLevels.js';

const ENHANCE_POOL = ['bonus', 'mult', 'wild', 'glass', 'steel', 'gold', 'lucky'];
const EDITION_POOL = ['foil', 'holo', 'polychrome'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function card(id, name, description, kind, cost) {
  return { id, name, description, kind, cost };
}

export const PACKS = {
  arcana: { id: 'arcana', name: '奥秘包', kind: 'tarot', cost: 4, size: 3 },
  celestial: { id: 'celestial', name: '天体包', kind: 'planet', cost: 4, size: 3 },
  spectral: { id: 'spectral', name: '幻灵包', kind: 'spectral', cost: 4, size: 2 }
};

export const CONSUMABLES = [
  card('fool', '愚者', '复制本局上一张使用的塔罗或行星', 'tarot', 3),
  card('magician', '魔术师', '把最多 2 张牌变成幸运牌', 'tarot', 3),
  card('priestess', '女祭司', '生成最多 2 张行星牌', 'tarot', 3),
  card('empress', '女皇', '把最多 2 张牌变成倍率牌', 'tarot', 3),
  card('emperor', '皇帝', '生成最多 2 张塔罗牌', 'tarot', 3),
  card('hierophant', '教皇', '把最多 2 张牌变成奖励牌', 'tarot', 3),
  card('lovers', '恋人', '把 1 张牌变成万能牌', 'tarot', 3),
  card('chariot', '战车', '把 1 张牌变成钢铁牌', 'tarot', 3),
  card('justice', '正义', '把 1 张牌变成玻璃牌', 'tarot', 3),
  card('hermit', '隐士', '金钱翻倍，最多 +$20', 'tarot', 3),
  card('wheel', '命运之轮', '1/4 几率给一张随机小丑加上版本', 'tarot', 3),
  card('strength', '力量', '让最多 2 张牌的点数 +1', 'tarot', 3),
  card('hanged', '倒吊人', '摧毁最多 2 张牌', 'tarot', 3),
  card('death', '死神', '把左边选中的牌变成右边那张', 'tarot', 3),
  card('temperance', '节制', '获得所有小丑售价之和，最多 $50', 'tarot', 3),
  card('devil', '恶魔', '把 1 张牌变成黄金牌', 'tarot', 3),
  card('tower', '高塔', '把 1 张牌变成石头牌', 'tarot', 3),
  card('star', '星星', '把最多 3 张牌变成方块', 'tarot', 3),
  card('moon', '月亮', '把最多 3 张牌变成梅花', 'tarot', 3),
  card('sun', '太阳', '把最多 3 张牌变成红桃', 'tarot', 3),
  card('world', '世界', '把最多 3 张牌变成黑桃', 'tarot', 3),
  card('judgement', '审判', '生成一张随机小丑（有空位时）', 'tarot', 3),
  card('pluto', '冥王星', '升级高牌', 'planet', 3),
  card('mercury', '水星', '升级对子', 'planet', 3),
  card('uranus', '天王星', '升级两对', 'planet', 3),
  card('venus', '金星', '升级三条', 'planet', 3),
  card('saturn', '土星', '升级顺子', 'planet', 3),
  card('jupiter', '木星', '升级同花', 'planet', 3),
  card('earth', '地球', '升级葫芦', 'planet', 3),
  card('mars', '火星', '升级四条', 'planet', 3),
  card('neptune', '海王星', '升级同花顺', 'planet', 3),
  card('planet_x', '星球 X', '升级五同', 'planet', 3),
  card('ceres', '谷神星', '升级同花葫芦', 'planet', 3),
  card('eris', '阋神星', '升级同花五条', 'planet', 3),
  card('familiar', '熟悉', '摧毁 1 张手牌，加入 3 张强化人头牌', 'spectral', 4),
  card('grim', '严峻', '摧毁 1 张手牌，加入 2 张强化 A', 'spectral', 4),
  card('incantation', '咒缚', '摧毁 1 张手牌，加入 4 张强化数字牌', 'spectral', 4),
  card('talisman', '护身符', '给 1 张牌加上金蜡封', 'spectral', 4),
  card('aura', '光环', '给 1 张牌加上箔片、全息或多彩', 'spectral', 4),
  card('wraith', '幽灵', '生成一张稀有小丑，金钱变为 $0', 'spectral', 4),
  card('sigil', '印记', '手牌全部变成同一种随机花色', 'spectral', 4),
  card('ouija', '占卜', '手牌全部变成同一个随机点数，手牌上限 -1', 'spectral', 4),
  card('ectoplasm', '灵质', '给一张随机小丑加上负片，手牌上限 -1', 'spectral', 4),
  card('immolate', '火祭', '随机摧毁 5 张手牌，+$20', 'spectral', 4),
  card('ankh', '安卡', '复制一张随机小丑，摧毁其余小丑', 'spectral', 4),
  card('deja_vu', '既视', '给 1 张牌加上红蜡封', 'spectral', 4),
  card('hex', '妖法', '给一张随机小丑加上多彩，摧毁其余小丑', 'spectral', 4),
  card('trance', '入迷', '给 1 张牌加上蓝蜡封', 'spectral', 4),
  card('medium', '通灵', '给 1 张牌加上紫蜡封', 'spectral', 4),
  card('cryptid', '神秘生物', '把 1 张牌复制 2 张', 'spectral', 4),
  card('soul', '灵魂', '生成一张传说小丑', 'spectral', 4),
  card('black_hole', '黑洞', '升级所有牌型', 'spectral', 4)
];

const BY_ID = Object.fromEntries(CONSUMABLES.map(entry => [entry.id, entry]));

const PLANET_HANDS = {
  pluto: 'HIGH_CARD',
  mercury: 'PAIR',
  uranus: 'TWO_PAIR',
  venus: 'THREE_OF_A_KIND',
  saturn: 'STRAIGHT',
  jupiter: 'FLUSH',
  earth: 'FULL_HOUSE',
  mars: 'FOUR_OF_A_KIND',
  neptune: 'STRAIGHT_FLUSH',
  planet_x: 'FIVE_OF_A_KIND',
  ceres: 'FLUSH_HOUSE',
  eris: 'FLUSH_FIVE'
};

const HAND_PLANETS = Object.fromEntries(Object.entries(PLANET_HANDS).map(([planet, hand]) => [hand, planet]));
HAND_PLANETS.ROYAL_FLUSH = 'neptune';

const SELECTION = {
  magician: [1, 2],
  empress: [1, 2],
  hierophant: [1, 2],
  lovers: [1, 1],
  chariot: [1, 1],
  justice: [1, 1],
  strength: [1, 2],
  hanged: [1, 2],
  death: [2, 2],
  devil: [1, 1],
  tower: [1, 1],
  star: [1, 3],
  moon: [1, 3],
  sun: [1, 3],
  world: [1, 3],
  talisman: [1, 1],
  aura: [1, 1],
  deja_vu: [1, 1],
  trance: [1, 1],
  medium: [1, 1],
  cryptid: [1, 1]
};

export function selectionFor(game, consumable) {
  if (!consumable) return null;
  if (consumable.id === 'fool') {
    const last = game?.stats?.lastConsumable;
    if (!last || last === 'fool') return null;
    return SELECTION[last] || null;
  }
  return SELECTION[consumable.id] || null;
}

export function createConsumable(id, game) {
  const def = BY_ID[id];
  if (!def) return null;
  const copy = { ...def, negative: false, extraSell: 0 };
  if (copy.kind === 'planet' && game?.hasEffect?.('astronomer')) copy.cost = 0;
  return copy;
}

export function randomConsumable(kind, game) {
  const pool = CONSUMABLES.filter(entry => entry.kind === kind);
  return createConsumable(pick(pool).id, game);
}

export function planetForHand(type) {
  return HAND_PLANETS[type] || null;
}

export function rollPack(packId, game) {
  const pack = PACKS[packId];
  const cards = [];
  for (let i = 0; i < pack.size; i++) cards.push(randomConsumable(pack.kind, game));
  return cards;
}

function enhance(card, enhancement) {
  card.enhancement = enhancement;
  card.enhanced = true;
}

function destroyRandom(game, count) {
  for (let i = 0; i < count && game.hand.cards.length; i++) {
    const index = Math.floor(Math.random() * game.hand.cards.length);
    const [removed] = game.hand.cards.splice(index, 1);
    game.noteCardDestroyed(removed);
  }
}

function addPlayingCard(game, rank, suit, enhancement) {
  const playing = new Card(suit, rank, { enhancement });
  if (!game.hand.addCards([playing])) game.deck.cards.push(playing);
  game.onPlayingCardAdded();
}

function shrinkHand(game) {
  game.handSizeMod -= 1;
  game.handSize = Math.max(1, game.handSize - 1);
}

export function applyConsumable(game, consumable, targets = [], nested = false) {
  const previous = game.stats.lastConsumable;
  if (!nested && consumable.kind === 'tarot') game.noteTarot(consumable.id);
  if (!nested && consumable.kind === 'planet') game.notePlanet(consumable.id);

  if (consumable.id === 'fool') {
    if (!previous || previous === 'fool') return '没有可以复制的消耗牌';
    return applyConsumable(game, createConsumable(previous, game), targets, true);
  }

  const handType = PLANET_HANDS[consumable.id];
  if (handType) {
    const level = game.upgradeHand(handType);
    return `${HAND_LEVELS[handType].name} 升到 ${level.level} 级`;
  }

  switch (consumable.id) {
    case 'empress':
      targets.forEach(playing => enhance(playing, 'mult'));
      return '选中的牌变成了倍率牌';
    case 'magician':
      targets.forEach(playing => enhance(playing, 'lucky'));
      return '选中的牌变成了幸运牌';
    case 'hierophant':
      targets.forEach(playing => enhance(playing, 'bonus'));
      return '选中的牌变成了奖励牌';
    case 'lovers':
      targets.forEach(playing => enhance(playing, 'wild'));
      return '选中的牌变成了万能牌';
    case 'chariot':
      targets.forEach(playing => enhance(playing, 'steel'));
      return '选中的牌变成了钢铁牌';
    case 'justice':
      targets.forEach(playing => enhance(playing, 'glass'));
      return '选中的牌变成了玻璃牌';
    case 'devil':
      targets.forEach(playing => enhance(playing, 'gold'));
      return '选中的牌变成了黄金牌';
    case 'tower':
      targets.forEach(playing => enhance(playing, 'stone'));
      return '选中的牌变成了石头牌';
    case 'star':
    case 'moon':
    case 'sun':
    case 'world': {
      const suit = { star: '♦', moon: '♣', sun: '♥', world: '♠' }[consumable.id];
      targets.forEach(playing => {
        if (playing.enhancement === 'stone') return;
        playing.suit = suit;
      });
      return '选中的牌改变了花色';
    }
    case 'strength':
      targets.forEach(playing => {
        if (playing.enhancement === 'stone') return;
        const index = RANKS.indexOf(playing.rank);
        if (index >= 0 && index < RANKS.length - 1) {
          playing.rank = RANKS[index + 1];
          playing.value = RANK_VALUES[playing.rank];
        }
      });
      return '选中的牌点数提高了';
    case 'hanged':
      targets.forEach(playing => {
        const index = game.hand.cards.indexOf(playing);
        if (index >= 0) game.hand.cards.splice(index, 1);
        game.noteCardDestroyed(playing);
      });
      return '选中的牌被摧毁了';
    case 'death': {
      const [left, right] = targets;
      if (!left || !right) return '需要选择两张牌';
      left.suit = right.suit;
      left.rank = right.rank;
      left.value = right.value;
      left.enhancement = right.enhancement;
      left.enhanced = right.enhanced;
      left.edition = right.edition;
      left.seal = right.seal;
      left.bonusChips = right.bonusChips;
      return '左边的牌变成了右边的牌';
    }
    case 'hermit': {
      const gain = Math.min(20, Math.max(0, game.money));
      game.money += gain;
      return `获得 $${gain}`;
    }
    case 'temperance': {
      const gain = Math.min(50, game.jokers.reduce((sum, joker) => sum + joker.sellPrice(), 0));
      game.money += gain;
      return `获得 $${gain}`;
    }
    case 'wheel':
      if (Math.random() < game.probability(1 / 4) && game.jokers.length) {
        const joker = pick(game.jokers);
        joker.edition = pick(EDITION_POOL);
        return `${joker.name} 获得了版本`;
      }
      return '什么都没有发生';
    case 'priestess':
    case 'emperor': {
      const kind = consumable.id === 'priestess' ? 'planet' : 'tarot';
      let made = 0;
      for (let i = 0; i < 2; i++) if (game.gainConsumable(kind)) made += 1;
      return `生成了 ${made} 张${kind === 'planet' ? '行星' : '塔罗'}牌`;
    }
    case 'judgement': {
      const joker = game.gainJoker('any');
      return joker ? `获得了 ${joker.name}` : '没有空的小丑槽';
    }
    case 'familiar':
      destroyRandom(game, 1);
      for (let i = 0; i < 3; i++) addPlayingCard(game, pick(['J', 'Q', 'K']), pick(SUITS), pick(ENHANCE_POOL));
      return '手牌中加入了强化人头牌';
    case 'grim':
      destroyRandom(game, 1);
      for (let i = 0; i < 2; i++) addPlayingCard(game, 'A', pick(SUITS), pick(ENHANCE_POOL));
      return '手牌中加入了强化 A';
    case 'incantation':
      destroyRandom(game, 1);
      for (let i = 0; i < 4; i++) addPlayingCard(game, pick(RANKS.slice(0, 9)), pick(SUITS), pick(ENHANCE_POOL));
      return '手牌中加入了强化数字牌';
    case 'talisman':
      targets.forEach(playing => { playing.seal = 'gold'; });
      return '加上了金蜡封';
    case 'deja_vu':
      targets.forEach(playing => { playing.seal = 'red'; });
      return '加上了红蜡封';
    case 'trance':
      targets.forEach(playing => { playing.seal = 'blue'; });
      return '加上了蓝蜡封';
    case 'medium':
      targets.forEach(playing => { playing.seal = 'purple'; });
      return '加上了紫蜡封';
    case 'aura':
      targets.forEach(playing => { playing.edition = pick(EDITION_POOL); });
      return '加上了版本';
    case 'cryptid':
      targets.forEach(playing => {
        for (let i = 0; i < 2; i++) {
          const copy = playing.clone();
          if (!game.hand.addCards([copy])) game.deck.cards.push(copy);
          game.onPlayingCardAdded();
        }
      });
      return '复制了选中的牌';
    case 'wraith': {
      const joker = game.gainJoker('稀有');
      if (!joker) return '没有空的小丑槽';
      game.money = 0;
      return `获得了 ${joker.name}，金钱变为 $0`;
    }
    case 'soul': {
      const joker = game.gainJoker('传说');
      return joker ? `获得了 ${joker.name}` : '没有空的小丑槽';
    }
    case 'sigil': {
      const suit = pick(SUITS);
      game.hand.cards.forEach(playing => {
        if (playing.enhancement !== 'stone') playing.suit = suit;
      });
      return '手牌变成了同一种花色';
    }
    case 'ouija': {
      const rank = pick(RANKS);
      game.hand.cards.forEach(playing => {
        if (playing.enhancement === 'stone') return;
        playing.rank = rank;
        playing.value = RANK_VALUES[rank];
      });
      shrinkHand(game);
      return '手牌变成了同一个点数';
    }
    case 'ectoplasm':
      if (!game.jokers.length) return '没有小丑牌';
      pick(game.jokers).edition = 'negative';
      shrinkHand(game);
      return '一张小丑变成了负片';
    case 'immolate':
      destroyRandom(game, 5);
      game.money += 20;
      return '摧毁了手牌并获得 $20';
    case 'ankh': {
      if (!game.jokers.length) return '没有小丑牌';
      const keep = pick(game.jokers);
      const copy = keep.clone();
      game.jokers = [keep];
      if (game.canAddJoker(copy)) game.jokers.push(copy);
      return `复制了 ${keep.name}`;
    }
    case 'hex': {
      if (!game.jokers.length) return '没有小丑牌';
      const keep = pick(game.jokers);
      keep.edition = 'polychrome';
      game.jokers = [keep];
      return `${keep.name} 变成了多彩`;
    }
    case 'black_hole':
      Object.keys(HAND_LEVELS).forEach(type => game.upgradeHand(type));
      return '所有牌型都升级了';
    default:
      return '这张牌没有效果';
  }
}
