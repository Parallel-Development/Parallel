import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import ms from 'ms';
import Command, { properties, data } from '../../lib/structs/Command';
import util from 'util';
import { bin } from '../../lib/util/functions';
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
@properties({
  allowDM: true
})
class EvalCommand extends Command {
  async run(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== process.env.DEV!) throw 'You cannot run this command.';
    const code = interaction.options.getString('code');

    if (!code) {
      const modal = new ModalBuilder().setTitle('Eval').setCustomId('eval');

      const codeRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
      const codeText = new TextInputBuilder()
        .setLabel('Code')
        .setCustomId('code')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      codeRow.setComponents(codeText);

      const asyncRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
      const asyncText = new TextInputBuilder()
        .setLabel('Async')
        .setCustomId('async')
        .setMinLength(4)
        .setMaxLength(5)
        .setStyle(TextInputStyle.Short)
        .setValue('false');

      asyncRow.setComponents(asyncText);

      const depthRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
      const depthText = new TextInputBuilder()
        .setLabel('Depth')
        .setCustomId('depth')
        .setStyle(TextInputStyle.Short)
        .setValue('0');

      depthRow.setComponents(depthText);

      modal.setComponents(codeRow, asyncRow, depthRow);

      interaction.showModal(modal);
      return;
    }

    const asyncronous = interaction.options.getBoolean('async') ?? false;
    const depth = interaction.options.getInteger('depth') ?? 0;

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

    if (output.length > 1000) {
      return interaction.editReply(`**Time taken:** ${unit}\n**Return type:** ${type}\n\nOutput: ${await bin(output)}`);
    }

    return interaction.editReply(
      `**Status:** ${
        error ? 'Error' : 'Success'
      }\n**Time taken:** ${unit}\n**Return type:** ${type}\n**Output:** \`\`\`js\n${output}\`\`\``
    );
  }
}

export default EvalCommand;
