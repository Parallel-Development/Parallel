import { Message, Collection, ApplicationCommandPermissions, EmbedBuilder, Colors } from 'discord.js';

import { checkBlacklisted, checkShortcuts, customCommandsConfirmed, unresolvedGuilds } from './chatInputCommand';
import { hasSlashCommandPermission } from '../lib/util/functions';
import client from '../client';
import customMessageCommand from './customMessageCommand';

export const commandsPermissionCache = new Map<string, Collection<string, readonly ApplicationCommandPermissions[]>>();

export default async function (message: Message) {
  if (message.author.bot || !message.content) return;

  const blacklist = await checkBlacklisted(message.author.id);
  if (blacklist) return;

  let usedPrefix = process.env.PREFIX!;
  let respondIfNoPermission = true;
  if (message.inGuild()) {
    await confirmGuild(message.guildId);
    const {
      prefix,
      messageCommandsEnabled,
      respondNoPermission
    }: { prefix: string; messageCommandsEnabled: boolean; respondNoPermission: boolean } =
      (await client.db.guild.findUnique({
        where: { id: message.guildId },
        select: { prefix: true, messageCommandsEnabled: true, respondNoPermission: true }
      }))!;

    if (!messageCommandsEnabled) return false;
    usedPrefix = prefix;
    respondIfNoPermission = respondNoPermission;
  }

  if (!message.content.startsWith(usedPrefix)) return;
  const args = message.content.slice(usedPrefix.length).split(' ');
  let commandName = args[0];
  args.shift();

  const command =
    client.commands.message.get(commandName) || client.commands.message.get(client.aliases.get(commandName) as string);

  if (!command) {
    if (!message.inGuild()) return;

    try {
      await customMessageCommand(message, args, commandName, respondIfNoPermission);
    } catch (e) {
      if (typeof e !== 'string') {
        console.error(e);
        return;
      }

      const embed = new EmbedBuilder().setColor(Colors.Red).setDescription(e);

      return message.reply({ embeds: [embed] });
    }

    return;
  }

  commandName = command.name;

  if (!message.inGuild() && !command.allowDM) return message.reply('That command must be ran in a guild.');

  if (command.clientPermissions) {
    if (!message.guild!.members.me!.permissions.has(command.clientPermissions))
      return message.reply(
        `I don\'t have the required permissions to complete this command.\nMissing: \`${command.clientPermissions
          .toArray()
          .join('`, `')
          .replaceAll(/[a-z][A-Z]/g, m => `${m[0]} ${m[1]}`)}\``
      );
  }

  // Permission check
  if (message.inGuild() && !(await hasSlashCommandPermission(message.member!, commandName))) {
    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setDescription('You do not have permission to use this command.');

    return message.reply({ embeds: [embed] });
  }

  if (command.guildResolve) {
    if (unresolvedGuilds.has(`${message.guildId!} ${commandName}`))
      return message.reply(
        'Another process of this command is currently running. Please wait for it to finish before running this command.'
      );

    unresolvedGuilds.add(`${message.guildId!} ${commandName}`);
  }

  try {
    await command.run(message, args);

    if (command.guildResolve) unresolvedGuilds.delete(`${message.guildId!} ${commandName}`);
  } catch (e) {
    if (command.guildResolve) unresolvedGuilds.delete(`${message.guildId!} ${commandName}`);

    if (typeof e !== 'string') {
      console.error(e);
      return;
    }

    const embed = new EmbedBuilder().setColor(Colors.Red).setDescription(e);

    return message.reply({ embeds: [embed] });
  }
}

async function confirmGuild(guildId: string) {
  if (!customCommandsConfirmed.has(guildId)) {
    checkShortcuts(guildId);
    customCommandsConfirmed.add(guildId);
  }

  const guild = await client.db.guild.findUnique({
    where: {
      id: guildId
    }
  });

  if (guild) return true;

  await client.db.guild.create({
    data: {
      id: guildId
    }
  });

  return true;
}
