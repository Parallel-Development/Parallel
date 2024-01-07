import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command, { data, properties } from '../../lib/structs/Command';

@data(new SlashCommandBuilder().setName('invite').setDescription('Retrieve the invite for Parallel.'))
@properties({
  allowDM: true
})
class InviteCommand extends Command {
  async run(interaction: ChatInputCommandInteraction) {
    return interaction.reply(
      `[Click here](https://discord.com/api/oauth2/authorize?client_id=745401642664460319&permissions=3154439422&scope=bot%20applications.commands) to invite Parallel to your server.`
    );
  }
}

export default InviteCommand;
