import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits as Permissions,
  ApplicationCommandOptionType,
  EmbedBuilder,
  Colors,
  ApplicationCommandData
} from 'discord.js';
import { InfractionType } from '@prisma/client';
import client from '../client';
import customSlashCommand from './customSlashCommand';

// imported by messageCommand
export const customCommandsConfirmed = new Set();
export const unresolvedGuilds = new Set<string>();

export default async function (interaction: ChatInputCommandInteraction) {
  const blacklist = await checkBlacklisted(interaction.user.id);
  if (blacklist)
    return interaction.reply({
      content: `You may not run any commands because you are banned from Parallel.\nReason: ${blacklist.reason}`,
      ephemeral: true
    });

  const command = client.commands.slash.get(interaction.commandName);
  if (!command) {
    if (!interaction.inCachedGuild()) return interaction.reply({ content: 'Unknown Command', ephemeral: true });

    try {
      await customSlashCommand(interaction);
    } catch (e) {
      if (typeof e !== 'string') {
        console.error(e);
        return;
      }

      const embed = new EmbedBuilder().setColor(Colors.Red).setDescription(e);

      if (!interaction.deferred && !interaction.replied) return interaction.reply({ embeds: [embed], ephemeral: true });
      else return interaction.editReply({ embeds: [embed] });
    }

    return;
  }

  if (!interaction.inCachedGuild() && !command.allowDM)
    return interaction.reply({ content: 'That command must be ran in a guild.', ephemeral: true });

  if (command.clientPermissions) {
    if (!interaction.guild!.members.me!.permissions.has(command.clientPermissions))
      return interaction.reply({
        content: `I don\'t have the required permissions to complete this command.\nMissing: \`${command.clientPermissions
          .toArray()
          .join('`, `')
          .replaceAll(/[a-z][A-Z]/g, m => `${m[0]} ${m[1]}`)}\``,
        ephemeral: true
      });
  }

  if (interaction.inCachedGuild()) await confirmGuild(interaction.guildId);

  if (command.guildResolve) {
    if (unresolvedGuilds.has(`${interaction.guildId!} ${interaction.commandName}`))
      return interaction.reply({
        content:
          'Another process of this command is currently running. Please wait for it to finish before running this command.',
        ephemeral: true
      });

    unresolvedGuilds.add(`${interaction.guildId!} ${interaction.commandName}`);
  }

  try {
    await command.run(interaction);

    if (command.guildResolve) unresolvedGuilds.delete(`${interaction.guildId!} ${interaction.commandName}`);
  } catch (e) {
    if (command.guildResolve) unresolvedGuilds.delete(`${interaction.guildId!} ${interaction.commandName}`);

    if (typeof e !== 'string') {
      console.error(e);
      return;
    }

    const embed = new EmbedBuilder().setColor(Colors.Red).setDescription(e);

    if (!interaction.deferred && !interaction.replied) return interaction.reply({ embeds: [embed], ephemeral: true });
    else return interaction.editReply({ embeds: [embed] });
  }
}

export async function confirmGuild(guildId: string) {
  if (!customCommandsConfirmed.has(guildId)) {
    checkShortcuts(guildId);
    customCommandsConfirmed.add(guildId);
  }

  const guild = await client.db.guild.findUnique({
    where: {
      id: guildId
    }
  });

  if (guild) return guild;

  return client.db.guild.create({
    data: {
      id: guildId
    }
  });
}

export async function checkShortcuts(guildId: string) {
  const customCommands = await client.db.shortcut.findMany({
    where: {
      guildId: guildId
    }
  });

  const guild = client.guilds.cache.get(guildId)!;

  const put: ApplicationCommandData[] = [];
  let changed = 0;
  for (const command of customCommands) {
    const sCommand = guild.commands.cache.find(cmd => cmd.name === command.name);
    if (sCommand) {
      put.push(sCommand as ApplicationCommandData);
      continue;
    }
    changed++;

    put.push({
      name: command.name,
      description: command.description,
      defaultMemberPermissions:
        command.punishment === InfractionType.Ban || command.punishment === InfractionType.Unban
          ? Permissions.BanMembers
          : command.punishment === InfractionType.Mute || command.punishment === InfractionType.Unmute
          ? Permissions.MuteMembers
          : command.punishment === InfractionType.Kick
          ? Permissions.KickMembers
          : Permissions.ModerateMembers,
      options: [
        {
          name:
            command.punishment === InfractionType.Ban || command.punishment === InfractionType.Unban
              ? 'user'
              : 'member',
          description: `The ${
            command.punishment === InfractionType.Ban || command.punishment === InfractionType.Unban ? 'user' : 'member'
          } to ${command.punishment.toLowerCase()}.`,
          type: ApplicationCommandOptionType.User,
          required: true
        }
      ]
    });
  }

  if (changed === 0) return;
  await guild.commands.set(put);

  // update IDs
  for (const cmd of guild.commands.cache.values()) {
    await client.db.shortcut.update({
      where: {
        guildId_name: { guildId, name: cmd.name }
      },
      data: {
        id: cmd.id
      }
    });
  }
}

export async function checkBlacklisted(userId: string) {
  return await client.db.blacklist.findUnique({
    where: { id: userId }
  });
}
