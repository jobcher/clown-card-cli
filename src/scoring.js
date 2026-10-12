// 按官方顺序结算：牌型等级 → 计分牌从左到右（含再触发）→ 手牌 → 每手一次的小丑。
import { handStats } from './handLevels.js';

export function isFaceCard(card, game) {
  if (!card || card.enhancement === 'stone') return false;
  if (game?.hasEffect?.('pareidolia')) return true;
  return card.isFaceCard();
}

export function sourceJoker(game, index) {
  const joker = game.jokers[index];
  if (!joker?.enabled) return null;
  if (joker.id === 'blueprint') {
    const next = game.jokers[index + 1];
    if (!next?.enabled || next.id === 'blueprint') return null;
    if (next.id === 'brainstorm') {
      const first = game.jokers[0];
      if (!first?.enabled || first.id === 'blueprint' || first.id === 'brainstorm') return null;
      return { actor: joker, source: first };
    }
    return { actor: joker, source: next };
  }
  if (joker.id === 'brainstorm') {
    const first = game.jokers[0];
    if (index === 0 || !first?.enabled || first.id === 'brainstorm') return null;
    if (first.id === 'blueprint') {
      const copied = sourceJoker(game, 0);
      if (!copied) return null;
      return { actor: joker, source: copied.source };
    }
    return { actor: joker, source: first };
  }
  return { actor: joker, source: joker };
}

function forEachJoker(game, fn) {
  for (let index = 0; index < game.jokers.length; index++) {
    const pair = sourceJoker(game, index);
    if (pair) fn(pair.actor, pair.source);
  }
}

function applyEdition(actor, state) {
  if (actor.edition === 'foil') state.chips += 50;
  else if (actor.edition === 'holo') state.mult += 10;
  else if (actor.edition === 'polychrome') state.mult *= 1.5;
}

function runJoker(actor, source, state, fn) {
  const before = [state.chips, state.mult, state.dollars];
  fn(source, actor);
  const changed = before[0] !== state.chips || before[1] !== state.mult || before[2] !== state.dollars;
  if (changed) applyEdition(actor, state);
}

function extraScoredRetriggers(game, card, scored, state) {
  let extra = card.seal === 'red' ? 1 : 0;
  forEachJoker(game, (_actor, source) => {
    extra += source.retriggerScored?.(card, scored, state) || 0;
  });
  return extra;
}

function extraHeldRetriggers(game, card) {
  let extra = card.seal === 'red' ? 1 : 0;
  forEachJoker(game, (_actor, source) => {
    extra += source.retriggerHeld?.(card) || 0;
  });
  return extra;
}

function triggerScoredCard(game, card, state) {
  if (game.isCardDebuffed(card) || card.debuffed) return;
  state.luckyProc = 0;
  if (card.enhancement === 'stone') {
    state.chips += 50 + (card.bonusChips || 0);
    state.cardChips += 50;
  } else {
    const rankChips = card.getChipValue();
    state.chips += rankChips + (card.bonusChips || 0);
    state.cardChips += rankChips;
  }

  if (card.enhancement === 'bonus') state.chips += 30;
  if (card.enhancement === 'mult') state.mult += 4;
  if (card.enhancement === 'glass') {
    state.mult *= 2;
    if (Math.random() < game.probability(1 / 4)) {
      card._glassBroken = true;
      state.destroyed.push(card);
    }
  }
  if (card.enhancement === 'lucky') {
    if (Math.random() < game.probability(1 / 5)) {
      state.mult += 20;
      state.luckyProc += 1;
    }
    if (Math.random() < game.probability(1 / 15)) {
      state.dollars += 20;
      state.luckyProc += 1;
    }
  }
  if (card.edition === 'foil') state.chips += 50;
  if (card.edition === 'holo') state.mult += 10;
  if (card.edition === 'polychrome') state.mult *= 1.5;
  if (card.seal === 'gold') state.dollars += 3;

  forEachJoker(game, (actor, source) => {
    runJoker(actor, source, state, (joker, owner) => {
      joker.onScoredCard?.(card, state, owner);
    });
  });
}

function triggerHeldCard(game, card, state) {
  if (game.isCardDebuffed(card) || card.debuffed) return;
  if (card.enhancement === 'steel') state.mult *= 1.5;
  if (card.edition === 'foil') state.chips += 50;
  if (card.edition === 'holo') state.mult += 10;
  if (card.edition === 'polychrome') state.mult *= 1.5;
  forEachJoker(game, (actor, source) => {
    runJoker(actor, source, state, (joker, owner) => {
      joker.onHeldCard?.(card, state, owner);
    });
  });
}

export function scorePlayedHand(game, playedCards, handResult) {
  const stats = handStats(game.handLevels, handResult.type);
  const state = {
    game,
    chips: stats.chips,
    mult: stats.mult,
    dollars: 0,
    cardChips: 0,
    destroyed: [],
    copies: [],
    handResult,
    playedCards,
    luckyProc: 0
  };
  if (game.bossId === 'flint' && !game.bossDisabled) {
    state.chips = Math.max(1, Math.floor(state.chips / 2));
    state.mult = Math.max(1, Math.floor(state.mult / 2));
  }
  state.level = stats.level;
  state.baseChips = state.chips;
  state.baseMult = state.mult;

  const splash = game.hasEffect('splash');
  const pool = splash ? playedCards : handResult.cards;
  const scored = pool
    .filter(card => !game.isCardDebuffed(card) && !card.debuffed)
    .sort((a, b) => playedCards.indexOf(a) - playedCards.indexOf(b));
  const playedSet = new Set(playedCards);
  state.heldCards = game.hand.cards.filter(card => !playedSet.has(card));
  state.scoredCards = scored;

  for (const card of scored) {
    const times = 1 + extraScoredRetriggers(game, card, scored, state);
    for (let time = 0; time < times; time++) triggerScoredCard(game, card, state);
  }

  for (const card of state.heldCards) {
    const times = 1 + extraHeldRetriggers(game, card);
    for (let time = 0; time < times; time++) triggerHeldCard(game, card, state);
  }

  forEachJoker(game, (actor, source) => {
    runJoker(actor, source, state, (joker, owner) => {
      joker.onHand?.(state, owner);
    });
  });

  return {
    handResult,
    level: state.level,
    baseChips: state.baseChips,
    baseMult: state.baseMult,
    chips: state.chips,
    mult: state.mult,
    score: Math.max(0, Math.floor(state.chips * state.mult)),
    cardChips: state.cardChips,
    dollars: state.dollars,
    destroyed: state.destroyed,
    copies: state.copies
  };
}

