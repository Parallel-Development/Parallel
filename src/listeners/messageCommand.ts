import Listener from '../lib/structs/Listener';
import {
  PermissionFlagsBits as Permissions,
  ApplicationCommandOptionType,
  ApplicationCommandDataResolvable,
  Message,
  ApplicationCommandPermissionType,
  Collection,
  ApplicationCommandPermissions
} from 'discord.js';
import { InfractionType } from '@prisma/client';
const customCommandsConfirmed = new Set();
const unresolvedGuilds = new Set<string>();
export const commandsPermissionCache: Map<string, Collection<string, ApplicationCommandPermissions[]>> = new Map();

class MessageCommandListener extends Listener {
  constructor() {
    super('messageCommand');
  }

  async run(message: Message) {
    if (message.author.bot || !message.content) return;

    const blacklist = await this.checkBlacklisted(message.author.id);
    if (blacklist) return;

    let usedPrefix = process.env.PREFIX!;
    let respondIfNoPermission = true;
    if (message.inGuild()) {
      await this.confirmGuild(message.guildId);
      const {
        prefix,
        messageCommandsEnabled,
        respondNoPermission
      }: { prefix: string; messageCommandsEnabled: boolean; respondNoPermission: boolean } =
        (await this.client.db.guild.findUnique({
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
      this.client.commands.message.get(commandName) ||
      this.client.commands.message.get(this.client.aliases.get(commandName) as string);

    if (!command) {
      if (!message.inGuild()) return;
      return this.client.emit('customMessageCommand', message, args, commandName, respondIfNoPermission);
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
    if (message.inGuild()) {
      const slashCommand =
        this.client.application?.commands.cache.find(cmd => cmd.name === commandName) ||
        (await this.client.application!.commands.fetch().then(cmds => cmds.find(cmd => cmd.name === commandName)))!;

      if (slashCommand) {
        const permissions = await this.fetchCommandPermissions(slashCommand.id, message.guildId!);

        const hasDefault = message.member!.permissions?.has(slashCommand.defaultMemberPermissions ?? 0n);
        const allowed = permissions?.filter(
          permission =>
            permission.permission === true &&
            (permission.id === message.author.id || message.member!.roles.cache.some(r => permission.id === r.id))
        );
        const denied = permissions?.filter(
          permission =>
            permission.permission === false &&
            (permission.id === message.author.id || message.member!.roles.cache.some(r => permission.id === r.id))
        );

        if (denied?.some(deny => deny.type === ApplicationCommandPermissionType.User)) {
          if (respondIfNoPermission) message.reply("You don't have permission to use that command.");
          return false;
        }

        if (!allowed?.length && !(denied?.length && hasDefault)) {
          if (
            !message.member!.roles.cache.some(
              r =>
                r.permissions.has(slashCommand.defaultMemberPermissions || 0n) &&
                !denied?.some(role => role.id === r.id)
            )
          ) {
            if (respondIfNoPermission) message.reply("You don't have permission to use that command.");
            return false;
          }
        }
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

      return message.reply(e);
    }
  }

  private async confirmGuild(guildId: string) {
    if (!customCommandsConfirmed.has(guildId)) {
      this.checkShortcuts(guildId);
      customCommandsConfirmed.add(guildId);
    }

    const guild = await this.client.db.guild.findUnique({
      where: {
        id: guildId
      }
    });

    if (guild) return true;

    await this.client.db.guild.create({
      data: {
        id: guildId
      }
    });

    return true;
  }

  private async checkShortcuts(guildId: string) {
    const customCommands = await this.client.db.shortcut.findMany({
      where: {
        guildId: guildId
      }
    });

    const guild = this.client.guilds.cache.get(guildId)!;

    const put: ApplicationCommandDataResolvable[] = [];
    let changed = 0;
    for (const command of customCommands) {
      const sCommand = guild.commands.cache.find(cmd => cmd.name === command.name);
      if (sCommand) {
        put.push(sCommand as ApplicationCommandDataResolvable);
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
              command.punishment === InfractionType.Ban || command.punishment === InfractionType.Unban
                ? 'user'
                : 'member'
            } to ${command.punishment}.`,
            type: ApplicationCommandOptionType.User
          }
        ]
      });
    }

    if (changed === 0) return;
    await guild.commands.set(put);
  }

  private async checkBlacklisted(userId: string) {
    return await this.client.db.blacklist.findUnique({
      where: { id: userId }
    });
  }

  private async fetchCommandPermissions(commandId: string, guildId: string) {
    const cachePermissions = commandsPermissionCache.get(guildId);
    if (cachePermissions) return cachePermissions.get(commandId);

    const permissions = await this.client.application!.commands.permissions.fetch({ guild: guildId });
    commandsPermissionCache.set(guildId, permissions);

    return permissions.get(commandId);
  }
}

export default MessageCommandListener;
