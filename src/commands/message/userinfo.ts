import { EmbedBuilder } from '@discordjs/builders';
import { GuildMember, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { mainColor } from '../../lib/util/constants';
import { getMember, getUser } from '../../lib/util/functions';

@properties<'message'>({
  name: 'userinfo',
  description: 'Get information on a user.',
  aliases: ['user', 'ui', 'whois', 'who'],
  args: '[user]',
  allowDM: true
})
class UserinfoCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    const user =
      args.length > 0 ? (await getMember(message.guild, args[0])) ?? (await getUser(args[0])) : message.member!;
    if (!user) throw 'Invalid user.';

    const userUser = user instanceof GuildMember ? user.user : user;

    const createdStr = Math.floor(userUser.createdTimestamp / 1000);
    const joinedStr = user instanceof GuildMember ? Math.floor(user.joinedTimestamp! / 1000) : null;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: userUser.globalName ?? userUser.username,
        iconURL: user.displayAvatarURL()
      })
      .setColor(mainColor)
      .setThumbnail(user.displayAvatarURL())
      .setDescription(
        `**Username:** ${userUser.username}${userUser.discriminator !== '0' ? `#${userUser.discriminator}` : ''}\n**User ID:** ${user.id}\n**Created:** <t:${createdStr}> (<t:${createdStr}:R>)${
          joinedStr ? `\n**Joined:** <t:${joinedStr}> (<t:${joinedStr}:R>)` : ''
        }\n**Bot?** ${userUser.bot ? `Yes. [Click to invite](https://discord.com/oauth2/authorize?client_id=${user.id}&permissions=2048&integration_type=0&scope=bot+applications.commands).` : 'No'}`
      );

    return message.reply({ embeds: [embed] });
  }
}

export default UserinfoCommand;
