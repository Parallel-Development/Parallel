import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  EmbedBuilder,
  type EmbedField
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import { infractionsPerPage, mainColor } from '../../lib/util/constants';

@data(
  new SlashCommandBuilder()
    .setName('infractions')
    .setDescription("View a user's current infractions.")
    .setDefaultMemberPermissions(Permissions.ModerateMembers)
    .addUserOption(option =>
      option.setName('user').setDescription('The user to get the infractions of.').setRequired(true)
    )
    .addNumberOption(option => option.setName('page').setDescription('The page to jump to.').setMinValue(1))
)
class InfractionsCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('user', true);
    let page = interaction.options.getNumber('page') ?? 1;

    const infractionCount = await this.client.db.infraction.count({
      where: {
        guildId: interaction.guildId,
        userId: user.id
      }
    });

    if (infractionCount === 0) return interaction.reply('There are no infractions for this user.');
    const pages = Math.ceil(infractionCount / 7);
    if (page > pages) page = pages;

    const infractions = await this.client.db.infraction.findMany({
      where: {
        guildId: interaction.guildId,
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

    return interaction.reply({ embeds: [infractionsEmbed] });
  }
}

export default InfractionsCommand;
