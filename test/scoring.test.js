import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Card } from '../src/cards.js';
import { HandEvaluator } from '../src/handEvaluator.js';
import { GameState } from '../src/game.js';
import { Joker } from '../src/jokers.js';
import { SaveManager, serializeGame } from '../src/save.js';
import { getScoreRequired } from '../src/blinds.js';

function setHand(game, cards) {
  game.hand.cards = cards;
  game.hand.maxSize = Math.max(game.handSize, cards.length);
}

describe('score targets', () => {
  it('scales blinds and the wall boss', () => {
    assert.equal(getScoreRequired(1, 'small', null), 300);
    assert.equal(getScoreRequired(1, 'big', null), 450);
    assert.equal(getScoreRequired(1, 'boss', 'hook'), 600);
    assert.equal(getScoreRequired(8, 'boss', 'wall'), 8800);
    assert.equal(getScoreRequired(9, 'small', null), 2750);
  });
});

describe('boss rules', () => {
  it('plant scores no chips from face cards and skips suit jokers', () => {
    const game = new GameState();
    game.bossId = 'plant';
    game.jokers = [new Joker('WRATHFUL_JOKER')];
    setHand(game, [
      new Card('♠', 'K'),
      new Card('♥', 'K'),
      new Card('♣', '2'),
      new Card('♦', '3')
    ]);

    const result = game.playHand([0, 1]);
    assert.equal(result.cardChips, 0);
    assert.equal(result.chips, 10);
    assert.equal(result.mult, 2);
    assert.equal(result.score, 20);
  });

  it('flint halves base chips and mult', () => {
    const game = new GameState();
    game.bossId = 'flint';
    setHand(game, [
      new Card('♠', '2'),
      new Card('♥', '2'),
      new Card('♣', '3'),
      new Card('♦', '4')
    ]);

    const result = game.playHand([0, 1]);
    assert.equal(result.chips, 9);
    assert.equal(result.mult, 1);
    assert.equal(result.score, 9);
  });

  it('psychic rejects a hand that is not 5 cards', () => {
    const game = new GameState();
    game.bossId = 'psychic';
    const hands = game.handsRemaining;
    const result = game.playHand([0]);
    assert.match(result.error, /灵媒/);
    assert.equal(game.handsRemaining, hands);
  });

  it('eye rejects a repeated hand type', () => {
    const game = new GameState();
    game.bossId = 'eye';
    setHand(game, [
      new Card('♠', 'A'),
      new Card('♥', 'K'),
      new Card('♣', 'Q'),
      new Card('♦', '2')
    ]);

    const first = game.playHand([0]);
    assert.equal(first.handResult.type, 'HIGH_CARD');
    const second = game.playHand([0]);
    assert.match(second.error, /眼睛/);
    assert.equal(game.handsRemaining, 3);
  });

  it('hook discards two held cards and refills the hand', () => {
    const game = new GameState();
    game.bossId = 'hook';
    game.handSize = 8;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9'];
    setHand(game, ranks.map(rank => new Card('♠', rank)));

    game.playHand([0]);
    assert.equal(game.hand.cards.length, 8);
    assert.equal(game.deck.discardPile.length, 3);
  });

  it('water removes discards after drunkard, needle leaves one hand', () => {
    const water = new GameState();
    water.jokers = [new Joker('DRUNKARD')];
    water.blind = 'boss';
    water.ante = 2;
    water.beginBlind();
    assert.equal(water.bossId, 'water');
    assert.equal(water.discardsRemaining, 0);

    const needle = new GameState();
    needle.blind = 'boss';
    needle.ante = 3;
    needle.beginBlind();
    assert.equal(needle.bossId, 'needle');
    assert.equal(needle.handsRemaining, 1);
    assert.equal(needle.discardsRemaining, 3);
  });
});

