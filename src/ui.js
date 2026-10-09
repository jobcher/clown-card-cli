// 命令行界面
import chalk from 'chalk';
import inquirer from 'inquirer';
import { HAND_TYPES } from './handEvaluator.js';
import { RARITY_COLORS } from './jokers.js';
import { BLIND_LABELS, getBoss } from './blinds.js';

export class UI {
  static clear() {
    console.clear();
  }

  static printHeader(game) {
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║') + chalk.bold.yellow('           ♠  小丑牌 CLI  ♥             ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));

    const blindLabel = BLIND_LABELS[game.blind] || '小盲注';
    console.log(chalk.bold(`第 ${game.ante} 关 · ${blindLabel}`));
    if (game.blind === 'boss' && game.bossId) {
      const boss = getBoss(game.bossId);
      if (boss) {
        console.log(chalk.red.bold(`Boss ${boss.name}`));
        console.log(chalk.red(boss.description));
      }
    }
    console.log(chalk.gray('────────────────────────────────────────────'));

    const scoreProgress = Math.min(100, (game.score / game.scoreRequired) * 100);
    const barLength = 40;
    const filledLength = Math.floor((scoreProgress / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    const scoreColor = game.score >= game.scoreRequired ? chalk.green : chalk.yellow;
    console.log(`分数: ${scoreColor(game.score.toLocaleString())} / ${chalk.white(game.scoreRequired.toLocaleString())}`);
    console.log(chalk.gray(`[${bar}] ${scoreProgress.toFixed(1)}%\n`));

    console.log(chalk.blue(`💰 金钱: $${game.money}`));
    console.log(chalk.magenta(`✋ 剩余出牌: ${game.handsRemaining}`));
    console.log(chalk.cyan(`🗑️  剩余弃牌: ${game.discardsRemaining}`));
    console.log();
  }

  static printJokers(game) {
    if (game.jokers.length === 0) {
      console.log(chalk.gray('还没有小丑牌！\n'));
      return;
    }

    console.log(chalk.bold('🎭 你的小丑牌:'));
    game.jokers.forEach((joker, index) => {
      const rarityColor = chalk.hex(RARITY_COLORS[joker.rarity]);
      const num = chalk.gray(`[${index + 1}]`);
      const extra = joker.extraLine ? joker.extraLine() : '';
      console.log(`${num} ${rarityColor(`[${joker.rarity}]`)} ${rarityColor(joker.name)} - ${joker.description}${extra ? ' ' + chalk.gray(extra) : ''}`);
    });
    console.log();
  }

  static printHand(hand, highlightIndices = []) {
    console.log(chalk.bold('🎴 你的手牌:'));

    if (hand.cards.length === 0) {
      console.log(chalk.gray('空\n'));
      return;
    }

    const lines = [[], [], [], []];

    hand.cards.forEach((card, index) => {
      const isHighlighted = highlightIndices.includes(index);
      let color;
      if (card.suit === '♥') {
        color = chalk.red;
      } else if (card.suit === '♦') {
        color = chalk.yellow;
      } else if (card.suit === '♣') {
        color = chalk.green;
      } else {
        color = chalk.white;
      }
      const borderColor = isHighlighted ? chalk.yellow : color;

      let rankDisplay;
      if (card.rank === '10') {
        rankDisplay = ' 10 ';
      } else {
        rankDisplay = ' ' + card.rank + '  ';
      }

      lines[0].push(borderColor(isHighlighted ? '╔════╗' : '┌────┐'));
      lines[1].push(`${borderColor(isHighlighted ? '║' : '│')}${color(rankDisplay)}${borderColor(isHighlighted ? '║' : '│')}`);
      lines[2].push(`${borderColor(isHighlighted ? '║' : '│')} ${color(card.suit)}  ${borderColor(isHighlighted ? '║' : '│')}`);
      lines[3].push(borderColor(isHighlighted ? '╚════╝' : '└────┘'));
    });

    lines.forEach(line => console.log(line.join(' ')));
    console.log();
  }

  static printPlayResult(result) {
    if (!result) return;

    const handType = HAND_TYPES[result.handResult.type];
    console.log(chalk.bold.green('\n✓ 出牌成功!'));
    console.log(chalk.cyan(`  牌型: ${handType.name}`));
    if (result.cardChips !== undefined) {
      console.log(chalk.gray(`  牌面筹码: ${result.cardChips}`));
    }
    console.log(chalk.yellow(`  总筹码: ${result.chips}`));
    const multText = Number.isInteger(result.mult) ? String(result.mult) : result.mult.toFixed(2);
    console.log(chalk.magenta(`  倍率: x${multText}`));
    console.log(chalk.green.bold(`  得分: +${result.score.toLocaleString()}\n`));
  }

  static async askMainMenu() {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '你想做什么？',
        choices: [
          { name: '🎴 出牌', value: 'play' },
          { name: '🗑️  弃牌', value: 'discard' },
          { name: '🔀 按点数排序', value: 'sortRank' },
          { name: '♠ 按花色排序', value: 'sortSuit' },
          new inquirer.Separator(),
          { name: '💾 保存游戏', value: 'save' },
          { name: '🚪 退出游戏', value: 'exit' }
        ]
      }
    ]);
    return action;
  }

  static async askLoadGame() {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '发现存档，你想做什么？',
        choices: [
          { name: '📂 继续上次的游戏', value: 'load' },
          { name: '🆕 开始新游戏', value: 'new' },
          { name: '🗑️  删除存档', value: 'delete' }
        ]
      }
    ]);
    return action;
  }

  static async askCardSelection(hand, message, minCards = 1, maxCards = 5) {
    if (hand.cards.length === 0) return [];

    const cardChoices = hand.cards.map((card, index) => {
      let color;
      if (card.suit === '♥') {
        color = chalk.red;
      } else if (card.suit === '♦') {
        color = chalk.yellow;
      } else if (card.suit === '♣') {
        color = chalk.green;
      } else {
        color = chalk.white;
      }
      return {
        name: `${chalk.bold(index)}: ${color.bold(card.toString())}`,
        value: index
      };
    });

    const choices = [
      ...cardChoices,
      new inquirer.Separator(),
      { name: chalk.gray('← 返回上一步'), value: 'back' }
    ];

    const { indices } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'indices',
        message: message + ' (先按空格选牌，再回车确认，或直接选择"返回")',
        choices,
        pageSize: 10,
        validate: (selected) => {
          if (selected.includes('back')) {
            if (selected.length > 1) {
              return '不能同时选择"返回"和牌';
            }
            return true;
          }
          const actualSelected = selected.filter(i => i !== 'back');
          if (actualSelected.length < minCards) return `请至少选择 ${minCards} 张牌，或选择"返回"`;
          if (actualSelected.length > maxCards) return `最多选择 ${maxCards} 张牌`;
          return true;
        }
      }
    ]);

    if (indices.includes('back')) {
      return 'back';
    }
    return indices;
  }

  static async askShop(money, maxJokers, jokerCount) {
    const choices = [
      { name: '🛒 购买小丑牌', value: 'buy' },
    ];
    if (jokerCount > 0) {
      choices.push({ name: '💰 出售小丑牌', value: 'sell' });
    }
    choices.push({ name: '➡️ 跳过，进入下一盲注', value: 'skip' });

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '商店 - 你想做什么？',
        choices
      }
    ]);
    return action;
  }

  static async askJokerPurchase(jokers, money, slotsFull = false) {
    const choices = jokers.map((joker, index) => {
      const canAfford = money >= joker.cost;
      let disabled = false;
      if (slotsFull) {
        disabled = '槽位已满';
      } else if (!canAfford) {
        disabled = '金钱不足';
      }
      return {
        name: `[${index + 1}] ${joker.name} - ${joker.description} ($${joker.cost})`,
        value: index,
        disabled
      };
    });
    choices.push({ name: '← 返回', value: -1 });

    const { index } = await inquirer.prompt([
      {
        type: 'list',
        name: 'index',
        message: '选择要购买的小丑牌:',
        choices
      }
    ]);

    return index;
  }

  static printShopJokers(jokers) {
    console.log(chalk.bold.yellow('\n🏪 商店 - 出售中的小丑牌:\n'));
    jokers.forEach((joker, index) => {
      const rarityColor = chalk.hex(RARITY_COLORS[joker.rarity]);
      console.log(`  [${index + 1}] ${rarityColor(joker.rarity)} - ${rarityColor(joker.name)}`);
      console.log(`      ${joker.description}`);
      console.log(`      ${chalk.green(`$${joker.cost}`)}\n`);
    });
  }

  static async askJokerSell(jokers) {
    const choices = jokers.map((joker, index) => {
      const sellPrice = Math.max(1, Math.floor(joker.cost / 3));
      const rarityColor = chalk.hex(RARITY_COLORS[joker.rarity]);
      return {
        name: `[${index + 1}] ${rarityColor(`[${joker.rarity}]`)} ${rarityColor(joker.name)} - ${joker.description} (${chalk.green(`+$${sellPrice}`)})`,
        value: index
      };
    });
    choices.push({ name: '← 返回', value: -1 });

    const { index } = await inquirer.prompt([
      {
        type: 'list',
        name: 'index',
        message: '选择要出售的小丑牌:',
        choices
      }
    ]);

    return index;
  }

  static printYourJokersForSell(game) {
    console.log(chalk.bold.yellow('\n💰 你的小丑牌 (可出售):\n'));
    game.jokers.forEach((joker, index) => {
      const rarityColor = chalk.hex(RARITY_COLORS[joker.rarity]);
      const sellPrice = Math.max(1, Math.floor(joker.cost / 3));
      console.log(`  [${index + 1}] ${rarityColor(`[${joker.rarity}]`)} - ${rarityColor(joker.name)}`);
      console.log(`      ${joker.description}`);
      console.log(`      售价: ${chalk.green(`$${sellPrice}`)} (原价: $${joker.cost})\n`);
    });
  }

  static printVictory() {
    console.log(chalk.bold.green('\n🎉 回合胜利! 🎉\n'));
  }

  static printDefeat() {
    console.log(chalk.bold.red('\n💀 回合失败 💀\n'));
  }

  static printCashOut(payout) {
    console.log(chalk.bold('结算:'));
    console.log(chalk.green(`  盲注奖励: +$${payout.reward}`));
    console.log(chalk.green(`  剩余出牌: +$${payout.handsBonus}`));
    console.log(chalk.green(`  利息: +$${payout.interest}`));
    for (const entry of payout.jokerPayouts) {
      console.log(chalk.green(`  ${entry.name}: +$${entry.amount}`));
    }
    console.log(chalk.green.bold(`  合计: +$${payout.total}\n`));
  }

  static printRunClear() {
    console.log(chalk.bold.yellow('\n🏆 通关！你击败了第 8 关 Boss。\n'));
  }

  static async askEndless() {
    const { endless } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'endless',
        message: '继续无尽模式？',
        default: true
      }
    ]);
    return endless;
  }

  static printGameOver(game) {
    const blindLabel = BLIND_LABELS[game.blind] || '小盲注';
    console.log(chalk.bold.red('\n╔════════════════════════════════════════╗'));
    console.log(chalk.bold.red('║') + chalk.bold.yellow('             游戏结束!                  ') + chalk.bold.red('║'));
    console.log(chalk.bold.red('╚════════════════════════════════════════╝\n'));
    console.log(chalk.bold(`最终关卡: 第 ${game.ante} 关 · ${blindLabel}`));
    console.log();
  }

  static async askContinue() {
    const { continue: cont } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: '继续?',
        default: true
      }
    ]);
    return cont;
  }

  static printWelcome() {
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║') + chalk.bold.yellow('           ♠  小丑牌 CLI  ♥             ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('║') + chalk.gray('        一款 Balatro 风格的卡牌游戏     ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));
    console.log(chalk.yellow('游戏玩法:'));
    console.log(chalk.gray('  • 出扑克牌来赚取分数'));
    console.log(chalk.gray('  • 收集小丑牌获得加成'));
    console.log(chalk.gray('  • 每关依次通过小盲注、大盲注和 Boss 盲注'));
    console.log(chalk.gray('  • 击败第 8 关 Boss 即可通关'));
    console.log(chalk.gray('  • 结算时获得盲注奖励、剩余出牌奖金和利息\n'));
  }
}
