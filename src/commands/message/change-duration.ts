import { EmbedBuilder, Message, PermissionFlagsBits } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import ms from 'ms';
import { InfractionType } from '@prisma/client';
import { adequateHierarchy, getMember, hasSlashCommandPermission, parseDuration } from '../../lib/util/functions';
import { d28, infractionColors } from '../../lib/util/constants';

@properties<'message'>({
  name: 'change-duration',
  description: 'Change the duration of a punishment.',
  args: '<id> <duration> [reason]',
  aliases: ['duration', 'd']
})
class DurationCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required arguments `id` and `duration`.';
    if (args.length === 1) throw 'Missing required argument `duration`.';

    const id = +args[0];
    if (Number.isNaN(id) || !Number.isInteger(id)) throw 'Invalid ID.';

    const reason = args.slice(2).join(' ') || 'Unspecified reason.';

    const durationStr = args[1];
    let duration: number | null = null;

    if (durationStr.toLowerCase() === 'permanent') duration = 0;
    else {
      duration = parseDuration(durationStr);
      if (Number.isNaN(duration)) throw 'Invalid duration.';
    }

    if (duration !== 0 && duration < 1000) throw 'Duration must be at least 1 second.';

    const date = Date.now();
    const expires = duration ? date + duration : null;

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: { guild: { select: { notifyInfractionChange: true, infractionModeratorPublic: true } } }
    });

    if (infraction?.guildId !== message.guildId) throw 'No infraction with that ID exists in this guild.';

    if (
      infraction.type === InfractionType.Unban ||
      infraction.type === InfractionType.Unmute ||
      infraction.type === InfractionType.Kick
    )
      throw 'You cannot change the duration for that kind of infraction.';

    if (!(await hasSlashCommandPermission(message.member!, infraction.type.toLowerCase())))
      throw 'You do not have permission to change the duration of this type of infraction.';

    if (infraction.expires !== null && date >= infraction.expires) throw 'This infraction has already expired.';

    if (infraction.type === InfractionType.Mute) {
      if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.ModerateMembers))
        throw 'I do not have permission to mute members.';

      if (duration > d28 || duration === 0) throw 'Mute duration must be 28 days or less.';

      const member = await getMember(message.guild, infraction.userId);
      if (!member) throw 'Cannot change the duration of the mute because the user is no longer in the server.';

      if (!adequateHierarchy(message.guild.members.me!, member))
        throw 'I cannote mute this member due to inadequate hierarchy.';

      await member.timeout(duration, reason);
    }

    await this.client.db.infraction.update({
      where: { id },
      data: {
        expires
      }
    });

    if (infraction.type !== InfractionType.Warn) {
      if (expires)
        await this.client.db.task.update({
          where: {
            userId_guildId_type: {
              userId: infraction.userId,
              guildId: message.guildId,
              type: infraction.type
            }
          },
          data: {
            expires
          }
        });
      else
        await this.client.db.task.delete({
          where: {
            userId_guildId_type: {
              userId: infraction.userId,
              guildId: message.guildId,
              type: infraction.type
            }
          }
        });
    }

    const { notifyInfractionChange, infractionModeratorPublic } = infraction.guild;
    if (notifyInfractionChange) {
      const expiresStr = Math.floor(Number(expires) / 1000);

      const notifyDM = new EmbedBuilder()
        .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
        .setTitle(`${infraction.type} Duration Changed`)
        .setColor(infractionColors[infraction.type])
        .setDescription(
          `New Expiration: ${expires ? `<t:${expiresStr}> (<t:${expiresStr}:R>)` : 'never'}\nReason: ${reason}${
            infractionModeratorPublic ? `\n\n***•** Changed by: ${message.author.toString()}*` : ''
          }`
        )
        .setFooter({ text: `Original Infraction ID: ${infraction.id}` })
        .setTimestamp();

      const member = await getMember(message.guildId, infraction.userId);
      if (member) await member.send({ embeds: [notifyDM] }).catch(() => {});
    }

    return message.reply(
      `${infraction.type} duration of infraction \`${infraction.id}\` for <@${infraction.userId}> changed to \`${
        duration ? ms(duration, { long: true }) : 'permanent'
      }\`.`
    );
  }
}

export default DurationCommand;
