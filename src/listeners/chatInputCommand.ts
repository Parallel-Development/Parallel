import Listener from '../lib/structs/Listener';
import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits as Permissions,
  ApplicationCommandOptionType,
  ApplicationCommandDataResolvable
} from 'discord.js';
import { InfractionType } from '@prisma/client';

// imported by messageCommand
export const customCommandsConfirmed = new Set();
export const unresolvedGuilds = new Set<string>();

class ChatInputCommandListener extends Listener {
  constructor() {
    super('chatInputCommand');
  }

  async run(interaction: ChatInputCommandInteraction) {
    const blacklist = await this.checkBlacklisted(interaction.user.id);
    if (blacklist)
      return interaction.reply({
        content: `You may not run any commands because you are banned from Parallel.\nReason: ${blacklist.reason}`,
        ephemeral: true
      });

    const command = this.client.commands.slash.get(interaction.commandName);
    if (!command) return this.client.emit('customSlashCommand', interaction);

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

    if (interaction.inCachedGuild()) await this.confirmGuild(interaction.guildId);

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

      if (!interaction.deferred && !interaction.replied) return interaction.reply({ content: e, ephemeral: true });
      else return interaction.editReply({ content: e as string });
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
}

export default ChatInputCommandListener;
