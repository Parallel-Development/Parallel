import { ButtonInteraction, EmbedBuilder, EmbedField } from 'discord.js';
import Button from '../lib/structs/Button';
import { hasSlashCommandPermission, readComplexCustomId } from '../lib/util/functions';
import { infractionsPerPage, mainColor } from '../lib/util/constants';
import { InfractionType } from '@prisma/client';

class InfractionsButton extends Button {
  constructor() {
    super('infractions');
  }

  async run(interaction: ButtonInteraction<'cached'>) {
    const { option, data } = readComplexCustomId(interaction.customId);
    if (!option || !data) return;

    const [userId, controllerId, type, showRemovals] = data;
    const description = interaction.message.embeds[0]!.description!;
    let page = +description.match(/Page: `(\d*)`/)![1];

    const filter = {
      ...(type == 'manual'
        ? { moderatorId: { not: this.client.user!.id } }
        : type == 'automod'
        ? { moderatorId: this.client.user!.id }
        : {}),
      ...(showRemovals === 'false'
        ? { type: { notIn: [InfractionType.Unban, InfractionType.Unmute] } }
        : {})
    };

    if (interaction.user.id !== controllerId) throw 'You cannot use this button.';

    if (
      !(await hasSlashCommandPermission(interaction.member, userId === controllerId ? 'myinfractions' : 'infractions'))
    )
      throw 'You no longer have permission to use this command.';

    if (option === 'back') page--;
    else if (option === 'forward') page++;

    if (page === 0) page = 1;

    const infractionCount = await this.client.db.infraction.count({
      where: {
        guildId: interaction.guildId,
        userId,
        ...filter
      }
    });

    if (infractionCount === 0) return interaction.update({ content: `No ${type !== 'all' ? `${type} ` : ''}infractions.`, embeds: [], components: [] });

    const pages = Math.ceil(infractionCount / 7);
    if (page > pages) page = pages;

    const infractions = await this.client.db.infraction.findMany({
      where: {
        guildId: interaction.guildId,
        userId: userId,
        ...filter
      },
      include: { appeal: true, guild: { select: { infractionModeratorPublic: true } } },
      orderBy: {
        id: 'desc'
      },
      take: infractionsPerPage,
      skip: infractionsPerPage * (page - 1)
    });

    let infractionModeratorPublic = userId !== controllerId;
    if (!infractionModeratorPublic) infractionModeratorPublic = infractions[0].guild.infractionModeratorPublic;

    const infractionsEmbed = new EmbedBuilder()
      .setDescription(`Total infractions: \`${infractionCount}\`\nPage: \`${page}\`/\`${pages}\`\nShowing ${type !== 'all' ? 'only ' : ''}${type} infractions. ${type === 'manual' ? `(\`/infractions type\`)` : ''}`)
      .setFooter(interaction.message.embeds[0]!.footer)
      .setColor(mainColor);

    const iconURL = interaction.message.embeds[0]!.author!.iconURL;
    if (userId === controllerId) {
      infractionsEmbed
        .setAuthor({ name: `Your infractions`, iconURL })
        .setFooter({ text: '/mycase <id>' });
    }
    else {
      const username = interaction.message.embeds[0]!.author?.name.split(' ')[2]; // Infractions (0) for (1) username (2)
      infractionsEmbed
        .setAuthor({ name: `Infractions for ${username} (${userId})`, iconURL })
        .setFooter({ text: '/case <id>' })
    }

    const fields: EmbedField[] = [];
    for (const infraction of infractions) {
      const field: EmbedField = {
        name: `ID ${infraction.id}: ${infraction.type.toString()}`,
        value: `${infraction.reason.slice(0, 100)}${infraction.reason.length > 100 ? '...' : ''}${
          infraction.appeal ? `\n*\\- You made an appeal for this infraction.*` : ''
        }\n*\\- ${
          infractionModeratorPublic ? `<@${infraction.moderatorId}> at ` : ''
        }<t:${Math.floor(Number(infraction.date / 1000n))}>*`,
        inline: false
      };

      fields.push(field);
    }

    infractionsEmbed.setFields(fields);

    return interaction.update({ embeds: [infractionsEmbed] });
  }
}

export default InfractionsButton;
