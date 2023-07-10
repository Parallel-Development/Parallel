import { InfractionType } from '@prisma/client';
import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  TextChannel
} from 'discord.js';
import ms from 'ms';
import Command, { data } from '../lib/structs/Command';
import { AutoModSpamTriggers } from '../types';

@data(
  new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Manage the automod configuration.')
    .setDefaultMemberPermissions(Permissions.ManageGuild)
    .addSubcommand(cmd => cmd.setName('view').setDescription('View the automod settings.'))
    .addSubcommandGroup(group =>
      group
        .setName('spam')
        .setDescription('Manage the spam automod.')
        .addSubcommand(cmd =>
          cmd
            .setName('enable')
            .setDescription('Enable the spam automod.')
            .addBooleanOption(opt => opt.setName('value').setDescription('Toggle for this setting.').setRequired(true))
        )
        .addSubcommand(cmd =>
          cmd
            .setName('triggers-add')
            .setDescription('Add a trigger to trigger the spam automod.')
            .addIntegerOption(opt =>
              opt
                .setName('amount')
                .setDescription('How many messages need to be sent in `in` seconds to trigger the automod?')
                .setMinValue(1)
                .setMaxValue(20)
                .setRequired(true)
            )
            .addIntegerOption(opt =>
              opt
                .setName('in')
                .setDescription(
                  'In what time frame (in seconds) do `amount` messages need to be sent to trigger the automod?'
                )
                .setMinValue(1)
                .setMaxValue(60)
                .setRequired(true)
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('triggers-remove')
            .setDescription('Remove a trigger from the list of spam triggers.')
            .addIntegerOption(opt =>
              opt
                .setName('amount')
                .setDescription('How many messages need to be sent in `in` seconds to trigger the automod?')
                .setMinValue(1)
                .setMaxValue(20)
                .setRequired(true)
            )
            .addIntegerOption(opt =>
              opt
                .setName('in')
                .setDescription(
                  'In what time frame (in seconds) do `amount` messages need to be sent to trigger the automod?'
                )
                .setMinValue(1)
                .setMaxValue(60)
                .setRequired(true)
            )
        )
        .addSubcommand(cmd => cmd.setName('triggers-view').setDescription('View all spam triggers.'))
        .addSubcommand(cmd =>
          cmd
            .setName('immune-channels-add')
            .setDescription('Add a channel to the list of immune channels from the spam automod.')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('The channel to add.')
                .setRequired(true)
                .addChannelTypes(
                  ChannelType.GuildText,
                  ChannelType.GuildVoice,
                  ChannelType.PublicThread,
                  ChannelType.PrivateThread
                )
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('immune-channels-remove')
            .setDescription('Remove a channel from the list of immune channels from the spam automod.')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('The channel to remove.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.PublicThread)
            )
        )
        .addSubcommand(cmd =>
          cmd.setName('immune-channels-view').setDescription('View all immune channels from the spam automod.')
        )
        .addSubcommand(cmd =>
          cmd
            .setName('immune-roles-add')
            .setDescription('Add a role to the list of immune roles from the spam automod.')
            .addRoleOption(opt => opt.setName('role').setDescription('The role to add.').setRequired(true))
        )
        .addSubcommand(cmd =>
          cmd
            .setName('immune-roles-remove')
            .setDescription('Remove a role from the list of immune roles from the spam automod.')
            .addRoleOption(opt => opt.setName('role').setDescription('The role to remove.').setRequired(true))
        )
        .addSubcommand(cmd =>
          cmd.setName('immune-roles-view').setDescription('View all immune roles from the spam automod.')
        )
        .addSubcommand(cmd =>
          cmd
            .setName('punishment')
            .setDescription('The punishment to issue for spam.')
            .addStringOption(opt =>
              opt
                .setName('punishment')
                .setDescription('The punishment.')
                .addChoices(
                  { name: 'Delete', value: 'delete' },
                  { name: 'Warn', value: InfractionType.Warn },
                  { name: 'Mute', value: InfractionType.Mute },
                  { name: 'Kick', value: InfractionType.Kick },
                  { name: 'Ban', value: InfractionType.Ban }
                )
                .setRequired(true)
            )
            .addStringOption(opt => opt.setName('duration').setDescription('The duration of the punishment.'))
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('malicious-links')
        .setDescription('Manage the malicious links automod.')
        .addSubcommand(cmd =>
          cmd
            .setName('enable')
            .setDescription('Enable the malicious links automod.')
            .addBooleanOption(opt => opt.setName('value').setDescription('Toggle for this setting.').setRequired(true))
        )
        .addSubcommand(cmd =>
          cmd
            .setName('immune-channels-add')
            .setDescription('Add a channel to the list of immune channels from the malicious link automod.')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('The channel to add.')
                .setRequired(true)
                .addChannelTypes(
                  ChannelType.GuildText,
                  ChannelType.GuildVoice,
                  ChannelType.PublicThread,
                  ChannelType.PrivateThread
                )
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('immune-channels-remove')
            .setDescription('Remove a channel from the list of immune channels from the malicious automod.')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('The channel to remove.')
                .setRequired(true)
                .addChannelTypes(
                  ChannelType.GuildText,
                  ChannelType.GuildVoice,
                  ChannelType.PublicThread,
                  ChannelType.PrivateThread
                )
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('immune-channels-view')
            .setDescription('View all immune channels from the malicious links automod.')
        )
        .addSubcommand(cmd =>
          cmd
            .setName('immune-roles-add')
            .setDescription('Add a role to the list of immune roles from the malicious automod.')
            .addRoleOption(opt => opt.setName('role').setDescription('The role to add.').setRequired(true))
        )
        .addSubcommand(cmd =>
          cmd
            .setName('immune-roles-remove')
            .setDescription('Remove a role from the list of immune roles from the malicious automod.')
            .addRoleOption(opt => opt.setName('role').setDescription('The role to remove.').setRequired(true))
        )
        .addSubcommand(cmd =>
          cmd.setName('immune-roles-view').setDescription('View all immune roles from the malicious links automod.')
        )
        .addSubcommand(cmd =>
          cmd
            .setName('punishment')
            .setDescription('The punishment to issue for malicious links.')
            .addStringOption(opt =>
              opt
                .setName('punishment')
                .setDescription('The punishment.')
                .addChoices(
                  { name: 'Delete', value: 'delete' },
                  { name: 'Warn', value: InfractionType.Warn },
                  { name: 'Mute', value: InfractionType.Mute },
                  { name: 'Kick', value: InfractionType.Kick },
                  { name: 'Ban', value: InfractionType.Ban }
                )
                .setRequired(true)
            )
            .addStringOption(opt => opt.setName('duration').setDescription('The duration of the punishment.'))
        )
    )
)
class AutomodCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const group = interaction.options.getSubcommandGroup();
    const subCmd = interaction.options.getSubcommand();

    if (subCmd === 'view') {
      const {
        autoModSpamToggle,
        autoModSpamPunishment,
        autoModSpamDuration,
        autoModMaliciousToggle,
        autoModMaliciousPunishment,
        autoModMaliciousDuration
      } = (await this.client.db.guild.findUnique({
        where: { id: interaction.guildId }
      }))!;

      const str = `Spam${!autoModSpamToggle ? ' (Disabled)' : ''}: ${autoModSpamPunishment ?? 'Delete'} ${
        autoModSpamDuration !== 0n ? `for ${ms(Number(autoModSpamDuration), { long: true })}` : ''
      }\nMalicious Links${!autoModMaliciousToggle ? ' (Disabled)' : ''}: ${autoModMaliciousPunishment ?? 'Delete'} ${
        autoModMaliciousDuration !== 0n ? `for ${ms(Number(autoModMaliciousDuration), { long: true })}` : ''
      }`;

      return interaction.reply(`\`\`\`\n${str}\`\`\``);
    }

    switch (group) {
      case 'spam':
        switch (subCmd) {
          case 'enable': {
            const value = interaction.options.getBoolean('value', true);

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data: {
                autoModSpamToggle: value
              }
            });

            return interaction.reply(`Spam automod has been ${value ? 'enabled' : 'disabled'}.`);
          }
          case 'punishment': {
            const punishment = interaction.options.getString('punishment', true) as InfractionType | 'delete';
            const uDuration = interaction.options.getString('duration');
            if (punishment === InfractionType.Mute && !uDuration) throw 'A duration is required for punishment `Mute`.';
            if (uDuration && ['delete', InfractionType.Kick].includes(punishment))
              throw 'A duration cannot be provided for this punishment.';

            const duration = uDuration ? ms(uDuration) : null;
            if (duration === undefined) throw 'Invalid duration.';
            if (duration === 0 && punishment === InfractionType.Mute) throw 'The duration must be at least 1 second.';

            if (duration && duration < 1000 && duration !== 0) throw 'The duration must be at least 1 second or 0.';

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data: {
                autoModSpamPunishment: punishment === 'delete' ? null : punishment,
                autoModSpamDuration: punishment === 'delete' ? 0n : duration ? BigInt(duration) : 0n
              }
            });

            return interaction.reply(
              `Spam punishment set to \`${punishment.toLowerCase()}${
                duration ? ` for ${ms(duration, { long: true })}` : ''
              }\`.`
            );
          }
          case 'triggers-add': {
            const amount = interaction.options.getInteger('amount', true);
            const within = interaction.options.getInteger('in', true);
            const trigger = { amount, within };

            const { autoModSpamTriggers } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if ((autoModSpamTriggers as AutoModSpamTriggers).some(trig => trig.amount === amount))
              throw 'There is already a trigger with that amount.';

            if (autoModSpamTriggers.length >= 5) throw 'You cannot set more than 5 triggers.';

            await interaction.deferReply();

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModSpamTriggers: { push: trigger } }
            });

            return interaction.editReply('Trigger added.');
          }
          case 'triggers-remove': {
            const amount = interaction.options.getInteger('amount', true);
            const within = interaction.options.getInteger('in', true);
            const trigger = { amount, within };
            const { autoModSpamTriggers } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (!(autoModSpamTriggers as AutoModSpamTriggers).some(trig => trig.amount === amount))
              throw 'There is no trigger with that amount.';

            await interaction.deferReply();

            const object = (autoModSpamTriggers as AutoModSpamTriggers).find(
              trig => trig.amount == amount && trig.within == within
            )!;
            const index = autoModSpamTriggers.indexOf(object);
            autoModSpamTriggers.splice(index, 1);

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModSpamTriggers }
            });

            return interaction.editReply('Trigger removed.');
          }
          case 'triggers-view': {
            const { autoModSpamTriggers } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (autoModSpamTriggers.length === 0) return interaction.reply('No triggers set.');

            const spamTriggersStr = (autoModSpamTriggers as AutoModSpamTriggers)
              .map(trig => `${trig.amount} messages in ${trig.within} seconds`)
              .join('\n');
            return interaction.reply(`\`\`\`\n${spamTriggersStr}\`\`\``);
          }
          case 'immune-channels-add': {
            const channel = interaction.options.getChannel('channel', true) as TextChannel;

            const { autoModSpamImmuneChannels } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (autoModSpamImmuneChannels.includes(channel.id))
              throw 'This channel is already on the list of immune channels.';

            await interaction.deferReply();

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModSpamImmuneChannels: { push: channel.id } }
            });

            return interaction.editReply(`${channel.toString()} added to immune channels.`);
          }
          case 'immune-channels-remove': {
            const channel = interaction.options.getChannel('channel', true) as TextChannel;

            const { autoModSpamImmuneChannels } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (!autoModSpamImmuneChannels.includes(channel.id))
              throw 'This channel is not on the list of immune channels.';

            autoModSpamImmuneChannels.splice(autoModSpamImmuneChannels.indexOf(channel.id), 1);

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModSpamImmuneChannels }
            });

            return interaction.reply(`${channel.toString()} removed from immune channels.`);
          }
          case 'immune-channels-view': {
            const { autoModSpamImmuneChannels } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (autoModSpamImmuneChannels.length === 0) return interaction.reply('No immune channels set.');

            const immuneChannelsStr = autoModSpamImmuneChannels.map(c => `<#${c}>`).join(', ');
            return interaction.reply(immuneChannelsStr);
          }
          case 'immune-roles-add': {
            const role = interaction.options.getRole('role', true);

            const { autoModSpamImmuneRoles } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (autoModSpamImmuneRoles.includes(role.id)) throw 'This role is already on the list of immune roles.';

            await interaction.deferReply();

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModSpamImmuneRoles: { push: role.id } }
            });

            return interaction.editReply(`${role.toString()} added to immune roles.`);
          }
          case 'immune-roles-remove': {
            const role = interaction.options.getRole('role', true);

            const { autoModSpamImmuneRoles } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (!autoModSpamImmuneRoles.includes(role.id))
              throw 'This role is not on the list on the list of immune roles.';

            autoModSpamImmuneRoles.splice(autoModSpamImmuneRoles.indexOf(role.id), 1);

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModSpamImmuneRoles }
            });

            return interaction.reply(`${role.toString()} removed from immune roles.`);
          }
          case 'immune-roles-view': {
            const { autoModSpamImmuneRoles } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (autoModSpamImmuneRoles.length === 0) return interaction.reply('No immune roles set.');

            const immuneRolesStr = autoModSpamImmuneRoles.map(c => `<@&${c}>`).join(', ');
            return interaction.reply(immuneRolesStr);
          }
        }
        break;
      case 'malicious-links':
        switch (subCmd) {
          case 'enable': {
            const value = interaction.options.getBoolean('value', true);

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data: {
                autoModMaliciousToggle: value
              }
            });

            return interaction.reply(`Malicious links automod has been ${value ? 'enabled' : 'disabled'}.`);
          }
          case 'punishment': {
            const punishment = interaction.options.getString('punishment', true) as InfractionType | 'delete';
            const uDuration = interaction.options.getString('duration');
            if (punishment === InfractionType.Mute && !uDuration) throw 'A duration is required for punishment `Mute`.';
            if (uDuration && ['delete', InfractionType.Kick].includes(punishment))
              throw 'A duration cannot be provided for this punishment.';

            const duration = uDuration ? ms(uDuration) : null;
            if (duration === undefined) throw 'Invalid duration.';
            if (duration === 0 && punishment === InfractionType.Mute) throw 'The duration must be at least 1 second.';

            if (duration && duration < 1000 && duration !== 0) throw 'The duration must be at least 1 second or 0.';

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data: {
                autoModMaliciousPunishment: punishment === 'delete' ? null : punishment,
                autoModMaliciousDuration: punishment === 'delete' ? 0n : duration ? BigInt(duration) : 0n
              }
            });

            return interaction.reply(
              `Malicious links punishment set to \`${punishment.toLowerCase()}${
                duration ? ` for ${ms(duration, { long: true })}` : ''
              }\`.`
            );
          }
          case 'immune-channels-add': {
            const channel = interaction.options.getChannel('channel', true) as TextChannel;

            const { autoModMaliciousImmuneChannels } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (autoModMaliciousImmuneChannels.includes(channel.id))
              throw 'This channel is already on the list of immune channels.';

            await interaction.deferReply();

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModMaliciousImmuneChannels: { push: channel.id } }
            });

            return interaction.editReply(`${channel.toString()} added to immune channels.`);
          }
          case 'immune-channels-remove': {
            const channel = interaction.options.getChannel('channel', true) as TextChannel;

            const { autoModMaliciousImmuneChannels } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (!autoModMaliciousImmuneChannels.includes(channel.id))
              throw 'This channel is not on the list of immune channels.';

            autoModMaliciousImmuneChannels.splice(autoModMaliciousImmuneChannels.indexOf(channel.id), 1);

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModMaliciousImmuneChannels }
            });

            return interaction.reply(`${channel.toString()} removed from immune channels.`);
          }
          case 'immune-channels-view': {
            const { autoModMaliciousImmuneChannels } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (autoModMaliciousImmuneChannels.length === 0) return interaction.reply('No immune channels set.');

            const immuneChannelsStr = autoModMaliciousImmuneChannels.map(c => `<#${c}>`).join(', ');
            return interaction.reply(immuneChannelsStr);
          }
          case 'immune-roles-add': {
            const role = interaction.options.getRole('role', true);

            const { autoModMaliciousImmuneRoles } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (autoModMaliciousImmuneRoles.includes(role.id))
              throw 'This role is already on the list of immune roles.';

            await interaction.deferReply();

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModMaliciousImmuneRoles: { push: role.id } }
            });

            return interaction.editReply(`${role.toString()} added to immune roles.`);
          }
          case 'immune-roles-remove': {
            const role = interaction.options.getRole('role', true);

            const { autoModMaliciousImmuneRoles } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (!autoModMaliciousImmuneRoles.includes(role.id))
              throw 'This role is not on the list on the list of immune roles.';

            autoModMaliciousImmuneRoles.splice(autoModMaliciousImmuneRoles.indexOf(role.id), 1);

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { autoModMaliciousImmuneRoles }
            });

            return interaction.reply(`${role.toString()} removed from immune roles.`);
          }
          case 'immune-roles-view': {
            const { autoModMaliciousImmuneRoles } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (autoModMaliciousImmuneRoles.length === 0) return interaction.reply('No immune roles set.');

            const immuneRolesStr = autoModMaliciousImmuneRoles.map(c => `<@&${c}>`).join(', ');
            return interaction.reply(immuneRolesStr);
          }
        }
    }
  }
}
export default AutomodCommand;
