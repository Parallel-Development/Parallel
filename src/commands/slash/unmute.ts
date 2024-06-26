import { InfractionType } from '@prisma/client';
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  Colors
} from 'discord.js';
import Command, { properties, data } from '../../lib/structs/Command';
import { adequateHierarchy } from '../../lib/util/functions';
import punishLog from '../../handlers/punishLog';

@data(
  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName('member').setDescription('The member to unmute.').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for the unmute.').setMaxLength(3500))
)
@properties<'slash'>({
  clientPermissions: PermissionFlagsBits.ModerateMembers
})
class MuteCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const member = interaction.options.getMember('member');
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === interaction.user.id) throw 'You cannot unmute yourself.';
    if (!member.isCommunicationDisabled()) throw 'This member is not muted.';

    if (!adequateHierarchy(interaction.guild.members.me!, member))
      throw 'I cannot unmute this member due to inadequate hierarchy.';

    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';
    const date = Date.now();

    await interaction.deferReply();

    await member.timeout(null);

    await this.client.db.task
      .delete({
        where: {
          userId_guildId_type: {
            guildId: interaction.guildId,
            userId: member.id,
            type: InfractionType.Mute
          }
        }
      })
      .catch(() => {});

    const infraction = (await this.client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: interaction.guildId,
        type: InfractionType.Unmute,
        moderatorId: interaction.user.id,
        date,
        reason
      },
      include: { guild: { select: { infractionModeratorPublic: true } } }
    }))!;

    const { infractionModeratorPublic } = infraction.guild;

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You were unmuted in ${interaction.guild.name}`)
      .setColor(Colors.Green)
      .setDescription(
        `${reason}${infractionModeratorPublic ? `\n\n***•** Unmuted by ${interaction.member.toString()}*\n` : ''}`
      )
      .setTimestamp();

    await member.send({ embeds: [dm] }).catch(() => {});

    punishLog(infraction);

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setDescription(`**${member.user.username}** has been unmuted with ID \`${infraction.id}\``);

    return interaction.editReply({ embeds: [embed] });
  }
}

export default MuteCommand;
