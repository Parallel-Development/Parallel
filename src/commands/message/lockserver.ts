import { EmbedBuilder } from '@discordjs/builders';
import { PermissionFlagsBits as Permissions, TextChannel, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { sleep } from '../../lib/util/functions';

@properties<true>({
  name: 'lockserver',
  description: 'Restrict members from sending messages in all desingated channels.',
  args: ['<reason>'],
  aliases: ['lockall'],
  guildResolve: true
})
class LockserverCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    const { lockOverrides, lockChannels } = (await this.client.db.guild.findUnique({
      where: {
        id: message.guildId
      },
      select: {
        lockOverrides: true,
        lockChannels: true
      }
    }))!;

    if (lockChannels.length === 0)
      throw 'This guild has no channels to lock. To add some, please use `/config lock add-channel <channel>`';

    const reason = args.join(' ') || 'Unspecified reason.';

    const replyToMeLaterLol = await message.reply(
      `Server is now undergoing a lockdown. When the process is complete, a follow up message will be sent.\nEstimated to complete <t:${Math.floor(
        (Date.now() + lockChannels.length * 1000) / 1000
      )}:R>`
    );

    for (const channelId of lockChannels) {
      const channel = message.guild.channels.cache.get(channelId) as TextChannel | null;
      if (!channel) continue;

      if (!message.guild.members.me!.permissions.has(Permissions.Administrator)) {
        if (!channel.permissionsFor(message.guild.members.me!).has(Permissions.ManageChannels)) continue;

        if (
          !channel.permissionOverwrites.cache.some(override => {
            if (override.id === message.guildId) return false;
            if (!override.allow.has(lockOverrides)) return false;

            return true;
          })
        )
          continue;
      }

      const everyoneOverride = channel.permissionOverwrites.cache.get(message.guildId);
      const everyoneOverrideDeny = everyoneOverride?.deny.bitfield ?? 0n;
      const everyoneOverrideAllow = everyoneOverride?.allow.bitfield ?? 0n;

      const newOverride = everyoneOverrideDeny + (lockOverrides - (everyoneOverrideDeny & lockOverrides));
      if (newOverride === everyoneOverrideDeny) continue;

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

      const embed = new EmbedBuilder().setColor(Colors.Orange).setTitle('Server Locked').setDescription(reason);

      await channel.send({ embeds: [embed] });
      await sleep(1000);
    }

    await replyToMeLaterLol
      .reply('Lockdown complete!')
      .catch(() => message.channel!.send('Lockdown complete!').catch(() => {}));
  }
}

export default LockserverCommand;
