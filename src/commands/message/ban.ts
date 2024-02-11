import { InfractionType } from '@prisma/client';
import { PermissionFlagsBits, EmbedBuilder, Colors, Message, GuildMember } from 'discord.js';
import ms from 'ms';
import Command, { properties } from '../../lib/structs/Command';
import { adequateHierarchy, getMember, getUser, parseDuration } from '../../lib/util/functions';
import punishLog from '../../handlers/punishLog';

@properties<'message'>({
  name: 'ban',
  description: 'Ban a member from the guild.',
  args: '<user> [duration] [reason]',
  aliases: ['banish', 'b'],
  clientPermissions: PermissionFlagsBits.BanMembers
})
class BanCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `user`.';

    const user = (await getMember(message.guild, args[0])) ?? (await getUser(args[0]));
    if (!user) throw 'Invalid user.';

    if (user.id === message.author.id) throw 'You cannot ban yourself.';
    if (user.id === this.client.user!.id) throw 'You cannot ban me.';

    if (user instanceof GuildMember) {
      if (!adequateHierarchy(message.member!, user)) throw 'You cannot ban this member due to inadequete hierarchy.';

      if (!adequateHierarchy(message.guild.members.me!, user))
        throw 'I cannot ban this member due to inadequete hierarchy.';
    }

    const durationStr = args[1];
    let duration = null;
    if (args.length >= 2 && args[1] !== 'permanent')
      duration = parseDuration(durationStr);

    const date = Date.now();

    if (duration && duration < 1000) throw 'Temporary ban duration must be at least 1 second.';
    let expires = duration ? duration + date : null;

    if (duration || durationStr === 'permanent') args.shift();
    const reason = args.slice(1).join(' ') || 'Unspecified reason.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    const guild = (await this.client.db.guild.findUnique({
      where: { id: message.guildId },
      select: { infractionModeratorPublic: true, infoBan: true, defaultBanDuration: true }
    }))!;

    if (!expires && durationStr !== 'permanent' && guild.defaultBanDuration !== 0n)
      expires = Number(guild.defaultBanDuration) + date;

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: user.id,
        guildId: message.guildId,
        type: InfractionType.Ban,
        date,
        moderatorId: message.author.id,
        expires,
        reason
      }
    });

    if (expires) {
      const data = {
        guildId: message.guildId,
        userId: user.id,
        type: InfractionType.Ban,
        expires
      };

      await this.client.db.task.upsert({
        where: {
          userId_guildId_type: { userId: user.id, guildId: message.guildId, type: InfractionType.Ban }
        },
        update: data,
        create: data
      });
    } else
      await this.client.db.task
        .delete({
          where: {
            userId_guildId_type: { userId: user.id, guildId: message.guildId, type: InfractionType.Ban }
          }
        })
        .catch(() => {});

    const { infractionModeratorPublic, infoBan } = guild;
    const expiresStr = Math.floor(Number(infraction.expires) / 1000);

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You were banned from ${message.guild.name}`)
      .setColor(Colors.Red)
      .setDescription(
        `${reason}${duration ? `\n\n***•** Expires: <t:${expiresStr}> (<t:${expiresStr}:R>)*` : ''}${
          infractionModeratorPublic ? `\n***•** Banned by ${message.member!.toString()}*\n` : ''
        }`
      )
      .setFooter({ text: `Infraction ID: ${infraction.id}` })
      .setTimestamp();

    if (infoBan) dm.addFields([{ name: 'Additional Information', value: infoBan }]);

    if (user instanceof GuildMember) await user.send({ embeds: [dm] }).catch(() => {});

    await message.guild.members.ban(user.id, { reason });

    punishLog(infraction);

    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setDescription(
        `**${user instanceof GuildMember ? user.user.username : user.username}** has been banned with ID \`${
          infraction.id
        }\``
      );

    return message.reply({ embeds: [embed] });
  }
}

export default BanCommand;
