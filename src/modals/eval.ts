import { ModalSubmitInteraction } from 'discord.js';
import Modal from '../lib/structs/Modal';
import util from 'util';
import ms from 'ms';
import { bin } from '../lib/util/functions';

class EvalModal extends Modal {
  constructor() {
    super('eval');
  }

  async run(interaction: ModalSubmitInteraction<'cached'>) {
    if (interaction.user.id !== '633776442366361601') throw 'You cannot run this command.';

    const code = interaction.fields.getTextInputValue('code');
    const asyncronous = interaction.fields.getTextInputValue('async').toLowerCase() === 'true';
    const depth = +interaction.fields.getTextInputValue('depth') || 0;

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
    if (output.length > 1000) {
      return interaction.editReply(`Output: ${await bin(output)}`);
    }

    const unit =
      timeTaken < 1 ? `${Math.round(timeTaken / 1e-2)} microseconds` : ms(Math.round(timeTaken), { long: true });
    return interaction.editReply(
      `**Status:** ${
        error ? 'Error' : 'Success'
      }\n**Time taken:** ${unit}\n**Return type:** ${type}\n**Output:** \`\`\`js\n${output}\`\`\``
    );
  }
}

export default EvalModal;
