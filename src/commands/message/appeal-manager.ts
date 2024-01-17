import { InfractionType } from '@prisma/client';
import { PermissionFlagsBits, EmbedBuilder, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { mainColor } from '../../lib/util/constants';
import { bin, getMember, getUser } from '../../lib/util/functions';
import { AppealResponse } from '../../types';

@properties<'message'>({
  name: 'appeal-manager',
  description: 'Manage infraction appeals.',
  args: [
    'accept <id> [reason] [--dont-undo]',
    'deny <id> [reason]',
    'view-pending',
    'blacklist add <id>',
    'blacklist remove <id>',
    'blacklist clear',
    'blacklist view'
  ],
  aliases: ['appeals']
})
class AppealManagerCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw "Missing a command option. See this command's help menu to see all options.";
    const command = args[0];

    if (command === 'blacklist') {
      const { appealBlacklist } = (await this.client.db.guild.findUnique({
        where: {
          id: message.guildId
        },
        select: {
          appealBlacklist: true
        }
      }))!;

      switch (args[1]) {
        case 'add': {
          if (args.length < 3) throw 'Missing required argument `user`.';

          const user = await getUser(args[2]);
          if (!user) throw 'Invalid user.';
          if (appealBlacklist.includes(user.id)) throw 'That user is already blacklisted from creating appeals.';

          await this.client.db.guild.update({
            where: {
              id: message.guildId
            },
            data: {
              appealBlacklist: {
                push: user.id
              }
            }
          });

          return message.reply(`Blacklisted **${user.username}** from creating appeals.`);
        }
        case 'remove': {
          if (args.length < 3) throw 'Missing required argument `user`.';

          const user = await getUser(args[2]);
          if (!user) throw 'Invalid user.';

          if (!appealBlacklist.includes(user.id)) throw "That user isn't blacklisted from creating appeals.";

          appealBlacklist.splice(appealBlacklist.indexOf(user.id), 1);

          await this.client.db.guild.update({
            where: {
              id: message.guildId
            },
            data: {
              appealBlacklist
            }
          });
          return message.reply(`**${user.username}** has been removed from the blacklist.`);
        }
        case 'view':
          return message.reply(
            `View the blacklist here: ${await bin(
              `Total blacklists: ${appealBlacklist.length}\n\n${appealBlacklist.join('\n')}`
            )}`
          );
        case 'clear':
          await this.client.db.guild.update({
            where: {
              id: message.guildId
            },
            data: {
              appealBlacklist: []
            }
          });

          return message.reply('Appeal blacklist has been cleared.');
        default:
          throw "Invalid sub-option for option `blacklist`. See this command's help menu to see all options.";
      }
    }

    if (command === 'view-pending') {
      const ids = await this.client.db.appeal.findMany({
        where: {
          guildId: message.guildId
        }
      });

      if (ids.length == 0) return message.reply('There are no pending appeals.');

      if (ids.length > 50) {
        const url = await bin(ids.map(id => `${id.id} - ${id.userId}`).join('\n'));
        return message.reply(`View all infraction ID\'s with a pending appeal: ${url}`);
      }

      return message.reply(
        `Below displays the ID's of all infractions with a pending appeal.\n\`\`\`\n${ids
          .map(id => `${id.id} - ${id.userId}`)
          .join('\n')}\`\`\``
      );
    }

    if (!['view', 'disregard', 'accept', 'deny'].includes(command))
      throw "Invalid option. See this command's help menu to see all options.";

    if (args.length < 2) throw 'Missing required argument `id`.';
    const id = +args[1];
    if (Number.isNaN(id) || !Number.isInteger(id)) throw 'Invalid ID.';

    let dontUndo = false;
    const dontUndoFlag = args.indexOf('--dont-undo');
    if (dontUndoFlag !== -1) {
      dontUndo = true;
      args.splice(dontUndoFlag, 1);
    }

    const reason = args.slice(2).join(' ');

    const infraction = await this.client.db.infraction.findUnique({
      where: {
        id
      },
      include: { appeal: true, guild: { select: { notifyInfractionChange: true } } }
    });

    if (infraction?.guildId !== message.guildId) throw 'No infraction with that ID exists in this guild.';
    if (!infraction.appeal) throw 'That infraction does not have an appeal.';

    const { appeal } = infraction;

    switch (command) {
      case 'view':
        let embedDescription = '';
        embedDescription += `**Infraction ID:** ${appeal.id}\n**Infraction Type:** ${infraction.type.toString()}\n\n`;
        embedDescription += (appeal.response as AppealResponse[])
          .map(field => `Question: ${field.question}\nResponse: ${field.response}`)
          .join('\n\n');

        const user = (await this.client.users.fetch(appeal.userId))!;

        const viewEmbed = new EmbedBuilder()
          .setColor(mainColor)
          .setAuthor({
            name: `Infraction appeal from ${user.username} (${user.id})`,
            iconURL: user.displayAvatarURL()
          })
          .setDescription(embedDescription)
          .setFooter({ text: `Use /case id:${infraction.id} to get context.` })
          .setTimestamp();

        return message.reply({ embeds: [viewEmbed] });
      case 'disregard':
        await this.client.db.appeal.delete({
          where: {
            id
          }
        });

        return message.reply(`Appeal disregarded.`);
      case 'accept':
        if (!dontUndo) {
          switch (infraction.type) {
            case InfractionType.Ban: {
              if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.BanMembers))
                throw "I cannot undo the punishment because I do not have the Ban Members permission. If you don't want to undo the punishment, use the command `/appeal-manager accept` and set the `dont-undo` option to `True`";

              await message.guild.members.unban(infraction.userId, reason).catch(() => {
                throw 'That member is not banned. Use the command `/appeal-manager accept` and set the `dont-undo` option to `True` to accept.';
              });

              await this.client.db.task
                .delete({
                  where: {
                    userId_guildId_type: {
                      guildId: message.guildId,
                      userId: infraction.userId,
                      type: InfractionType.Ban
                    }
                  }
                })
                .catch(() => {});

              break;
            }
            case InfractionType.Mute: {
              if (!message.guild.members.me!.permissions.has(PermissionFlagsBits.ModerateMembers))
                throw "I cannot undo the punishment because I do not have the Moderate Members permission. If you don't want to undo the punishment, use the command `/appeal-manager accept` and set the `dont-undo` option to `True`";

              const member = await getMember(message.guild, infraction.userId);
              if (!member)
                throw 'I could not undo the punishment because the member is not in the guild. Use the command `/appeal-manager accept` and set the `dont-undo` option to `True` to accept.';

              await member.timeout(null, reason);

              await this.client.db.task
                .delete({
                  where: {
                    userId_guildId_type: {
                      guildId: message.guildId,
                      userId: member.id,
                      type: InfractionType.Mute
                    }
                  }
                })
                .catch(() => {});
              break;
            }
          }
        }

        await this.client.db.appeal.delete({
          where: {
            id
          }
        });

        await this.client.db.infraction.delete({
          where: {
            id
          }
        });

        if (dontUndo && infraction.type !== InfractionType.Ban && infraction.type !== InfractionType.Mute)
          throw 'There is no punishment to avoid un-doing.';

        const acceptEmbed = new EmbedBuilder()
          .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
          .setTitle('Appeal Accepted')
          .setColor(Colors.Green)
          .setDescription(
            `**Infraction ID:** \`${infraction.id}\`\n**Infraction punishment:** \`${infraction.type.toString()}\`${
              reason ? `\n${reason}` : ''
            }${dontUndo ? '\n\n***•** The correlated punishment to this appeal was not automatically removed.*' : ''}`
          );

        if (infraction.guild.notifyInfractionChange)
          await this.client.users
            .fetch(appeal.userId)
            .then(user => user.send({ embeds: [acceptEmbed] }))
            .catch(() => {});

        return message.reply('Appeal accepted.');
      case 'deny':
        await this.client.db.appeal.delete({
          where: {
            id
          }
        });

        const denyEmbed = new EmbedBuilder()
          .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
          .setTitle('Appeal Denied')
          .setColor(Colors.Red)
          .setDescription(
            `**Infraction ID:** \`${infraction.id}\`\n**Infraction punishment:** \`${infraction.type.toString()}\`${
              reason ? `\n${reason}` : ''
            }`
          );

        if (infraction.guild.notifyInfractionChange)
          await this.client.users
            .fetch(appeal.userId)
            .then(user => user.send({ embeds: [denyEmbed] }))
            .catch(() => {});

        return message.reply('Appeal denied.');
    }
  }
}

export default AppealManagerCommand;
