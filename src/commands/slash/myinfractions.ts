import { type ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, type EmbedField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import { infractionsPerPage, mainColor } from '../../lib/util/constants';
import { createComplexCustomId } from '../../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('myinfractions')
    .setDescription('View your current infractions.')
    .addNumberOption(option => option.setName('page').setDescription('The page to jump to.').setMinValue(1))
)
class MyInfractionsCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.user;
    let page = interaction.options.getNumber('page') ?? 1;

    const infractionCount = await this.client.db.infraction.count({
      where: {
        guildId: interaction.guildId,
        userId: user.id
      }
    });

    if (infractionCount === 0) return interaction.reply('You have no infractions.');
    const pages = Math.ceil(infractionCount / 7);
    if (page > pages) page = pages;

    const infractions = await this.client.db.infraction.findMany({
      where: {
        guildId: interaction.guildId,
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

    const backButton = new ButtonBuilder().setLabel('<').setStyle(ButtonStyle.Secondary)
    .setCustomId(createComplexCustomId('infractions', 'back', [user.id, interaction.user.id]));

    const forwardButton = new ButtonBuilder().setLabel('>').setStyle(ButtonStyle.Secondary)
    .setCustomId(createComplexCustomId('infractions', 'forward', [user.id, interaction.user.id]));
    
    const paginationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton, forwardButton);

    return interaction.reply({ embeds: [infractionsEmbed], components: [paginationRow] });
  }
}

export default MyInfractionsCommand;
