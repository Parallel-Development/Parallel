import { InfractionType } from '@prisma/client';
import { PermissionFlagsBits, EmbedBuilder, Colors, Message } from 'discord.js';
import Command, { properties, data } from '../../lib/structs/Command';
import { adequateHierarchy, getMember } from '../../lib/util/functions';
import punishLog from '../../handlers/punishLog';

@properties<'message'>({
  name: 'unmute',
  description: 'Unmute a member.',
  args: '<member> [reason]',
  aliases: ['um'],
  clientPermissions: PermissionFlagsBits.ModerateMembers
})
class MuteCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `member`.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';

    if (member.id === message.author.id) throw 'You cannot unmute yourself.';
    if (!member.isCommunicationDisabled()) throw 'This member is not muted.';

    if (!adequateHierarchy(message.guild.members.me!, member))
      throw 'I cannot unmute this member due to inadequete hierarchy.';

    const reason = args.slice(1).join(' ') || 'Unspecified reason.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    const date = Date.now();

    await member.timeout(null);

    await this.client.db.task
      .delete({
        where: {
          userId_guildId_type: {
            guildId: message.guildId,
            userId: member.id,
            type: InfractionType.Mute
          }
        }
      })
      .catch(() => {});

    const infraction = (await this.client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: message.guildId,
        type: InfractionType.Unmute,
        moderatorId: message.author.id,
        date,
        reason
      },
      include: { guild: { select: { infractionModeratorPublic: true } } }
    }))!;

    const { infractionModeratorPublic } = infraction.guild;

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You were unmuted in ${message.guild.name}`)
      .setColor(Colors.Green)
      .setDescription(
        `${reason}${infractionModeratorPublic ? `\n\n***•** Unmuted by ${message.member!.toString()}*\n` : ''}`
      )
      .setTimestamp();

    await member.send({ embeds: [dm] }).catch(() => {});

    punishLog(infraction);

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setDescription(`**${member.user.username}** has been unmuted.`);

    return message.reply({ embeds: [embed] });
  }
}

export default MuteCommand;
