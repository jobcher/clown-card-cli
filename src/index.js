#!/usr/bin/env node
// 小丑牌主入口

import chalk from 'chalk';
import { GameState } from './game.js';
import { UI } from './ui.js';
import { getRandomJoker } from './jokers.js';
import { selectionFor } from './consumables.js';
import { SaveManager } from './save.js';

async function offerConsumable(game, card) {
  if (game.addConsumable(card)) {
    console.log(chalk.green(`获得了 ${card.name}`));
    return;
  }
  console.log(chalk.yellow('消耗牌槽已满。'));
  const choice = await UI.askSellConsumable(game.consumables, true);
  if (choice === -1) {
    console.log(chalk.gray(`放弃了 ${card.name}`));
    return;
  }
  const sold = game.sellConsumable(choice);
  if (sold && game.addConsumable(card)) {
    console.log(chalk.green(`出售了 ${sold.card.name}，获得了 ${card.name}`));
  }
}

function rollShop(game) {
  return [getRandomJoker(game), getRandomJoker(game), getRandomJoker(game)];
}

async function saySomething(game) {
  const word = await UI.askSecret();
  const result = game.applySecret(word);
  console.log(result.ok ? chalk.green(result.message) : chalk.gray(result.message));
  console.log(chalk.yellow(`当前商店概率：${game.rarityOddsText()}`));
  await UI.askContinue();
}

