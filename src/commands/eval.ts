import { ActionRowBuilder, ChatInputCommandInteraction, ModalActionRowComponentBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import ms from "ms";
import Command from "../lib/structs/Command";
import util from 'util';

class EvalCommand extends Command {
  constructor() {
    super(
      new SlashCommandBuilder()
      .setName('eval')
      .setDescription('Execute a string of JavaScript code.')
      .addStringOption(option =>
        option
          .setName('code')
          .setDescription('The code to execute. Leaving this empty will open a modal.'))
      .addIntegerOption(option =>
        option.setName('depth')
        .setDescription('Output depth.')
        .setMinValue(0))
    )
  }

  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    if (interaction.user.id !== '633776442366361601') throw 'You cannot run this command.';
    const code = interaction.options.getString('code');

    if (!code) {
      const modal = new ModalBuilder()
      .setTitle('Eval')
      .setCustomId('modal:eval')

      const codeRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
      const codeText = new TextInputBuilder()
      .setLabel('Code')
      .setCustomId('code')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)

      codeRow.setComponents(codeText);

      const depthRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
      const depthText = new TextInputBuilder()
      .setLabel('Depth')
      .setCustomId('depth')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)

      depthRow.setComponents(depthText);

      modal.setComponents(codeRow, depthRow);

      interaction.showModal(modal);
      return;
    }

    const asyncronous = code.includes('await ');
    const depth = interaction.options.getInteger('depth') ?? 0;

    await interaction.deferReply();
    let output;
    let error = false;
    const start = performance.now();
    try { 
      output = await eval(asyncronous ? `(async() => { ${code} })()` : code)
    } catch (e) {
      output = e;
      error = true;
    }
    const end = performance.now();
    const timeTaken = end - start;
    const type = typeof output;
    output = util.inspect(output, { depth });

    const unit = timeTaken < 1 ? `${Math.round(timeTaken / 1e-2)} microseconds` : ms(Math.round(timeTaken), { long: true });
    return interaction.editReply(`**Status:** ${error ? 'Error' : 'Success'}\n**Time taken:** ${unit}\n**Return type:** ${type}\n**Output:** \`\`\`js\n${output}\`\`\``)

  }
}
export default EvalCommand;