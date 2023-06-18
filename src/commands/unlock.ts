import { EmbedBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  ChannelType,
  TextChannel,
  Colors
} from 'discord.js';
import Command, { data } from '../lib/structs/Command';

@data(
  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Allow members to speak in the target channel.')
    .setDefaultMemberPermissions(Permissions.ManageChannels)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to unlock.')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
    )
    .addStringOption(option => option.setName('reason').setDescription('The reason for unlocking the channel.'))
)
class UnlockCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const channel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;

    const { lockOverrides } = (await this.client.db.guild.findUnique({
      where: {
        id: interaction.guildId
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

    if (!interaction.guild.members.me!.permissions.has(Permissions.Administrator)) {
      if (!channel.permissionsFor(interaction.guild.members.me!).has(Permissions.ManageChannels))
        throw "I don't have permission to unlock this channel (Missing `Manage Channel` permissions.)";

      if (
        !channel.permissionOverwrites.cache.some(override => {
          if (override.id === interaction.guildId) return false;
          if (!override.allow.has(lockOverrides)) return false;

          return true;
        })
      )
        throw "I can't unlock this channel. Please create an override in this channel for me, setting the permissions I deny to `allow`. Or, give me the `Administrator` permission.";
    }

    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';

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

    if (newDenyOverride === everyoneOverrideDeny) throw 'Channel is already in an unlocked state.';

    await interaction.deferReply({ ephemeral: interaction.channel === channel });

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

    await interaction.editReply('Channel unlocked.');

    const embed = new EmbedBuilder().setColor(Colors.Green).setTitle('Channel Unlocked').setDescription(reason);

    return channel.send({ embeds: [embed] });
  }
}

export default UnlockCommand;
