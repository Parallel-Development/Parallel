import { EmbedBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
  Colors,
  VoiceChannel
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';

@data(
  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Restrict members from sending messages in the target channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to lock.')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('The reason for locking the channel.').setMaxLength(3500)
    )
)
class LockCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const channel = (interaction.options.getChannel('channel') ?? interaction.channel)!;
    if (!channel.isTextBased() && !channel.isVoiceBased()) throw 'This type of channel cannot be locked.';
    if (channel.isThread()) throw 'This type of channel cannot be locked.';

    const { lockOverrides } = (await this.client.db.guild.findUnique({
      where: {
        id: interaction.guildId
      },
      select: {
        lockOverrides: true
      }
    }))!;

    if (!interaction.guild.members.me!.permissions.has(PermissionFlagsBits.Administrator)) {
      if (!channel.permissionsFor(interaction.guild.members.me!).has(PermissionFlagsBits.ManageChannels))
        throw "I don't have permission to lock this channel (Missing Manage Channel permissions.)";

      if (
        !channel.permissionOverwrites.cache.some(override => {
          if (override.id === interaction.guildId) return false;
          if (!override.allow.has(lockOverrides)) return false;

          return true;
        })
      )
        throw "I can't lock this channel. Please create an override in this channel for me, setting the permissions I deny to `allow`. Or, give me the `Administrator` permission.";
    }

    const reason = interaction.options.getString('reason') ?? 'Unspecified reason.';

    const everyoneOverride = channel.permissionOverwrites.cache.get(interaction.guildId);
    const everyoneOverrideDeny = everyoneOverride?.deny.bitfield ?? 0n;
    const everyoneOverrideAllow = everyoneOverride?.allow.bitfield ?? 0n;

    const newOverride = everyoneOverrideDeny + (lockOverrides - (everyoneOverrideDeny & lockOverrides));
    if (newOverride === everyoneOverrideDeny) throw 'Channel is already locked.';

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

    await interaction.reply('Channel locked.');

    const embed = new EmbedBuilder().setColor(Colors.Orange).setTitle('Channel Locked').setDescription(reason);

    return channel.send({ embeds: [embed] });
  }
}

export default LockCommand;
