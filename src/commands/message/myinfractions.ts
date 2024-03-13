import { EmbedBuilder, type EmbedField, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { infractionsPerPage, mainColor } from '../../lib/util/constants';

@properties<'message'>({
  name: 'myinfractions',
  description: 'View your current infractions.',
  args: '[page]',
  aliases: ['mywarnings']
})
class MyInfractionsCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    const user = message.author;
    let page = +args[0] || 1;
    if (!Number.isInteger(page)) throw 'Page number cannot be a decimal.';

    const infractionCount = await this.client.db.infraction.count({
      where: {
        guildId: message.guildId,
        userId: user.id
      }
    });

    if (infractionCount === 0) return message.reply('You have no infractions.');
    const pages = Math.ceil(infractionCount / 7);
    if (page > pages) page = pages;

    const infractions = await this.client.db.infraction.findMany({
      where: {
        guildId: message.guildId,
        userId: user.id
      },
      include: { appeal: true, guild: { select: { infractionModeratorPublic: true } } },
      orderBy: {
        id: 'desc'
      },
      take: infractionsPerPage,
      skip: infractionsPerPage * (page - 1)
    });

    const infractionsEmbed = new EmbedBuilder()
      .setAuthor({ name: `Your infractions`, iconURL: user.displayAvatarURL() })
      .setDescription(`Total infractions: \`${infractionCount}\`\nPage: \`${page}\`/\`${pages}\``)
      .setColor(mainColor);

    const fields: EmbedField[] = [];
    for (const infraction of infractions) {
      const field: EmbedField = {
        name: `ID ${infraction.id}: ${infraction.type.toString()}`,
        value: `${infraction.reason.slice(0, 100)}${infraction.reason.length > 100 ? '...' : ''}${
          infraction.appeal ? `\n*\\- You made an appeal for this infraction.*` : ''
        }\n*\\- <t:${Math.floor(Number(infraction.date / 1000n))}>${
          infraction.guild.infractionModeratorPublic
            ? `, issued by <@${infraction.moderatorId}> (${infraction.moderatorId})`
            : ''
        }*`,
        inline: false
      };

      fields.push(field);
    }

    infractionsEmbed.setFields(fields);

    return message.reply({ embeds: [infractionsEmbed] });
  }
}

export default MyInfractionsCommand;
