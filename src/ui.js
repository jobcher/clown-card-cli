// 命令行界面
import chalk from 'chalk';
import inquirer from 'inquirer';
import { EDITIONS } from './cards.js';
import { HAND_TYPES } from './handEvaluator.js';
import { HAND_LEVELS, handStats } from './handLevels.js';
import { RARITY_COLORS } from './jokers.js';
import { BLIND_LABELS, getBoss } from './blinds.js';

function displayWidth(text) {
  let width = 0;
  for (const char of String(text)) {
    width += char.charCodeAt(0) > 255 ? 2 : 1;
  }
  return width;
}

function padEnd(text, width) {
  const gap = width - displayWidth(text);
  return text + ' '.repeat(Math.max(0, gap));
}

function padCenter(text, width) {
  const gap = Math.max(0, width - displayWidth(text));
  const left = Math.floor(gap / 2);
  return ' '.repeat(left) + text + ' '.repeat(gap - left);
}

function formatStat(value) {
  const rounded = Math.round(Number(value) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

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
        console.log(chalk.red.bold(`Boss ${boss.name}${game.bossDisabled ? '（已失效）' : ''}`));
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
    console.log(chalk.gray(`[${bar}] ${scoreProgress.toFixed(1)}%`));
    if (game.lastPlay) {
      const play = game.lastPlay;
      console.log(chalk.gray(`上次 ${play.name} Lv${play.level}：${formatStat(play.chips)} 筹码 × ${formatStat(play.mult)} 倍率 = ${play.score}`));
    }
    console.log();
    this.printHandLevels(game);

    console.log(chalk.blue(`💰 金钱: $${game.money}`));
    console.log(chalk.magenta(`✋ 剩余出牌: ${game.handsRemaining}`));
    console.log(chalk.cyan(`🗑️  剩余弃牌: ${game.discardsRemaining}`));
    console.log();
    this.printConsumables(game);
  }

  static printHandLevels(game) {
    const rows = Object.keys(HAND_LEVELS).map(key => {
      const stats = handStats(game.handLevels, key);
      const played = (game.handTypeCounts?.[key] || 0)
        + (key === 'STRAIGHT_FLUSH' ? (game.handTypeCounts?.ROYAL_FLUSH || 0) : 0);
      const text = `${padEnd(HAND_LEVELS[key].name, 8)} Lv${String(stats.level).padStart(2, ' ')}  ${padEnd(String(stats.chips), 4)} × ${formatStat(stats.mult)}`;
      const line = played ? `${text}  ${played}次` : text;
      return stats.level > 1 ? chalk.yellow(line) : chalk.gray(line);
    });
    console.log(chalk.bold('牌型筹码 × 倍率'));
    for (let index = 0; index < rows.length; index += 2) {
      const right = rows[index + 1] || '';
      console.log(`${rows[index]}    ${right}`);
    }
    console.log();
  }

  static printConsumables(game) {
    if (!game.consumables?.length) return;
    console.log(chalk.bold('✨ 消耗牌:'));
    game.consumables.forEach((card, index) => {
      const negative = card.negative ? chalk.yellow(' 负') : '';
      console.log(`  [${index + 1}] ${chalk.magenta(card.name)}${negative} - ${card.description}`);
    });
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
      const edition = joker.edition ? chalk.yellow(` ${EDITIONS[joker.edition]}`) : '';
      console.log(`${num} ${rarityColor(`[${joker.rarity}]`)} ${rarityColor(joker.name)}${edition} - ${joker.description}${extra ? ' ' + chalk.gray(extra) : ''}`);
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
      if (card.enhancement === 'stone') {
        rankDisplay = ' 石 ';
      } else if (card.rank === '10') {
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
    const chipRow = hand.cards.map(card => padCenter(String(UI.cardChips(card)), 6));
    console.log(chalk.yellow(chipRow.join(' ')));
    const multRow = hand.cards.map(card => padCenter(UI.cardMult(card), 6));
    if (multRow.some(label => label.trim())) console.log(chalk.magenta(multRow.join(' ')));
    const notes = hand.cards.flatMap((card, index) => (
      card.enhancement || card.edition || card.seal || card.bonusChips ? [`${index}:${card.toString()}${card.bonusChips ? ` +${card.bonusChips}` : ''}`] : []
    ));
    if (notes.length) console.log(chalk.gray(notes.join('  ')));
    console.log();
  }

  static cardChips(card) {
    if (card.enhancement === 'stone') return 50 + (card.bonusChips || 0);
    let chips = card.getChipValue() + (card.bonusChips || 0);
    if (card.enhancement === 'bonus') chips += 30;
    if (card.edition === 'foil') chips += 50;
    return chips;
  }

  static cardMult(card) {
    const parts = [];
    if (card.enhancement === 'mult') parts.push('+4');
    if (card.enhancement === 'glass') parts.push('×2');
    if (card.enhancement === 'steel') parts.push('×1.5');
    if (card.edition === 'holo') parts.push('+10');
    if (card.edition === 'polychrome') parts.push('×1.5');
    return parts.join('');
  }

  static printPlayResult(result) {
    if (!result) return;

    const handType = HAND_TYPES[result.handResult.type];
    console.log(chalk.bold.green('\n✓ 出牌成功!'));
    const levelText = result.level ? `  Lv${result.level}` : '';
    console.log(chalk.cyan(`  牌型: ${handType.name}${levelText}`));
    if (result.baseChips !== undefined) {
      console.log(chalk.gray(`  牌型基础: ${formatStat(result.baseChips)} 筹码 × ${formatStat(result.baseMult)} 倍率`));
    }
    if (result.cardChips !== undefined) {
      console.log(chalk.gray(`  牌面筹码: ${formatStat(result.cardChips)}`));
    }
    console.log(chalk.yellow(`  总筹码: ${formatStat(result.chips)}`));
    console.log(chalk.magenta(`  倍率: ×${formatStat(result.mult)}`));
    console.log(chalk.green.bold(`  得分: +${result.score.toLocaleString()}\n`));
  }

  static async askMainMenu(game) {
    const choices = [
      { name: '🎴 出牌', value: 'play' },
      { name: '🗑️  弃牌', value: 'discard' },
      { name: '🔀 按点数排序', value: 'sortRank' },
      { name: '♠ 按花色排序', value: 'sortSuit' }
    ];
    if (game?.consumables?.length) {
      choices.push({ name: '✨ 使用消耗牌', value: 'use' });
    }
    choices.push(
      { name: '⏭️  跳过当前盲注', value: 'skipBlind' },
      { name: '💬 说点什么', value: 'secret' },
      new inquirer.Separator(),
      { name: '💾 保存游戏', value: 'save' },
      { name: '🚪 退出游戏', value: 'exit' }
    );

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '你想做什么？',
        choices
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

  static async askShop(game) {
    const choices = [
      { name: '🛒 购买小丑牌', value: 'buy' },
      { name: '📦 打开补充包', value: 'pack' }
    ];
    if (game.jokers.length > 0) {
      choices.push({ name: '💰 出售小丑牌', value: 'sell' });
    }
    if (game.consumables.length > 0) {
      choices.push({ name: '✨ 出售消耗牌', value: 'sellConsumable' });
    }
    const rerollCost = game.hasEffect('chaos') && !game.chaosUsed ? 0 : 5;
    choices.push({ name: `🎲 重掷商店 ($${rerollCost})`, value: 'reroll' });
    choices.push({ name: '💬 说点什么', value: 'secret' });
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

  static async askJokerPurchase(jokers, game) {
    const floor = game.hasEffect('credit_card') ? -20 : 0;
    const slotsFull = game.jokerSlotsUsed() >= game.maxJokers;
    const choices = jokers.map((joker, index) => {
      const canAfford = game.money - joker.cost >= floor;
      let disabled = false;
      if (slotsFull && joker.edition !== 'negative') {
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

  static printShopJokers(jokers, game) {
    console.log(chalk.bold.yellow('\n🏪 商店 - 出售中的小丑牌:\n'));
    if (game?.rarityOddsText) {
      console.log(chalk.gray(`出现概率：${game.rarityOddsText()}\n`));
    }
    jokers.forEach((joker, index) => {
      const rarityColor = chalk.hex(RARITY_COLORS[joker.rarity]);
      console.log(`  [${index + 1}] ${rarityColor(joker.rarity)} - ${rarityColor(joker.name)}`);
      console.log(`      ${joker.description}`);
      console.log(`      ${chalk.green(`$${joker.cost}`)}\n`);
    });
  }

  static async askPack(game) {
    const { packId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'packId',
        message: '选择补充包',
        choices: [
          { name: `奥秘包 - 3 张塔罗选 1 ($${game.packCost('arcana')})`, value: 'arcana' },
          { name: `天体包 - 3 张行星选 1 ($${game.packCost('celestial')})`, value: 'celestial' },
          { name: `幻灵包 - 2 张幻灵选 1 ($${game.packCost('spectral')})`, value: 'spectral' },
          { name: '← 返回', value: null }
        ]
      }
    ]);
    return packId;
  }

  static async askPackCard(cards) {
    const choices = cards.map((card, index) => ({
      name: `[${index + 1}] ${card.name} - ${card.description}`,
      value: index
    }));
    choices.push({ name: '跳过补充包', value: -1 });
    const { index } = await inquirer.prompt([
      {
        type: 'list',
        name: 'index',
        message: '选择一张牌，其余会被丢弃',
        choices
      }
    ]);
    return index;
  }

  static async askConsumable(cards) {
    const choices = cards.map((card, index) => ({
      name: `[${index + 1}] ${card.name}${card.negative ? ' 负' : ''} - ${card.description}`,
      value: index
    }));
    choices.push({ name: '← 返回', value: -1 });
    const { index } = await inquirer.prompt([
      {
        type: 'list',
        name: 'index',
        message: '选择要使用的消耗牌',
        choices
      }
    ]);
    return index;
  }

  static async askSellConsumable(cards, dropping = false) {
    const choices = cards.map((card, index) => {
      const sellPrice = Math.max(1, Math.floor(card.cost / 3) + (card.extraSell || 0));
      return {
        name: `[${index + 1}] ${card.name} (${chalk.green(`+$${sellPrice}`)})`,
        value: index
      };
    });
    choices.push({ name: dropping ? '放弃这张新牌' : '← 返回', value: -1 });
    const { index } = await inquirer.prompt([
      {
        type: 'list',
        name: 'index',
        message: dropping ? '消耗牌槽已满。出售一张，或放弃新牌' : '选择要出售的消耗牌',
        choices
      }
    ]);
    return index;
  }

  static async askJokerSell(jokers) {
    const choices = jokers.map((joker, index) => {
      const sellPrice = joker.sellPrice();
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
      const sellPrice = joker.sellPrice();
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
    if (payout.cardBonus) {
      console.log(chalk.green(`  手牌黄金: +$${payout.cardBonus}`));
    }
    console.log(chalk.green.bold(`  合计: +$${payout.total}\n`));
  }

  static printRunClear() {
    console.log(chalk.bold.yellow('\n🏆 通关！你击败了第 8 关 Boss。\n'));
  }

  static async askSecret() {
    const { word } = await inquirer.prompt([
      {
        type: 'input',
        name: 'word',
        message: '说点什么？'
      }
    ]);
    return word;
  }

  static async askYesNo(message, defaultValue = false) {
    const { yes } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'yes',
        message,
        default: defaultValue
      }
    ]);
    return yes;
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
    console.log(chalk.gray('  • 收集小丑牌、塔罗、行星和幻灵'));
    console.log(chalk.gray('  • 每关依次通过小盲注、大盲注和 Boss 盲注'));
    console.log(chalk.gray('  • 击败第 8 关 Boss 即可通关'));
    console.log(chalk.gray('  • 结算时获得盲注奖励、剩余出牌奖金和利息\n'));
  }
}
