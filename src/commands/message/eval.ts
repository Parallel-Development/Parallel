import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, Message } from 'discord.js';
import ms from 'ms';
import Command, { properties } from '../../lib/structs/Command';
import util from 'util';
import { bin } from '../../lib/util/functions';
let _; // used to reference the last returned expression

@properties<true>({
  name: 'eval',
  description: 'Execute a string of JavaScript code.',
  args: ['[code] <--async> <--depth={depth}>'],
  allowDM: true,
  aliases: ['evaluate', 'run']
})
class EvalCommand extends Command {
  async run(message: Message, args: string[]) {
    if (message.author.id !== process.env.DEV!) throw 'You cannot run this command.';

    let isAsync = false;
    let depth = 0;

    const asyncFlag = args.indexOf('--async');
    if (asyncFlag !== -1) {
      isAsync = true;
      args.splice(asyncFlag, 1);
    }

    const depthFlag = args.find(arg => arg.startsWith('--depth='));
    if (depthFlag) {
      depth = +(depthFlag.split('=')[1] ?? 0);
      args.splice(args.indexOf(depthFlag), 1);
    }

    if (args.length === 0) throw 'Missing required argument `code`.';
    const code = args.join(' ');

    let output;
    let error = false;

    // time the evaluation
    let start: number;
    let timeTaken: number;
    try {
      start = performance.now();
      output = await eval(isAsync ? `(async() => { ${code} })()` : code);
      timeTaken = performance.now() - start;
    } catch (e) {
      timeTaken = performance.now() - start!;
      output = e;
      error = true;
    }

    _ = output;
    const type = typeof output;
    output = typeof output === 'string' ? output : util.inspect(output, { depth });
    const unit =
      timeTaken < 1 ? `${Math.round(timeTaken / 1e-2)} microseconds` : ms(Math.round(timeTaken), { long: true });

    const embed = new EmbedBuilder()
      .setColor(error ? Colors.Red : Colors.Green)
      .setTitle(`Evaluation ${error ? 'Error' : 'Success'}`);

    if (output.length > 3500) {
      embed.setDescription(
        `*\\- Time taken: \`${unit}\`*\n*\\- Return type: \`${type}\`*\n*\\- Output was too long to be sent via Discord.*`
      );

      const outBin = await bin(output);

      const button = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Output').setURL(outBin);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      return message.reply({ embeds: [embed], components: [row] });
    }

    embed.setDescription(`*\\- Time taken: \`${unit}\`*\n*\\- Return type: \`${type}\`*\n\`\`\`js\n${output}\`\`\``);
    return message.reply({ embeds: [embed] });
  }
}

export default EvalCommand;