describe('joker effects', () => {
  it('stacks mult multipliers and lets gambler zero the score', () => {
    const game = new GameState();
    game.handsRemaining = 1;
    game.jokers = [new Joker('ACROBAT'), new Joker('ACROBAT')];
    setHand(game, [new Card('♠', 'A'), new Card('♥', '2')]);

    const stacked = game.playHand([0]);
    assert.equal(stacked.mult, 9);
    assert.equal(stacked.score, 135);

    const gambler = new GameState();
    gambler.jokers = [new Joker('GAMBLER')];
    setHand(gambler, [new Card('♠', 'A'), new Card('♥', '2')]);
    const random = Math.random;
    Math.random = () => 0.99;
    try {
      const bust = gambler.playHand([0]);
      assert.equal(bust.mult, 0);
      assert.equal(bust.score, 0);
    } finally {
      Math.random = random;
    }
  });

  it('counts held kings and queens, and grows the green joker', () => {
    const baron = new GameState();
    baron.jokers = [new Joker('BARON')];
    setHand(baron, [
      new Card('♠', 'A'),
      new Card('♠', 'K'),
      new Card('♥', 'K'),
      new Card('♣', '2')
    ]);
    const held = baron.playHand([0]);
    assert.equal(held.mult, 2.25);
    assert.equal(held.score, 33);

    const green = new Joker('GREEN_JOKER');
    const grow = new GameState();
    grow.jokers = [green];
    setHand(grow, [new Card('♠', 'A'), new Card('♥', '2'), new Card('♣', '3')]);
    const played = grow.playHand([0]);
    assert.equal(green.data.mult, 1);
    assert.equal(played.mult, 2);
    grow.discard([0]);
    assert.equal(green.data.mult, 0);
  });

  it('pays interest with a cap, plus joker cash outs', () => {
    const rich = new GameState();
    rich.money = 100;
    rich.handsRemaining = 0;
    rich.blind = 'small';
    rich.jokers = [];
    const capped = rich.cashOut();
    assert.equal(capped.interest, 5);
    assert.equal(capped.reward, 3);
    assert.equal(capped.total, 8);
    assert.equal(rich.money, 108);

    const mid = new GameState();
    mid.money = 23;
    mid.handsRemaining = 1;
    mid.blind = 'big';
    const partial = mid.cashOut();
    assert.equal(partial.interest, 4);
    assert.equal(partial.reward, 4);
    assert.equal(partial.handsBonus, 1);
    assert.equal(partial.total, 9);

    const delayed = new GameState();
    delayed.money = 0;
    delayed.handsRemaining = 0;
    delayed.blind = 'small';
    delayed.discardsUsed = 0;
    delayed.discardsRemaining = 3;
    delayed.jokers = [new Joker('DELAYED_GRATIFICATION'), new Joker('CLOUD_9')];
    const payout = delayed.cashOut();
    assert.equal(payout.jokerBonus, 10);

    delayed.discardsUsed = 1;
    const rocket = new Joker('ROCKET');
    delayed.jokers = [new Joker('DELAYED_GRATIFICATION'), rocket];
    delayed.money = 0;
    delayed.blind = 'boss';
    delayed.bossId = 'hook';
    const bossPayout = delayed.cashOut();
    assert.equal(bossPayout.jokerPayouts.find(entry => entry.name === '延迟满足'), undefined);
    assert.equal(bossPayout.jokerBonus, 1);
    delayed.advanceBlind();
    assert.equal(rocket.data.payout, 3);
    assert.equal(delayed.ante, 2);
    assert.equal(delayed.blind, 'small');
  });

  it('lets four fingers make a 4-card straight, but not a royal flush', () => {
    const straightCards = [
      new Card('♠', '5'),
      new Card('♥', '6'),
      new Card('♦', '7'),
      new Card('♣', '8')
    ];
    assert.equal(HandEvaluator.evaluate(straightCards).type, 'HIGH_CARD');
    assert.equal(HandEvaluator.evaluate(straightCards, { fourFingers: true }).type, 'STRAIGHT');

    const flushCards = [
      new Card('♥', 'A'),
      new Card('♥', 'K'),
      new Card('♥', 'Q'),
      new Card('♥', '9')
    ];
    assert.equal(HandEvaluator.evaluate(flushCards, { fourFingers: true }).type, 'FLUSH');

    const royalFour = [
      new Card('♥', 'A'),
      new Card('♥', 'K'),
      new Card('♥', 'Q'),
      new Card('♥', 'J')
    ];
    assert.equal(HandEvaluator.evaluate(royalFour, { fourFingers: true }).type, 'STRAIGHT_FLUSH');

    const fiveStraight = [
      new Card('♠', '5'),
      new Card('♥', '6'),
      new Card('♦', '7'),
      new Card('♣', '8'),
      new Card('♠', '9')
    ];
    assert.equal(HandEvaluator.evaluate(fiveStraight).type, 'STRAIGHT');
    assert.equal(HandEvaluator.evaluate(fiveStraight, { fourFingers: true }).cards.length, 5);

    const game = new GameState();
    game.jokers = [new Joker('FOUR_FINGERS')];
    setHand(game, straightCards);
    assert.equal(game.playHand([0, 1, 2, 3]).handResult.type, 'STRAIGHT');
  });

  it('copies the joker on the right and counts repeated hand types', () => {
    const copied = new GameState();
    copied.jokers = [new Joker('BLUEPRINT'), new Joker('JOKER')];
    setHand(copied, [new Card('♠', 'A'), new Card('♥', '2')]);
    const mirrored = copied.playHand([0]);
    assert.equal(mirrored.mult, 9);

    const alone = new GameState();
    alone.jokers = [new Joker('JOKER'), new Joker('BLUEPRINT')];
    setHand(alone, [new Card('♠', 'A'), new Card('♥', '2')]);
    assert.equal(alone.playHand([0]).mult, 5);

    const nova = new GameState();
    nova.jokers = [new Joker('SUPERNOVA'), new Joker('SHOOT_THE_MOON'), new Joker('HALF_JOKER')];
    setHand(nova, [
      new Card('♠', 'A'),
      new Card('♥', 'Q'),
      new Card('♣', '2')
    ]);
    const first = nova.playHand([0]);
    assert.equal(first.mult, 1 + 1 + 13 + 20);
    const second = nova.playHand([0]);
    assert.equal(second.handResult.type, 'HIGH_CARD');
    assert.ok(second.mult >= 1 + 2 + 20);
  });

  it('juggler increases hand size', () => {
    const game = new GameState();
    game.jokers = [new Joker('JUGGLER')];
    game.beginBlind();
    assert.equal(game.hand.cards.length, 9);
    assert.equal(game.discardsRemaining, 3);
  });
});

