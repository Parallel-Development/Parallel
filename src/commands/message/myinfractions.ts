import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  type EmbedField,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { infractionsPerPage, mainColor } from '../../lib/util/constants';
import { createComplexCustomId } from '../../lib/util/functions';
import { InfractionType } from '@prisma/client';

@properties<'message'>({
  name: 'myinfractions',
  description: 'View your current infractions.',
  args: '[page] [manual|automod|all]',
  aliases: ['mywarnings']
})
class MyInfractionsCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    const user = message.author;
    let page = +args[0] || 1;
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

    if (infractionCount === 0) return message.reply(`You have no ${type !== 'all' ? `${type} ` : ''}infractions.`);
    const pages = Math.ceil(infractionCount / 7);
    if (page > pages) page = pages;

    const infractions = await this.client.db.infraction.findMany({
      where: {
        guildId: message.guildId,
        userId: user.id,
        type: { notIn: [InfractionType.Unban, InfractionType.Unmute] },
        ...filter
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
      .setDescription(
        `Total infractions: \`${infractionCount}\`\nPage: \`${page}\`/\`${pages}\`\nShowing ${
          type !== 'all' ? 'only ' : ''
        }${type} infractions. ${type === 'manual' ? `(\`/infractions type\`)` : ''}`
      )
      .setFooter({ text: '/mycase <id>' })
      .setColor(mainColor);

    const fields: EmbedField[] = [];
    for (const infraction of infractions) {
      const field: EmbedField = {
        name: `ID ${infraction.id}: ${infraction.type.toString()}`,
        value: `${infraction.reason.slice(0, 100)}${infraction.reason.length > 100 ? '...' : ''}${
          infraction.appeal ? `\n*\\- You made an appeal for this infraction.*` : ''
        }\n*\\- ${infraction.guild.infractionModeratorPublic ? `<@${infraction.moderatorId}> at ` : ''}<t:${Math.floor(
          Number(infraction.date / 1000n)
        )}>*`,
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

export default MyInfractionsCommand;
