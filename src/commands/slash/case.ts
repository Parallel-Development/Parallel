import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import { InfractionType } from '@prisma/client';
import ms from 'ms';
import { infractionColors } from '../../lib/util/constants';
import { getUser } from '../../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('case')
    .setDescription('View detailed information on an infraction.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption(option =>
      option.setName('id').setDescription('The infraction ID.').setMinValue(1).setRequired(true)
    )
)
class CaseCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const id = interaction.options.getInteger('id', true);
    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: { appeal: true }
    });

    if (infraction?.guildId !== interaction.guildId) throw 'No infraction with that ID exists in this guild.';

    const user = await getUser(infraction.userId);
    const moderator = await getUser(infraction.moderatorId);
    const infractionEmbed = new EmbedBuilder()
      .setAuthor({ name: `${moderator!.username} (${moderator!.id})`, iconURL: moderator!.displayAvatarURL() })
      .setColor(infractionColors[infraction.type])
      .setDescription(
        `**${
          infraction.type === InfractionType.Ban || infraction.type === InfractionType.Unban ? 'User' : 'Member'
        }:** \`${user!.username}\` (${user!.id})\n**Action:** ${infraction.type.toString()}${
          infraction.expires
            ? `\n**Duration:** ${ms(Number(infraction.expires - infraction.date), {
                long: true
              })}\n**Expires:** <t:${Math.floor(Number(infraction.expires) / 1000)}> (<t:${Math.floor(
                Number(infraction.expires) / 1000
              )}:R>)`
            : ''
        }\n**Reason:** ${infraction.reason}${
          infraction.appeal ? `\n***\\- There is an appeal for this infraction.*` : ''
        }`
      )
      .setFooter({ text: `Infraction ID: ${infraction.id ? infraction.id : 'Undefined'}` })
      .setTimestamp(Number(infraction.date));

    return interaction.reply({ embeds: [infractionEmbed] });
  }
}

export default CaseCommand;
