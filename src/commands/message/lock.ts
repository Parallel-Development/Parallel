import { EmbedBuilder } from '@discordjs/builders';
import { PermissionFlagsBits as Permissions, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getChannel } from '../../lib/util/functions';

@properties<true>({
  name: 'lock',
  description: 'Restrict members from sending messages in the target channel.',
  args: ['[channel] [reason]']
})
class LockCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    let channel = args.length > 0 ? getChannel(message.guild, args[0]) : null;
    if (channel) args.shift();
    else channel = message.channel;

    if (!channel.isTextBased() && !channel.isVoiceBased()) throw 'This type of channel cannot be locked.';
    if (channel.isThread()) throw 'This type of channel cannot be locked.';

    const { lockOverrides } = (await this.client.db.guild.findUnique({
      where: {
        id: message.guildId
      },
      select: {
        lockOverrides: true
      }
    }))!;

    if (!message.guild.members.me!.permissions.has(Permissions.Administrator)) {
      if (!channel.permissionsFor(message.guild.members.me!).has(Permissions.ManageChannels))
        throw "I don't have permission to lock this channel (Missing Manage Channel permissions.)";

      if (
        !channel.permissionOverwrites.cache.some(override => {
          if (override.id === message.guildId) return false;
          if (!override.allow.has(lockOverrides)) return false;

          return true;
        })
      )
        throw "I can't lock this channel. Please create an override in this channel for me, setting the permissions I deny to `allow`. Or, give me the `Administrator` permission.";
    }

    const reason = args.join(' ') || 'Unspecified reason.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    const everyoneOverride = channel.permissionOverwrites.cache.get(message.guildId);
    const everyoneOverrideDeny = everyoneOverride?.deny.bitfield ?? 0n;
    const everyoneOverrideAllow = everyoneOverride?.allow.bitfield ?? 0n;

    const newOverride = everyoneOverrideDeny + (lockOverrides - (everyoneOverrideDeny & lockOverrides));
    if (newOverride === everyoneOverrideDeny) throw 'Channel is already locked.';

    await channel.permissionOverwrites.set(
      [
        ...channel.permissionOverwrites.cache.values(),
        {
          id: message.guildId,
          deny: newOverride
        }
      ],
      reason
    );

    if ((everyoneOverrideAllow & lockOverrides) !== 0n) {
      const data = {
        guildId: message.guildId,
        channelId: channel.id,
        allow: everyoneOverrideAllow & lockOverrides
      };

      await this.client.db.lock.upsert({
        where: {
          channelId: channel.id
        },
        create: data,
        update: data
      });
    }

    await message.reply('Channel locked.');

    const embed = new EmbedBuilder().setColor(Colors.Orange).setTitle('Channel Locked').setDescription(reason);

    return channel.send({ embeds: [embed] });
  }
}

export default LockCommand;
