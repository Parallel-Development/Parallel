import { ModalSubmitInteraction } from "discord.js";
import Modal from "../lib/structs/Modal";
import util from 'util';
import ms from 'ms';

class EvalModal extends Modal {
  constructor() {
    super('eval')
  }

  async run(interaction: ModalSubmitInteraction<'cached'>) {
    if (interaction.user.id !== '633776442366361601') throw 'You cannot run this command.';
    
    const code = interaction.fields.getTextInputValue('code');
    const depth = +interaction.fields.getTextInputValue('depth') || 0;

    const asyncronous = code.includes('await');

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

export default EvalModal;