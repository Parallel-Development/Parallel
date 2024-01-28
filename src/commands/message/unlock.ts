import { EmbedBuilder } from '@discordjs/builders';
import { PermissionFlagsBits, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getChannel } from '../../lib/util/functions';

@properties<'message'>({
  name: 'unlock',
  description: 'Allow members to speak in the target channel.',
  args: '[channel] <reason>'
})
class UnlockCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    let channel = args.length > 0 ? getChannel(message.guild, args[0]) : null;
    if (channel) args.shift();
    else channel = message.channel;

    if (!channel.isTextBased() && !channel.isVoiceBased()) throw 'This type of channel cannot be unlocked.';
    if (channel.isThread()) throw 'This type of channel cannot be unlocked.';

    const { lockOverrides } = (await this.client.db.guild.findUnique({
      where: {
        id: message.guildId
      },
      select: {
        lockOverrides: true
      }
    }))!;

    const lockAllow =
      (
        await this.client.db.lock.findUnique({
          where: {
            channelId: channel.id
          }
        })
      )?.allow ?? 0n;

    if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.Administrator)) {
      if (!channel.permissionsFor(message.guild.members.me!).has(PermissionFlagsBits.ManageChannels))
        throw "I don't have permission to unlock this channel (Missing `Manage Channel` permissions.)";

      if (
        !channel.permissionOverwrites.cache.some(override => {
          if (override.id === message.guildId) return false;
          if (!override.allow.has(lockOverrides)) return false;

          return true;
        })
      )
        throw "I can't unlock this channel. Please create an override in this channel for me, setting the permissions I deny to `allow`. Or, give me the `Administrator` permission.";
    }

    const reason = args.join(' ') || 'Unspecified reason.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    const everyoneOverride = channel.permissionOverwrites.cache.get(message.guildId);
    const everyoneOverrideDeny = everyoneOverride?.deny.bitfield ?? 0n;
    const everyoneOverrideAllow = everyoneOverride?.allow.bitfield ?? 0n;

    const newDenyOverride = everyoneOverrideDeny - (everyoneOverrideDeny & lockOverrides);
    const newAllowOverride = everyoneOverrideAllow + (lockAllow - (everyoneOverrideAllow & lockAllow));

    if (lockAllow !== 0n)
      await this.client.db.lock.delete({
        where: {
          channelId: channel.id
        }
      });

    if (newDenyOverride === everyoneOverrideDeny) throw 'Channel is already in an unlocked state.';

    await channel.permissionOverwrites.set(
      [
        ...channel.permissionOverwrites.cache.values(),
        {
          id: message.guildId,
          allow: newAllowOverride,
          deny: newDenyOverride
        }
      ],
      reason
    );

    await message.reply('Channel unlocked.');

    const embed = new EmbedBuilder().setColor(Colors.Green).setTitle('Channel Unlocked').setDescription(reason);

    return channel.send({ embeds: [embed] });
  }
}

export default UnlockCommand;
