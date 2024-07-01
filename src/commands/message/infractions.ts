import { EmbedBuilder, type EmbedField, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { infractionsPerPage, mainColor } from '../../lib/util/constants';
import { createComplexCustomId, getUser } from '../../lib/util/functions';
import { InfractionType } from '@prisma/client';

@properties<'message'>({
  name: 'infractions',
  description: "View a user's current infractions.",
  args: '<user> [page] [manual|automod|all]',
  aliases: ['warnings']
})
class InfractionsCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `user`.';

    const user = await getUser(args[0]);
    if (!user) throw 'Invalid user.';
    let page = +args[1] || 1;
    if (!Number.isInteger(page)) throw 'Page number cannot be a decimal.';

    let type;
    if (args.includes('all')) type = 'all';
    else if (args.includes('automod')) type = 'automod';
    else type = 'manual';

    const filter = {
      ...(type == 'manual'
        ? { moderatorId: { not: this.client.user!.id } }
        : type == 'automod'
          ? { moderatorId: this.client.user!.id }
          : {})
    };

    const infractionCount = await this.client.db.infraction.count({
      where: {
        guildId: message.guildId,
        userId: user.id,
        type: { notIn: [InfractionType.Unban, InfractionType.Unmute] },
        ...filter
      }
    });

    if (infractionCount === 0)
      return message.reply(`There are no ${type !== 'all' ? `${type} ` : ''}infractions for this user.`);
    const pages = Math.ceil(infractionCount / 7);
    if (page > pages) page = pages;

    const infractions = await this.client.db.infraction.findMany({
      where: {
        guildId: message.guildId,
        userId: user.id,
        type: { notIn: [InfractionType.Unban, InfractionType.Unmute] },
        ...filter
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
      .setDescription(
        `Total infractions: \`${infractionCount}\`\nPage: \`${page}\`/\`${pages}\`\nShowing ${
          type !== 'all' ? 'only ' : ''
        }${type} infractions. ${type === 'manual' ? `(\`/infractions type\`)` : ''}`
      )
      .setFooter({ text: '/case <id>' })
      .setColor(mainColor);

    const fields: EmbedField[] = [];
    for (const infraction of infractions) {
      const field: EmbedField = {
        name: `ID ${infraction.id}: ${infraction.type.toString()}`,
        value: `${infraction.reason.slice(0, 100)}${infraction.reason.length > 100 ? '...' : ''}${
          infraction.appeal ? `\n*\\- This infraction has an appeal.*` : ''
        }\n*\\- <@${infraction.moderatorId}> at <t:${Math.floor(Number(infraction.date / 1000n))}>*`,
        inline: false
      };

      fields.push(field);
    }

    infractionsEmbed.setFields(fields);

    const backButton = new ButtonBuilder()
      .setLabel('<')
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(createComplexCustomId('infractions', 'back', [user.id, message.author.id, type, 'false']));

    const forwardButton = new ButtonBuilder()
      .setLabel('>')
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(createComplexCustomId('infractions', 'forward', [user.id, message.author.id, type, 'false']));

    const paginationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, forwardButton);

    return message.reply({ embeds: [infractionsEmbed], components: [paginationRow] });
  }
}

export default InfractionsCommand;
