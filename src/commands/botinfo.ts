import { EmbedBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import ms from 'ms';
import Command, { allowDM, data } from '../lib/structs/Command';
import { mainColor } from '../lib/util/constants';

@data(new SlashCommandBuilder().setName('botinfo').setDescription('Get statistics on me.'))
@allowDM
class BotinfoCommand extends Command {
  async run(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Bot Statistics', iconURL: this.client.user!.displayAvatarURL() })
      .setColor(mainColor)
      .addFields(
        { name: 'Guild Count', value: this.client.guilds.cache.size.toString(), inline: true },
        { name: 'Uptime', value: ms(this.client.uptime!, { long: true }), inline: true },
        { name: 'RAM Allocated', value: `${Math.floor(process.memoryUsage.rss() / 1024 / 1024)} MB`, inline: true }
      )
      .setThumbnail(this.client.user!.displayAvatarURL());

    return interaction.reply({ embeds: [embed] });
  }
}

export default BotinfoCommand;
