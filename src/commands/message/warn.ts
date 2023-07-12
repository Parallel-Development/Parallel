import { EmbedBuilder, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import ms from 'ms';
import { adequateHierarchy, getMember } from '../../lib/util/functions';

@properties<true>({
  name: 'warn',
  description: 'Issue an infraction for a member.',
  args: ['[member] <erase-after> <reason>'],
  aliases: ['w', 'strike']
})
class WarnCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `member`.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === message.author.id) throw 'You cannot warn yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot warn me.';

    if (!adequateHierarchy(message.member!, member)) throw 'You cannot warn this member due to inadequete hierarchy.';

    const durationStr = args[1];
    let duration = null;
    if (durationStr && durationStr !== 'never') {
      const unaryTest = +durationStr;
      if (unaryTest) duration = unaryTest * 1000;
      else duration = ms(durationStr) ?? null;

      if (duration !== null) duration = BigInt(duration);
    }
    if (duration && duration < 1000) throw 'Temporary warn duration must be at least 1 second.';

    const date = BigInt(Date.now());

    let expires = duration ? duration + date : null;

    if (duration) args.shift();
    const reason = args.slice(1).join(' ') || 'Unspecified reason.';

    const guild = (await this.client.db.guild.findUnique({
      where: { id: message.guildId },
      select: { infractionModeratorPublic: true, infoWarn: true, defaultWarnDuration: true }
    }))!;

    if (!expires && durationStr !== 'never' && guild.defaultWarnDuration !== 0n)
      expires = guild.defaultWarnDuration + date;

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: message.guildId,
        date,
        moderatorId: message.author.id,
        expires,
        reason
      }
    });

    const { infractionModeratorPublic, infoWarn } = guild;

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You received a warning in ${message.guild.name}`)
      .setColor(Colors.Yellow)
      .setDescription(
        `${reason}${
          expires ? `\n\n***•** This warning is valid until <t:${Math.floor(Number(infraction.expires) / 1000)}>*` : ''
        }${infractionModeratorPublic ? `\n***•** Warning issued by ${message.member!.toString()}*\n` : ''}`
      )
      .setFooter({ text: `Infraction ID: ${infraction.id}` })
      .setTimestamp();

    if (infoWarn) dm.addFields([{ name: 'Additional Information', value: infoWarn }]);

    await member.send({ embeds: [dm] }).catch(() => {});
    this.client.emit('punishLog', infraction);

    return message.reply(`Warning issued for **${member.user.username}** with ID \`${infraction.id}\``);
  }
}

export default WarnCommand;