async function main() {
  UI.clear();
  UI.printWelcome();

  let game;

  if (SaveManager.saveExists()) {
    const action = await UI.askLoadGame();

    if (action === 'load') {
      game = new GameState();
      const saveData = SaveManager.loadGame();
      if (saveData) {
        SaveManager.restoreGame(game, saveData);
        console.log('存档加载成功!');
        await UI.askContinue();
      } else {
        console.log('存档损坏，开始新游戏...');
        game = new GameState();
      }
    } else if (action === 'delete') {
      SaveManager.deleteSave();
      console.log('存档已删除!');
      const cont = await UI.askContinue();
      if (!cont) {
        console.log('再见!');
        process.exit(0);
      }
      game = new GameState();
    } else {
      game = new GameState();
    }
  } else {
    const cont = await UI.askContinue();
    if (!cont) {
      console.log('再见!');
      process.exit(0);
    }
    game = new GameState();
  }

  while (true) {
    UI.clear();
    UI.printHeader(game);
    UI.printJokers(game);
    UI.printHand(game.hand);

    if (game.isRoundComplete() && !game.isVictory()) {
      game.tryMrBones();
    }

    if (game.isRoundComplete()) {
      if (game.isVictory()) {
        UI.printVictory();
        const payout = game.cashOut();
        UI.printCashOut(payout);

        if (game.isAnteFinalBoss()) {
          UI.printRunClear();
          const endless = await UI.askEndless();
          if (!endless) {
            SaveManager.deleteSave();
            break;
          }
        }

        game.chaosUsed = false;
        let shopJokers = rollShop(game);

        while (true) {
          const shopAction = await UI.askShop(game);

          if (shopAction === 'skip') {
            break;
          } else if (shopAction === 'buy') {
            while (true) {
              UI.clear();
              UI.printHeader(game);
              UI.printJokers(game);

              const slotsFull = game.jokerSlotsUsed() >= game.maxJokers;

              if (slotsFull) {
                console.log(chalk.yellow('你的小丑牌槽位已满! 可以先出售一些小丑牌。\n'));
              }

              if (shopJokers.length === 0) {
                console.log(chalk.yellow('商店已售罄!'));
                await UI.askContinue();
                break;
              }

              UI.printShopJokers(shopJokers, game);

              const choice = await UI.askJokerPurchase(shopJokers, game);

              if (choice === -1) break;

              const joker = shopJokers[choice];
              if (game.buyJoker(joker)) {
                console.log(chalk.green(`购买了 ${joker.name}!`));
                shopJokers.splice(choice, 1);
              } else {
                console.log(chalk.red('购买失败!'));
              }
              await UI.askContinue();
            }
          } else if (shopAction === 'sell') {
            while (true) {
              UI.clear();
              UI.printHeader(game);

              if (game.jokers.length === 0) {
                console.log(chalk.yellow('你没有可出售的小丑牌!'));
                await UI.askContinue();
                break;
              }

              UI.printYourJokersForSell(game);

              const choice = await UI.askJokerSell(game.jokers);

              if (choice === -1) break;

              const result = game.sellJoker(choice);
              if (result) {
                console.log(chalk.green(`出售了 ${result.joker.name}, 获得 $${result.sellPrice}!`));
              } else {
                console.log(chalk.red('出售失败!'));
              }
              await UI.askContinue();
            }
          } else if (shopAction === 'sellConsumable') {
            const choice = await UI.askSellConsumable(game.consumables);
            if (choice >= 0) {
              const sold = game.sellConsumable(choice);
              if (sold) console.log(chalk.green(`出售了 ${sold.card.name}，获得 $${sold.sellPrice}`));
            }
          } else if (shopAction === 'reroll') {
            if (game.takeReroll()) {
              shopJokers = rollShop(game);
              console.log(chalk.green('商店已重掷'));
            } else {
              console.log(chalk.red('金钱不足'));
            }
            await UI.askContinue();
          } else if (shopAction === 'secret') {
            await saySomething(game);
          } else if (shopAction === 'pack') {
            const packId = await UI.askPack(game);
            if (!packId) continue;
            const cards = game.buyPack(packId);
            if (!cards) {
              console.log(chalk.red('金钱不足'));
              await UI.askContinue();
              continue;
            }
            cards.forEach(card => console.log(`  ${card.name} - ${card.description}`));
            const pick = await UI.askPackCard(cards);
            if (pick < 0) {
              game.skipPack();
              console.log(chalk.gray('跳过了补充包'));
            } else {
              await offerConsumable(game, cards[pick]);
            }
            await UI.askContinue();
          }
        }

        game.endShop();
        if (!game.nextRound()) {
          break;
        }
      } else {
        UI.printDefeat();
        UI.printGameOver(game);
        SaveManager.deleteSave();
        break;
      }
    } else {
      const action = await UI.askMainMenu(game);

      if (action === 'play') {
        const indices = await UI.askCardSelection(
          game.hand,
          '选择要出的牌 (1-5 张牌):',
          1,
          5
        );

        if (indices === 'back') {
          continue;
        }

        if (indices.length > 0) {
          const result = game.playHand(indices);

          if (result?.error) {
            console.log(chalk.red(`\n${result.error}\n`));
            await UI.askContinue();
            continue;
          }

          UI.clear();
          UI.printHeader(game);
          UI.printJokers(game);
          UI.printHand(game.hand);
          UI.printPlayResult(result);

          await UI.askContinue();
        }
      } else if (action === 'discard') {
        if (game.discardsRemaining <= 0) {
          console.log('没有剩余的弃牌次数了!');
          await UI.askContinue();
          continue;
        }

        const indices = await UI.askCardSelection(
          game.hand,
          '选择要弃掉的牌:',
          1,
          game.hand.cards.length
        );

        if (indices === 'back') {
          continue;
        }

        if (indices.length > 0) {
          game.discard(indices);
        }
      } else if (action === 'use') {
        const choice = await UI.askConsumable(game.consumables);
        if (choice < 0) continue;
        const card = game.consumables[choice];
        const rule = selectionFor(game, card);
        let targets = [];
        if (rule) {
          const picked = await UI.askCardSelection(game.hand, `${card.name}:`, rule[0], rule[1]);
          if (picked === 'back') continue;
          targets = picked;
        }
        const message = game.useConsumable(choice, targets);
        console.log(chalk.cyan(message));
        await UI.askContinue();
      } else if (action === 'secret') {
        await saySomething(game);
      } else if (action === 'skipBlind') {
        const yes = await UI.askYesNo('跳过当前盲注？不会获得奖励。', false);
        if (yes) game.skipBlind();
      } else if (action === 'sortRank') {
        game.hand.sortByRank();
      } else if (action === 'sortSuit') {
        game.hand.sortBySuit();
      } else if (action === 'save') {
        SaveManager.saveGame(game);
        console.log(chalk.green('游戏已保存!'));
        await UI.askContinue();
      } else if (action === 'exit') {
        SaveManager.saveGame(game);
        console.log(chalk.yellow('游戏已保存，再见!'));
        process.exit(0);
      }
    }
  }

  console.log(chalk.gray('感谢游玩!'));
}

main().catch(console.error);
