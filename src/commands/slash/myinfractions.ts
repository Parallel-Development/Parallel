import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  type EmbedField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import { infractionsPerPage, mainColor } from '../../lib/util/constants';
import { createComplexCustomId } from '../../lib/util/functions';
import { InfractionType } from '@prisma/client';

@data(
  new SlashCommandBuilder()
    .setName('myinfractions')
    .setDescription('View your current infractions.')
    .addNumberOption(option => option.setName('page').setDescription('The page to jump to.').setMinValue(1))
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('To show manual or automod infractions.')
        .addChoices(
          { name: 'Manual', value: 'manual' },
          { name: 'AutoMod', value: 'automod' },
          { name: 'All', value: 'all' }
        )
    )
    .addBooleanOption(option => option.setName('show_removals').setDescription('Show unmutes and unbans.'))
)
class MyInfractionsCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.user;
    let page = interaction.options.getNumber('page') ?? 1;
    const type = interaction.options.getString('type') ?? 'manual';
    const showRemovals = interaction.options.getBoolean('show_removals') ?? false;

    const filter = {
      ...(type == 'manual'
        ? { moderatorId: { not: this.client.user!.id } }
        : type == 'automod'
        ? { moderatorId: this.client.user!.id }
        : {}),
      ...(!showRemovals ? { type: { notIn: [InfractionType.Unban, InfractionType.Unmute] } } : {})
    };

    const infractionCount = await this.client.db.infraction.count({
      where: {
        guildId: interaction.guildId,
        userId: user.id,
        ...filter
      }
    });

    if (infractionCount === 0) return interaction.reply(`You have no ${type !== 'all' ? `${type} ` : ''}infractions.`);
    const pages = Math.ceil(infractionCount / 7);
    if (page > pages) page = pages;

    const infractions = await this.client.db.infraction.findMany({
      where: {
        guildId: interaction.guildId,
        userId: user.id,
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
      .setCustomId(
        createComplexCustomId('infractions', 'back', [user.id, interaction.user.id, type, showRemovals.toString()])
      );

    const forwardButton = new ButtonBuilder()
      .setLabel('>')
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(
        createComplexCustomId('infractions', 'forward', [user.id, interaction.user.id, type, showRemovals.toString()])
      );

    const paginationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, forwardButton);

    return interaction.reply({ embeds: [infractionsEmbed], components: [paginationRow] });
  }
}

export default MyInfractionsCommand;
