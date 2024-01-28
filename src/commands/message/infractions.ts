import { PermissionFlagsBits, EmbedBuilder, type EmbedField, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { infractionsPerPage, mainColor } from '../../lib/util/constants';
import { getUser } from '../../lib/util/functions';

@properties<'message'>({
  name: 'infractions',
  description: "View a user's current infractions.",
  args: '<user> [page]',
  aliases: ['warnings']
})
class InfractionsCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `user`.';

    const user = await getUser(args[0]);
    if (!user) throw 'Invalid user.';
    let page = +args[1] || 1;
    if (!Number.isInteger(page)) throw 'Page number cannot be a decimal.';

    const infractionCount = await this.client.db.infraction.count({
      where: {
        guildId: message.guildId,
        userId: user.id
      }
    });

    if (infractionCount === 0) return message.reply('There are no infractions for this user.');
    const pages = Math.ceil(infractionCount / 7);
    if (page > pages) page = pages;

    const infractions = await this.client.db.infraction.findMany({
      where: {
        guildId: message.guildId,
        userId: user.id
      },
      include: { appeal: true },
      orderBy: {
        id: 'desc'
      },
      take: infractionsPerPage,
      skip: infractionsPerPage * (page - 1)
    });

    const infractionsEmbed = new EmbedBuilder()
      .setAuthor({ name: `Infractions for ${user.username} (${user.id})`, iconURL: user.displayAvatarURL() })
      .setDescription(`Total infractions: \`${infractionCount}\`\nPage: \`${page}\`/\`${pages}\``)
      .setColor(mainColor);

    const fields: EmbedField[] = [];
    for (const infraction of infractions) {
      const field: EmbedField = {
        name: `ID ${infraction.id}: ${infraction.type.toString()}`,
        value: `${infraction.reason.slice(0, 100)}${infraction.reason.length > 100 ? '...' : ''}${
          infraction.appeal ? `\n*\\- This infraction has an appeal.*` : ''
        }\n*\\- <t:${Math.floor(Number(infraction.date / 1000n))}>, issued by <@${infraction.moderatorId}> (${
          infraction.moderatorId
        })*`,
        inline: false
      };

      fields.push(field);
    }

    infractionsEmbed.setFields(fields);

    return message.reply({ embeds: [infractionsEmbed] });
  }
}

export default InfractionsCommand;
