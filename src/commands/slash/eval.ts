import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  Colors,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import ms from 'ms';
import Command, { properties, data } from '../../lib/structs/Command';
import util from 'util';
import { bin, createComplexCustomId } from '../../lib/util/functions';
let _; // used to reference the last returned expression

@data(
  new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Execute a string of JavaScript code.')
    .addStringOption(option =>
      option.setName('code').setDescription('The code to execute. Leaving this empty will open a modal.')
    )
    .addBooleanOption(option => option.setName('async').setDescription('Evaluate the code in an async function.'))
    .addIntegerOption(option => option.setName('depth').setDescription('Output depth.').setMinValue(0))
)
@properties<'slash'>({
  allowDM: true
})
class EvalCommand extends Command {
  async run(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== process.env.DEV!) throw 'You cannot run this command.';
    const code = interaction.options.getString('code');
    const asyncronous = interaction.options.getBoolean('async') ?? false;
    const depth = interaction.options.getInteger('depth') ?? 0;

    if (!code) {
      const modal = new ModalBuilder()
        .setTitle('Eval')
        .setCustomId(createComplexCustomId('eval', null, [asyncronous.toString(), depth.toString()]));

      const codeRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
      const codeText = new TextInputBuilder()
        .setLabel('Code')
        .setCustomId('code')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      codeRow.setComponents(codeText);
      modal.setComponents(codeRow);

      interaction.showModal(modal);
      return;
    }

    await interaction.deferReply();
    let output;
    let error = false;

    // time the evaluation
    let start: number;
    let timeTaken: number;
    try {
      start = performance.now();
      output = await eval(asyncronous ? `(async() => { ${code} })()` : code);
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
        `*\\- Time taken: \`${unit}\`*\n*\\- Return type: \`${type}\`*\n\\- *Output was too long to be sent via Discord.`
      );

      const outBin = await bin(output);

      const button = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Output').setURL(outBin);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      return interaction.editReply({ embeds: [embed], components: [row] });
    }

    embed.setDescription(`*\\- Time taken: \`${unit}\`*\n*\\- Return type: \`${type}\`*\n\`\`\`js\n${output}\`\`\``);
    return interaction.editReply({ embeds: [embed] });
  }
}

export default EvalCommand;
