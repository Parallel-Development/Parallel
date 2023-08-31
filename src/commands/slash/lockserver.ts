import { EmbedBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  TextChannel,
  Colors
} from 'discord.js';
import Command, { data, properties } from '../../lib/structs/Command';
import { sleep } from '../../lib/util/functions';

@data(
  new SlashCommandBuilder()
    .setName('lockserver')
    .setDescription('Restrict members from sending messages in all desingated channels.')
    .setDefaultMemberPermissions(Permissions.ManageChannels)
    .addStringOption(option =>
      option.setName('reason').setDescription('The reason for locking the server.').setMaxLength(3500)
    )
)
@properties({
  guildResolve: true
})
class LockserverCommand extends Command {
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
      throw 'This guild has no channels to lock. To add some, please use `/config lock add-channel <channel>`';

    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';

    await interaction.reply(
      `Server is now undergoing a lockdown. When the process is complete, a follow up message will be sent.\nEstimated to complete <t:${Math.floor(
        (Date.now() + lockChannels.length * 1000) / 1000
      )}:R>`
    );

    for (const channelId of lockChannels) {
      const channel = interaction.guild.channels.cache.get(channelId) as TextChannel | null;
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

      const everyoneOverride = channel.permissionOverwrites.cache.get(interaction.guildId);
      const everyoneOverrideDeny = everyoneOverride?.deny.bitfield ?? 0n;
      const everyoneOverrideAllow = everyoneOverride?.allow.bitfield ?? 0n;

      const newOverride = everyoneOverrideDeny + (lockOverrides - (everyoneOverrideDeny & lockOverrides));
      if (newOverride === everyoneOverrideDeny) continue;

      await channel.permissionOverwrites.set(
        [
          ...channel.permissionOverwrites.cache.values(),
          {
            id: interaction.guildId,
            deny: newOverride
          }
        ],
        reason
      );

      if ((everyoneOverrideAllow & lockOverrides) !== 0n) {
        const data = {
          guildId: interaction.guildId,
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

    await interaction
      .followUp(`Lockdown complete!`)
      .catch(() => interaction.channel!.send('Lockdown complete!').catch(() => {}));
  }
}

export default LockserverCommand;
