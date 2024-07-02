import { EmbedBuilder } from '@discordjs/builders';
import { Message } from 'discord.js';
import ms from 'ms';
import Command, { properties } from '../../lib/structs/Command';
import { mainColor } from '../../lib/util/constants';

@properties<'message'>({
  name: 'botinfo',
  description: 'Get statistics on me',
  aliases: ['stats', 'statistics', 'bot', 'parallel'],
  allowDM: true
})
class BotinfoCommand extends Command {
  async run(message: Message) {
    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Bot Statistics', iconURL: this.client.user!.displayAvatarURL() })
      .setColor(mainColor)
      .addFields(
        { name: 'Guilds', value: this.client.guilds.cache.size.toString(), inline: true },
        { name: 'Uptime', value: ms(this.client.uptime!, { long: true }), inline: true },
        { name: 'Memory', value: `${Math.floor(process.memoryUsage.rss() / 1024 / 1024)} MB`, inline: true }
      )
      .setThumbnail(this.client.user!.displayAvatarURL());

    return message.reply({ embeds: [embed] });
  }
}

export default BotinfoCommand;
