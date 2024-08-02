import { Message, EmbedBuilder, Colors } from 'discord.js';

import { checkBlacklisted, confirmGuild, unresolvedGuilds } from './chatInputCommand';
import { hasChannelPermission, hasSlashCommandPermission } from '../lib/util/functions';
import client from '../client';
import customMessageCommand from './customMessageCommand';
import { NoChannelPermissionError } from '../lib/util/constants';

export default async function (message: Message) {
  if (message.author.bot || !message.content) return;

  const blacklist = await checkBlacklisted(message.author.id);
  if (blacklist) return;

  let usedPrefix = process.env.PREFIX!;
  let respondIfNoPermission = true;
  if (message.inGuild()) {
    const guild = await confirmGuild(message.guildId);
    const { prefix, messageCommandsEnabled, respondNoPermission } = guild;

    if (!messageCommandsEnabled) return false;
    usedPrefix = prefix;
    respondIfNoPermission = respondNoPermission;
  }

  if (!message.content.startsWith(usedPrefix)) return;
  const args = message.content.slice(usedPrefix.length).split(' ');
  let commandName = args[0].toLowerCase();
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

  if (command.devOnly && message.author.id !== process.env.DEV) return;

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

  // Permission  & channel check
  if (message.inGuild()) {
    if (!(await hasSlashCommandPermission(message.member!, commandName))) {
      if (!respondIfNoPermission) return;

      const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription('You do not have permission to use this command.');

      return message.reply({ embeds: [embed] });
    }

    const channelPermError = await hasChannelPermission(message.member!, message.channel, commandName);
    if (channelPermError !== true) {
      if (!respondIfNoPermission) return;

      let description = '';

      switch (channelPermError) {
        case NoChannelPermissionError.Server:
          description = 'You do not have permission to run commands in this server.';
          break;
        case NoChannelPermissionError.Channel:
          description = 'You do not have permission to run commands in this channel.';
          break;
        case NoChannelPermissionError.AllCommands:
          description = 'You do not have permission to run Parallel commands in this channel.';
          break;
        case NoChannelPermissionError.OneCommand:
          description = 'You do not have permission to run that command in this channel.';
          break;
      }

      const embed = new EmbedBuilder().setColor(Colors.Red).setDescription(description);

      return message.reply({ embeds: [embed] });
    }
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
