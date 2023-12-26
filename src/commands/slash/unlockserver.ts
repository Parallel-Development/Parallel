import { EmbedBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  TextChannel,
  Colors,
  VoiceChannel
} from 'discord.js';
import Command, { data, properties } from '../../lib/structs/Command';
import { sleep } from '../../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('unlockserver')
    .setDescription('Unlock all locked channels.')
    .setDefaultMemberPermissions(Permissions.ManageChannels)
    .addStringOption(option =>
      option.setName('reason').setDescription('The reason for unlocking the server.').setMaxLength(3500)
    )
)
@properties({
  guildResolve: true
})
class UnlockserverCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const { lockOverrides, lockChannels } = (await this.client.db.guild.findUnique({
      where: {
        id: interaction.guildId
      },
      select: {
        lockOverrides: true,
        lockChannels: true
      }
    }))!;

    if (lockChannels.length === 0)
      throw 'This guild has no channels to unlock. To add some, please use `/config lock add-channel <channel>`';

    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';

    await interaction.reply(
      `Server is now being unlocked. When the process is complete, a follow up message will be sent.\nEstimated to complete <t:${Math.floor(
        (Date.now() + lockChannels.length * 1000) / 1000
      )}:R>`
    );

    for (const channelId of lockChannels) {
      const channel = interaction.guild.channels.cache.get(channelId) as TextChannel | VoiceChannel | null;
      if (!channel) continue;

      if (!interaction.guild.members.me!.permissions.has(Permissions.Administrator)) {
        if (!channel.permissionsFor(interaction.guild.members.me!).has(Permissions.ManageChannels)) continue;

        if (
          !channel.permissionOverwrites.cache.some(override => {
            if (override.id === interaction.guildId) return false;
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

      const everyoneOverride = channel.permissionOverwrites.cache.get(interaction.guildId);
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
            id: interaction.guildId,
            allow: newAllowOverride,
            deny: newDenyOverride
          }
        ],
        reason
      );

      const embed = new EmbedBuilder().setColor(Colors.Green).setTitle('Server Unlocked').setDescription(reason);

      await channel.send({ embeds: [embed] }).catch(() => {});
      await sleep(1000);
    }

    await interaction
      .followUp(`Server unlocked!`)
      .catch(() => interaction.channel!.send('Server unlocked!').catch(() => {}));
  }
}

export default UnlockserverCommand;
