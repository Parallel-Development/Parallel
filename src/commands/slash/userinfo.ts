import { EmbedBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command, { data, properties } from '../../lib/structs/Command';
import { mainColor } from '../../lib/util/constants';
import { getMember } from '../../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information on a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to get information on.'))
)
@properties<'slash'>({
  allowDM: true
})
class UserinfoCommand extends Command {
  async run(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = interaction.guild ? await getMember(interaction.guild, user.id) : null;

    const createdStr = Math.floor(user.createdTimestamp / 1000);
    const joinedStr = member ? Math.floor(member.joinedTimestamp! / 1000) : null;

    const embed = new EmbedBuilder()
      .setAuthor({ name: user.globalName ?? user.username, iconURL: user.displayAvatarURL() })
      .setColor(mainColor)
      .setThumbnail(user.displayAvatarURL())
      .setDescription(
        `**Username:** ${user.username}\n**User ID:** ${user.id}\n**Created:** <t:${createdStr}> (<t:${createdStr}:R>)${
          joinedStr ? `\n**Joined:** <t:${joinedStr}> (<t:${joinedStr}:R>)` : ''
        }\n**Bot:** ${user.bot ? 'Yes' : 'No'}`
      );

    return interaction.reply({ embeds: [embed] });
  }
}

export default UserinfoCommand;
