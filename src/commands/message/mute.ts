import { InfractionType } from '@prisma/client';
import { PermissionFlagsBits, EmbedBuilder, Colors, Message } from 'discord.js';
import ms from 'ms';
import Command, { properties } from '../../lib/structs/Command';
import { adequateHierarchy, getMember } from '../../lib/util/functions';
import { d28 } from '../../lib/util/constants';
import punishLog from '../../handlers/punishLog';

@properties<'message'>({
  name: 'mute',
  description: 'Mute a member.',
  args: ['<member> <duration> [reason]'],
  aliases: ['m', 'silence', 'shut', 'shush', 'quiet'],
  clientPermissions: PermissionFlagsBits.ModerateMembers
})
class MuteCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `member`.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';

    if (member.id === message.author.id) throw 'You cannot mute yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot mute me.';

    if (!adequateHierarchy(message.member!, member)) throw 'You cannot mute this member due to inadequete hierarchy.';

    if (!adequateHierarchy(message.guild.members.me!, member))
      throw 'I cannot mute this member due to inadequete hierarchy.';

    if (member.permissions.has(PermissionFlagsBits.Administrator)) throw 'You cannot mute an administrator.';

    const durationStr = args[1];
    let duration = null;
    if (durationStr) {
      const unaryTest = +durationStr;
      if (unaryTest) duration = unaryTest * 1000;
      else duration = ms(durationStr) ?? null;

      if (duration !== null) duration = BigInt(duration);
    }
    if (duration) {
      if (duration < 1000) throw 'Mute duration must be at least 1 second.';
      if (duration > d28) throw 'Mute duration can only be as long as 28 days.';
    }

    const date = BigInt(Date.now());

    let expires = duration ? duration + date : null;

    const guild = (await this.client.db.guild.findUnique({
      where: { id: message.guildId },
      select: { infractionModeratorPublic: true, infoMute: true, defaultMuteDuration: true }
    }))!;

    if (!expires && guild.defaultMuteDuration === 0n) throw 'A mute duration is required since a default is not set.';

    if (duration) args.shift();
    const reason = args.slice(1).join(' ') || 'Unspecified reason.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    if (!expires) {
      expires = date + guild.defaultMuteDuration;
      duration = guild.defaultMuteDuration;
    }

    await member.timeout(Number(duration), reason);

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: message.guildId,
        type: InfractionType.Mute,
        date,
        moderatorId: message.author.id,
        expires,
        reason
      }
    });

    const data = {
      guildId: message.guildId,
      userId: member.id,
      type: InfractionType.Mute,
      expires
    };

    await this.client.db.task.upsert({
      where: { userId_guildId_type: { userId: member.id, guildId: message.guildId, type: InfractionType.Mute } },
      update: data,
      create: data
    });

    const { infractionModeratorPublic, infoMute } = guild;
    const expiresStr = Math.floor(Number(infraction.expires) / 1000);

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You were muted in ${message.guild.name}`)
      .setColor(Colors.Yellow)
      .setDescription(
        `${reason}${expires ? `\n\n***•** Expires: <t:${expiresStr}> (<t:${expiresStr}:R>)*` : ''}${
          infractionModeratorPublic ? `\n***•** Muted by ${message.member!.toString()}*\n` : ''
        }`
      )
      .setFooter({ text: `Punishment ID: ${infraction.id}` })
      .setTimestamp();

    if (infoMute) dm.addFields([{ name: 'Additional Information', value: infoMute }]);

    await member.send({ embeds: [dm] }).catch(() => {});

    punishLog(infraction);

    const embed = new EmbedBuilder()
      .setColor(Colors.Orange)
      .setDescription(`**${member.user.username}** has been muted with ID \`${infraction.id}\``);

    return message.reply({ embeds: [embed] });
  }
}

export default MuteCommand;
