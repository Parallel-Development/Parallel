import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, ModalSubmitInteraction } from 'discord.js';
import Modal from '../lib/structs/Modal';
import util from 'util';
import ms from 'ms';
import { bin, readComplexCustomId } from '../lib/util/functions';

class EvalModal extends Modal {
  constructor() {
    super('eval');
  }

  async run(interaction: ModalSubmitInteraction) {
    if (interaction.user.id !== process.env.DEV!) throw 'You cannot run this command.';

    const code = interaction.fields.getTextInputValue('code');

    const { data } = readComplexCustomId(interaction.customId);
    if (!data) return;

    const asyncronous = data[0] === 'true';
    const depth = +data[1];

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

    const type = typeof output;
    output = typeof output === 'string' ? output : util.inspect(output, { depth });

    const unit = timeTaken < 1 ? `${Math.round(timeTaken / 1e-2)} μs` : ms(Math.round(timeTaken), { long: true });

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

export default EvalModal;
