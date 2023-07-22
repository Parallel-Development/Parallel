import { SlashCommandBuilder, PermissionFlagsBits as Permissions, Colors, EmbedBuilder, Message } from 'discord.js';
import { adequateHierarchy, getMember } from '../../lib/util/functions';
import { InfractionType } from '@prisma/client';
import Command, { properties, data } from '../../lib/structs/Command';

@data(
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the guild.')
    .setDefaultMemberPermissions(Permissions.KickMembers)
    .addUserOption(option => option.setName('member').setDescription('The member to kick.').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for kicking.'))
)
@properties<true>({
  name: 'kick',
  description: 'Kick a member from the guild.',
  args: ['[member] <reason>'],
  aliases: ['k', 'boot', 'remove'],
  clientPermissions: [Permissions.KickMembers]
})
class KickCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `member`.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === message.author.id) throw 'You cannot kick yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot kick me.';

    if (!adequateHierarchy(message.member!, member)) throw 'You cannot kick this member due to inadequete hierarchy.';

    if (!adequateHierarchy(message.guild.members.me!, member))
      throw 'I cannot kick this member due to inadequete hierarchy.';

    const reason = args.slice(1).join(' ') || 'Unspecified reason.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: member.id,
        guildId: message.guildId,
        type: InfractionType.Kick,
        date: BigInt(Date.now()),
        moderatorId: message.author.id,
        reason
      },
      include: { guild: { select: { infractionModeratorPublic: true, infoKick: true } } }
    });

    const { infractionModeratorPublic, infoKick } = infraction.guild;

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(`You were kicked from ${message.guild.name}`)
      .setColor(Colors.Red)
      .setDescription(
        `${reason}${infractionModeratorPublic ? `\n***•** Kicked by ${message.member!.toString()}*\n` : ''}`
      )
      .setFooter({ text: `Punishment ID: ${infraction.id}` })
      .setTimestamp();

    if (infoKick) dm.addFields([{ name: 'Additional Information', value: infoKick }]);

    await member.send({ embeds: [dm] }).catch(() => {});

    await member.kick(reason);

    this.client.emit('punishLog', infraction);

    return message.reply(`Kicked **${member.user.username}** with ID \`${infraction.id}\``);
  }
}

export default KickCommand;
