import { InfractionType } from '@prisma/client';
import { PermissionFlagsBits as Permissions, Message } from 'discord.js';
import Command, { properties, data } from '../../lib/structs/Command';
import { getUser } from '../../lib/util/functions';

@properties<true>({
  name: 'unban',
  description: 'Unban a member from the guild.',
  args: ['<user> [reason]'],
  aliases: ['ub', 'unbanish'],
  clientPermissions: [Permissions.BanMembers]
})
class UnbanCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `user`.';

    const user = await getUser(args[0]);
    if (!user) throw 'Invalid user.';

    if (!(await message.guild.bans.fetch(user.id).catch(() => null))) throw 'That user is not banned.';

    const reason = args.slice(1).join(' ') || 'Unspecified reason.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    const date = BigInt(Date.now());

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: user.id,
        guildId: message.guildId,
        type: InfractionType.Unban,
        date,
        moderatorId: message.author.id,
        reason
      },
      include: { guild: { select: { infractionModeratorPublic: true } } }
    });

    await message.guild.members.unban(user.id, reason);

    this.client.emit('punishLog', infraction);

    return message.reply(`Unbanned **${user.username}** with ID \`${infraction.id}\``);
  }
}

export default UnbanCommand;
