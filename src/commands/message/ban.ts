import { InfractionType } from '@prisma/client';
import { PermissionFlagsBits as Permissions, EmbedBuilder, Colors, Message, GuildMember } from 'discord.js';
import ms from 'ms';
import Command, { properties } from '../../lib/structs/Command';
import { adequateHierarchy, getMember, getUser } from '../../lib/util/functions';

@properties<true>({
  name: 'ban',
  description: 'Ban a member from the guild.',
  args: ['[user] <duration> <reason>'],
  aliases: ['banish', 'b'],
  clientPermissions: [Permissions.BanMembers]
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

    let duration = null;
    if (args.length >= 2 && args[1] !== 'never') {
      const unaryTest = +args[1];
      if (unaryTest) duration = unaryTest * 1000;
      else duration = ms(args[1]) ?? null;

      if (duration !== null) duration = BigInt(duration);
    }

    const date = BigInt(Date.now());

    if (duration && duration < 1000) throw 'Temporary ban duration must be at least 1 second.';
    let expires = duration ? duration + date : null;

    if (duration) args.shift();
    const reason = args.slice(1).join(' ') || 'Unspecified reason.';

    const guild = (await this.client.db.guild.findUnique({
      where: { id: message.guildId },
      select: { infractionModeratorPublic: true, infoBan: true, defaultBanDuration: true }
    }))!;

    if (!expires && args[1] !== 'never' && guild.defaultBanDuration !== 0n) expires = guild.defaultBanDuration + date;

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
    }

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
      .setFooter({ text: `Punishment ID: ${infraction.id}` })
      .setTimestamp();

    if (infoBan) dm.addFields([{ name: 'Additional Information', value: infoBan }]);

    if (user instanceof GuildMember) await user.send({ embeds: [dm] }).catch(() => {});

    await message.guild.members.ban(user.id, { reason });

    this.client.emit('punishLog', infraction);

    return message.reply(
      `Banned **${user instanceof GuildMember ? user.user.username : user.username}** with ID \`${infraction.id}\``
    );
  }
}

export default BanCommand;
