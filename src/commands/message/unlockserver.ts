import { EmbedBuilder } from '@discordjs/builders';
import { PermissionFlagsBits as Permissions, TextChannel, Colors, VoiceChannel, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { sleep } from '../../lib/util/functions';

@properties<true>({
  name: 'unlockserver',
  description: 'Unlock all locked channels.',
  args: ['[reason]'],
  aliases: ['unlockall'],
  guildResolve: true
})
class UnlockserverCommand extends Command {
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
      throw 'This guild has no channels to unlock. To add some, please use `/config lock add-channel <channel>`';

    const reason = args.join(' ') || 'Unspecified reason.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    const msg = await message.reply(
      `Server is now being unlocked. When the process is complete, a follow up message will be sent.\nEstimated to complete <t:${Math.floor(
        (Date.now() + lockChannels.length * 1000) / 1000
      )}:R>`
    );

    for (const channelId of lockChannels) {
      const channel = message.guild.channels.cache.get(channelId) as TextChannel | VoiceChannel | null;
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

      const lockAllow =
        (
          await this.client.db.lock.findUnique({
            where: {
              channelId: channel.id
            }
          })
        )?.allow ?? 0n;

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

      if (newDenyOverride === everyoneOverrideDeny) continue;

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

      const embed = new EmbedBuilder().setColor(Colors.Green).setTitle('Server Unlocked').setDescription(reason);

      if (channel.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => {});
      await sleep(1000);
    }

    await msg.reply('Server unlocked!').catch(() => message.channel!.send('Server unlocked!').catch(() => {}));
  }
}

export default UnlockserverCommand;
