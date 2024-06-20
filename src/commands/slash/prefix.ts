import { type ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Command, { data } from '../../lib/structs/Command';

@data(
  new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Change the prefix used to identify Parallel commands.')
    .addStringOption(opt => opt.setName('prefix').setDescription('The prefix.').setMaxLength(10).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
)
class PrefixCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const prefix = interaction.options.getString('prefix', true);
    if (prefix.length > 10) throw 'The prefix may not be longer than 10 characters.';

    await this.client.db.guild.update({
      where: { id: interaction.guildId },
      data: {
        prefix
      }
    });

    return interaction.reply(`The prefix is now set to \`${prefix}\``);
  }
}

export default PrefixCommand;