describe('save migration', () => {
  it('restores old saves onto the matching blind and keeps joker data', () => {
    const loaded = new GameState();
    SaveManager.restoreGame(loaded, {
      round: 3,
      ante: 1,
      money: 10,
      handsRemaining: 2,
      discardsRemaining: 1,
      score: 50,
      scoreRequired: 999,
      isFirstHand: false,
      maxJokers: 5,
      hand: [{ suit: '♠', rank: 'A' }],
      deck: [{ suit: '♥', rank: '9' }],
      discardPile: [],
      jokers: ['joker']
    });

    assert.equal(loaded.blind, 'boss');
    assert.equal(loaded.bossId, 'hook');
    assert.equal(loaded.scoreRequired, 600);
    assert.equal(loaded.jokers[0].id, 'joker');
    assert.equal(loaded.hand.cards[0].rank, 'A');

    const source = new GameState();
    const green = new Joker('GREEN_JOKER');
    green.data.mult = 4;
    source.jokers = [green];
    source.blind = 'big';
    source.ante = 4;
    source.handTypeCounts = { PAIR: 2 };
    source.bossId = null;

    const restored = new GameState();
    SaveManager.restoreGame(restored, serializeGame(source));
    assert.equal(restored.jokers[0].data.mult, 4);
    assert.equal(restored.blind, 'big');
    assert.equal(restored.bossId, null);
    assert.equal(restored.handTypeCounts.PAIR, 2);
    assert.equal(restored.getScoreRequired(), 1125);
  });
});
