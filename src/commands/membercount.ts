import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command, { data } from '../lib/structs/Command';

@data(new SlashCommandBuilder().setName('membercount').setDescription('Get the member count of the guild.'))
class MembercountCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    return interaction.reply(`There are \`${interaction.guild.memberCount}\` members in this guild.`);
  }
}

export default MembercountCommand;
