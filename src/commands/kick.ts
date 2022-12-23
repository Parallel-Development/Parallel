import {
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  type ChatInputCommandInteraction,
  Colors,
  EmbedBuilder
} from 'discord.js';
import { adequateHierarchy } from '../lib/util/functions';
import { InfractionType } from '@prisma/client';
import Command, { clientpermissions, data } from '../lib/structs/Command';

@data(
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the guild.')
    .setDefaultMemberPermissions(Permissions.KickMembers)
    .addUserOption(option => option.setName('member').setDescription('The member to kick.').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for kicking.'))
)
@clientpermissions([Permissions.KickMembers])
class KickCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const member = interaction.options.getMember('member');
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === interaction.user.id) throw 'You cannot kick yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot kick me.';

    if (!adequateHierarchy(interaction.member, member))
      throw 'You cannot kick this member due to inadequete hierarchy.';

    if (!adequateHierarchy(interaction.guild.members.me!, member))
      throw 'I cannot kick this member due to inadequete hierarchy.';

    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';

    await interaction.deferReply();

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: interaction.guildId,
        type: InfractionType.Kick,
        date: BigInt(Date.now()),
        moderatorId: interaction.user.id,
        reason
      },
      include: { guild: { select: { infractionModeratorPublic: true, infoKick: true } } }
    });

    const { infractionModeratorPublic, infoKick } = infraction.guild;

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You were kicked from ${interaction.guild.name}`)
      .setColor(Colors.Red)
      .setDescription(
        `${reason}${infractionModeratorPublic ? `\n***•** Kicked by ${interaction.member.toString()}*\n` : ''}`
      )
      .setFooter({ text: `Punishment ID: ${infraction.id}` })
      .setTimestamp();

    if (infoKick) dm.addFields([{ name: 'Additional Information', value: infoKick }]);

    await member.send({ embeds: [dm] }).catch(() => {});

    await member.kick(reason);

    this.client.emit('punishLog', infraction);

    return interaction.editReply(`Kicked **${member.user.tag}** with ID \`${infraction.id}\``);
  }
}

export default KickCommand;
