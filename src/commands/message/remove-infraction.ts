import { PermissionFlagsBits, EmbedBuilder, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getMember } from '../../lib/util/functions';
import { Infraction, InfractionType } from '@prisma/client';

@properties<'message'>({
  name: 'remove-infraction',
  description: 'Remove an infraction.',
  args: '<id> [reason] [--undo-punishment',
  aliases: ['delete-infraction', 'rmwarn']
})
class RemoveInfractionCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Missing required argument `id`.';

    const id = +args[0];
    if (Number.isNaN(id) || !Number.isInteger(id)) throw 'Invalid ID.';

    let undo = false;
    const undoFlag = args.indexOf('--undo-punishment');
    if (undoFlag !== -1) {
      undo = true;
      args.splice(undoFlag, 1);
    }
    const reason = args.slice(1).join(' ') || 'Unspecified reason.';

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: {
        guild: true
      }
    });

    if (infraction?.guildId !== message.guildId) throw 'No infraction with that ID exists in this guild.';

    const { notifyInfractionChange } = infraction.guild;

    if (undo) {
      switch (infraction.type) {
        case InfractionType.Ban:
          if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.BanMembers))
            throw 'I cannot undo the punishment because I do not have the Ban Members permission.';
          await message.guild.members.unban(infraction.userId, reason).catch(() => {
            throw 'That member is not banned.';
          });
          break;
        case InfractionType.Mute:
          if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.ModerateMembers))
            throw 'I cannot undo the punishment because I do not have the Moderate Members permission.';
          await message.guild.members
            .fetch(infraction.userId)
            .then(member => member.timeout(null, reason))
            .catch(() => {
              throw 'I could not undo the punishment because the member is not in the guild.';
            });
          break;
        default:
          throw 'I cannot undo that type of punishment.';
      }

      this.client.infractions.createLog({
        userId: infraction.userId,
        guildId: message.guildId,
        moderatorId: message.author.id,
        reason,
        type: infraction.type === InfractionType.Ban ? InfractionType.Unban : InfractionType.Unmute,
        date: BigInt(Date.now())
      } as Infraction);
    }

    await this.client.db.infraction.delete({
      where: {
        id
      }
    });

    await this.client.db.task
      .delete({
        where: {
          userId_guildId_type: {
            userId: infraction.userId,
            guildId: message.guildId,
            type: infraction.type
          }
        }
      })
      .catch(() => {});

    if (notifyInfractionChange) {
      const notifyDM = new EmbedBuilder()
        .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
        .setTitle('Infraction Removed')
        .setColor(Colors.Green)
        .setDescription(
          `**Infraction ID:** \`${infraction.id}\`\n**Infraction punishment:** \`${infraction.type.toString()}\`${
            reason ? `\n${reason}` : ''
          }${
            undo ? `\n\n***•** You were also ${infraction.type === InfractionType.Mute ? 'unmuted' : 'unbanned'}.*` : ''
          }`
        );

      const member = await getMember(message.guildId, infraction.userId);
      if (member) await member.send({ embeds: [notifyDM] }).catch(() => {});
    }

    return message.reply(
      `Infraction \`${infraction.id}\` for <@${infraction.userId}> (${infraction.userId}) has been removed. ${
        undo ? `The user was also ${infraction.type === InfractionType.Mute ? 'unmuted.' : 'unbanned'}` : ''
      }`
    );
  }
}

export default RemoveInfractionCommand;
