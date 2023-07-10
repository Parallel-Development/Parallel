import { AppealMethod, InfractionType } from '@prisma/client';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits as Permissions,
  PermissionsBitField,
  ChannelType,
  TextChannel
} from 'discord.js';
import ms from 'ms';
import Command, { data } from '../lib/structs/Command';
import { urlReg } from '../lib/util/constants';
import { bin } from '../lib/util/functions';
import { Escalations } from '../types';
import yaml from 'js-yaml';

@data(
  new SlashCommandBuilder()
    .setName('config')
    .setDescription('Manage the guild configuration.')
    .setDefaultMemberPermissions(Permissions.ManageGuild)
    .addSubcommand(cmd =>
      cmd
        .setName('infraction-moderator-public')
        .setDescription('Users can see who issued an infraction against them.')
        .addBooleanOption(opt => opt.setName('value').setDescription('Toggle for this setting.').setRequired(true))
    )
    .addSubcommand(cmd =>
      cmd
        .setName('notify-infraction-changes')
        .setDescription('Notify users when an infraction is deleted or the reason or duration is changed.')
        .addBooleanOption(opt => opt.setName('value').setDescription('Toggle for this setting.').setRequired(true))
    )
    .addSubcommandGroup(group =>
      group
        .setName('appeals')
        .setDescription('Manage appeal settings.')
        .addSubcommand(cmd =>
          cmd
            .setName('allow')
            .setDescription('Allow users to appeal infractions.')
            .addBooleanOption(opt => opt.setName('value').setDescription('Toggle for this setting.').setRequired(true))
        )
        .addSubcommand(cmd =>
          cmd
            .setName('alert-channel')
            .setDescription('New appeals will be logged in this channel.')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('The channel to send alerts to.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('method')
            .setDescription('Choose how users may appeal infractions.')
            .addStringOption(opt =>
              opt
                .setName('method')
                .setDescription('How users can appeal infractions.')
                .addChoices(
                  { name: 'Bot', value: AppealMethod.Modal },
                  { name: 'External Link', value: AppealMethod.Link }
                )
                .setRequired(true)
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('link')
            .setDescription(
              'The link to redirect users to appeal an infraction if `appeal-method` is set to `External Link`.'
            )
            .addStringOption(opt =>
              opt.setName('link').setDescription('The link to redirect users to.').setRequired(true)
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('add-question')
            .setDescription('Add a question to the list of appeal questions.')
            .addStringOption(opt =>
              opt.setName('question').setDescription('The question to add.').setMaxLength(45).setRequired(true)
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('remove-question')
            .setDescription('Remove a question from the list of appeal questions')
            .addIntegerOption(option =>
              option
                .setName('question-index')
                .setDescription('The index of the question. To get it, use `/config appeal-questions view`.')
                .setMinValue(1)
                .setMaxValue(4)
                .setRequired(true)
            )
        )
        .addSubcommand(cmd => cmd.setName('view-questions').setDescription('View all current appeal questions.'))
        .addSubcommand(cmd =>
          cmd
            .setName('disregard-after')
            .setDescription('Manage how long an appeal has to go unanswered before being automatically disregarded.')
            .addStringOption(opt => opt.setName('duration').setDescription('The duration to wait.').setRequired(true))
        )
    )
    .addSubcommand(cmd =>
      cmd
        .setName('mod-log-channel')
        .setDescription('Log moderator actions in a designated channel.')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('The channel to send moderator logs to.')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(cmd =>
      cmd
        .setName('additional-punishment-info')
        .setDescription(
          'Add information to punishment DM sent to users upon getting an infraction. Use `none` to disable.'
        )
        .addStringOption(opt =>
          opt
            .setName('punishment')
            .setDescription('The punishment to modify the additional information of.')
            .addChoices(
              { name: 'Warn', value: InfractionType.Warn },
              { name: 'Mute', value: InfractionType.Mute },
              { name: 'Kick', value: InfractionType.Kick },
              { name: 'Ban', value: InfractionType.Ban }
            )
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('info').setDescription('The additional information.').setMaxLength(500).setRequired(true)
        )
    )
    .addSubcommand(cmd =>
      cmd
        .setName('default-punishment-duration')
        .setDescription('Set a default duration for punishments if one is not provided.')
        .addStringOption(opt =>
          opt
            .setName('punishment')
            .setDescription('The punishment to set a default duration for.')
            .addChoices(
              { name: 'Warn', value: InfractionType.Warn },
              { name: 'Mute', value: InfractionType.Mute },
              { name: 'Ban', value: InfractionType.Ban }
            )
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('duration').setDescription('The default duration. Use `0` to disable.').setRequired(true)
        )
    )
    .addSubcommand(cmd => cmd.setName('view').setDescription('View all configurations.'))
    .addSubcommandGroup(group =>
      group
        .setName('escalations')
        .setDescription('Escalations allow you to punish members for reaching an amount of infractions.')
        .addSubcommand(cmd =>
          cmd
            .setName('add')
            .setDescription('Add an escalation to the list of escalations.')
            .addIntegerOption(opt =>
              opt
                .setName('amount')
                .setDescription('How many infractions the member has to accumulate before being punished.')
                .setMinValue(2)
                .setRequired(true)
            )
            .addStringOption(opt =>
              opt
                .setName('punishment')
                .setDescription('The punishment to give for reaching `amount` infractions.')
                .addChoices(
                  { name: 'Mute', value: InfractionType.Mute },
                  { name: 'Kick', value: InfractionType.Kick },
                  { name: 'Ban', value: InfractionType.Ban }
                )
                .setRequired(true)
            )
            .addStringOption(opt => opt.setName('duration').setDescription('The duration of the punishment'))
        )
        .addSubcommand(cmd =>
          cmd
            .setName('remove')
            .setDescription('Remove an escalation from the list of escalations.')
            .addIntegerOption(opt =>
              opt
                .setName('amount')
                .setDescription('How many infractions the member has to accumulate before being punished.')
                .setMinValue(2)
                .setRequired(true)
            )
        )
        .addSubcommand(cmd => cmd.setName('view').setDescription('View all escalations.'))
    )
    .addSubcommandGroup(group =>
      group
        .setName('lock')
        .setDescription('Manage the behavior of the lock commands.')
        .addSubcommand(cmd =>
          cmd
            .setName('add-channel')
            .setDescription('Add a channel to be locked when using the `lockserver` command.')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('The channel to add.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum)
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('remove-channel')
            .setDescription('Remove a channel from be locked when using the `lockserver` command.')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('The channel to remove.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum)
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('view-channels')
            .setDescription('View the list of channels set to be locked when using the `lockserver` command.')
        )
        .addSubcommand(cmd =>
          cmd
            .setName('add-override')
            .setDescription('Add an override to be updated when a channel is locked.')
            .addStringOption(opt =>
              opt.setName('override').setDescription('The name of the override.').setRequired(true)
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('remove-override')
            .setDescription('Remove an override to be updated when a channel is locked.')
            .addStringOption(opt =>
              opt.setName('override').setDescription('The name of the override.').setRequired(true)
            )
        )
        .addSubcommand(cmd =>
          cmd.setName('view-overrides').setDescription('View all overrides set to be updated when a channel is locked.')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('message-logging')
        .setDescription('Manage the message logging settings.')
        .addSubcommand(cmd =>
          cmd
            .setName('channel')
            .setDescription('Set the channel to send message logs.')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('The channel to log message changes.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand(cmd =>
          cmd
            .setName('ignored-channels-add')
            .setDescription('Add a channel to the list of ignored channels from the message logger')
            .addChannelOption(opt => opt.setName('channel').setDescription('The channel to add.').setRequired(true))
        )
        .addSubcommand(cmd =>
          cmd
            .setName('ignored-channels-remove')
            .setDescription('Remove a channel from the list of ignored channels from the message logger')
            .addChannelOption(opt => opt.setName('channel').setDescription('The channel to remove.').setRequired(true))
        )
        .addSubcommand(cmd =>
          cmd.setName('ignored-channels-view').setDescription('View all ignored channels from the message logger.')
        )
    )
)
class ConfigCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const group = interaction.options.getSubcommandGroup();
    const subCmd = interaction.options.getSubcommand();

    switch (group) {
      case 'appeals':
        switch (subCmd) {
          case 'allow': {
            // allow appeal logic
            const value = interaction.options.getBoolean('value', true);
            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data: {
                appealAllowed: value
              }
            });

            return interaction.reply(
              value
                ? 'Users may now create appeals for infractions.'
                : 'Users may no longer create appeals for infractions.'
            );
          }
          case 'alert-channel': {
            if (!interaction.guild.members.me!.permissions.has(Permissions.ManageWebhooks))
              throw 'I need permission to manage webhooks.';

            const channel = interaction.options.getChannel('channel', true) as TextChannel;
            await interaction.deferReply();
            const { appealAlertWebhookId } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            const webhooks = await interaction.guild.fetchWebhooks();
            const webhook = webhooks.find(wh => wh.id === appealAlertWebhookId);

            if (webhook) {
              if (webhook.channel!.id === channel.id) throw 'Alert channel is already set to that channel.';

              await webhook
                .edit({
                  channel: channel.id
                })
                .catch(() => {
                  throw 'Failed to change alert channel likely due to permissions.';
                });

              return interaction.editReply(`Alert channel set to ${channel.toString()}.`);
            } else {
              const newWebhook = await channel.createWebhook({
                name: 'Appeal Alerts',
                avatar: this.client.user!.displayAvatarURL()
              });

              await this.client.db.guild
                .update({
                  where: {
                    id: interaction.guildId
                  },
                  data: {
                    appealAlertWebhookId: newWebhook.id
                  }
                })
                .catch(() => {
                  throw 'Failed to set an alert channel likely due to permissions.';
                });

              return interaction.editReply(`Alert channel set to ${channel.toString()}.`);
            }
          }
          case 'method': {
            const appealMethod = interaction.options.getString('method', true) as AppealMethod;

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data: {
                appealMethod
              }
            });

            return interaction.reply(
              `The appeal method has been set to: \`${appealMethod === AppealMethod.Modal ? 'Bot' : 'External Link'}\`.`
            );
          }
          case 'link': {
            const appealLink = interaction.options.getString('link', true);
            if (!urlReg.test(appealLink)) throw 'Invalid link.';

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data: {
                appealLink
              }
            });

            return interaction.reply(`The appeal link has been set to <${appealLink}>`);
          }
          case 'add-question': {
            const { appealModalQuestions } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (appealModalQuestions.length >= 5) throw 'You cannot have more than four questions.';
            const question = interaction.options.getString('question', true);

            await interaction.deferReply();

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { appealModalQuestions: { push: question } }
            });

            return interaction.editReply('Question added.');
          }
          case 'remove-question': {
            const { appealModalQuestions } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            const index = interaction.options.getInteger('question-index', true);
            if (index > appealModalQuestions.length) throw `There is no index \`${index}\`.`;

            await interaction.deferReply();

            appealModalQuestions.splice(index - 1, 1);

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { appealModalQuestions }
            });

            return interaction.editReply('Question removed.');
          }
          case 'view-questions': {
            const { appealModalQuestions } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (appealModalQuestions.length === 0) throw 'There are no appeal questions.';

            const stringQuestions = appealModalQuestions.map((value, index) => `${index + 1}. ${value}`).join('\n\n');

            return interaction.reply(`\`\`\`\n${stringQuestions}\`\`\``);
          }
          case 'disregard-after': {
            const uDuration = interaction.options.getString('duration', true);
            const duration = ms(uDuration);

            if (duration === undefined) throw 'Invalid duration.';
            if (duration < 60000 && duration !== 0) throw 'Duration must be at least 1 hour.';

            const strDuration = ms(duration, { long: true });

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: { appealDisregardAfter: duration }
            });

            return interaction.reply(
              duration === 0
                ? 'Appeals will now no longer automatically disregard.'
                : `Appeals will now be automatically disregarded if they are not acknowledged before \`${strDuration}\`.`
            );
          }
        }
      case 'escalations':
        switch (subCmd) {
          case 'add': {
            const amount = interaction.options.getInteger('amount', true);
            const punishment = interaction.options.getString('punishment', true) as InfractionType;
            const uDuration = interaction.options.getString('duration');
            const duration = uDuration ? ms(uDuration) : null;
            if (duration === undefined) throw 'Invalid duration.';

            const { escalations } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if ((escalations as Escalations).some(e => e.amount === amount))
              throw 'There is already an escalation for this amount.';

            await interaction.deferReply();

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: {
                escalations: { push: { amount, duration: duration ?? '0', punishment } }
              }
            });

            return interaction.editReply(`Escalation added.`);
          }
          case 'remove': {
            const amount = interaction.options.getInteger('amount', true);

            const { escalations } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            const escalation = (escalations as Escalations).find(e => e.amount === amount);
            if (!escalation) throw 'There is no escalation for this amount.';

            await interaction.deferReply();

            escalations.splice(escalations.indexOf(escalation), 1);

            await this.client.db.guild.update({
              where: { id: interaction.guildId },
              data: {
                escalations
              }
            });

            return interaction.editReply(`Escalation removed.`);
          }
          case 'view': {
            const { escalations } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (escalations.length === 0) return interaction.reply('This guild has no escalations set up.');

            const escalationsStr = (escalations as Escalations)
              .sort((a, b) => a.amount - b.amount)
              .map(
                e =>
                  `${e.amount} = ${e.punishment} ${
                    e.duration !== '0' ? `for ${ms(Number(e.duration), { long: true })}` : ''
                  }`
              )
              .join('\n');
            return interaction.reply(`\`\`\`\n${escalationsStr}\`\`\``);
          }
        }

      case 'lock':
        switch (subCmd) {
          case 'add-channel': {
            const channel = interaction.options.getChannel('channel', true);
            await interaction.deferReply();

            const { lockChannels } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (lockChannels.includes(channel.id)) throw 'That channel is already on the list of channels to lock.';

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data: {
                lockChannels: { push: channel.id }
              }
            });

            return interaction.editReply('Channel added.');
          }
          case 'remove-channel': {
            const channel = interaction.options.getChannel('channel', true);

            const { lockChannels } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            if (!lockChannels.includes(channel.id)) throw 'That channel is not on the list of channels to lock.';

            await interaction.deferReply();

            lockChannels.splice(lockChannels.indexOf(channel.id), 1);

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data: {
                lockChannels
              }
            });

            return interaction.editReply('Channel removed.');
          }
          case 'view-channels': {
            const { lockChannels } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            const fixedLockChannels = lockChannels.filter(c => interaction.guild.channels.cache.get(c));

            const lockChannelsStr = fixedLockChannels.map(c => `<#${c}>`).join(', ');
            if (lockChannelsStr.length == 0) return interaction.reply('You have no channels on the list.');

            if (lockChannelsStr.length <= 2000) return interaction.reply(lockChannelsStr);
            else {
              const url = await bin(fixedLockChannels.join('\n'));
              return interaction.reply(`Too long to upload as a Discord message; view here: ${url}`);
            }
          }
          case 'add-override': {
            const override = interaction.options.getString('override', true);
            const resolvable = override
              .split(' ')
              .map(word => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`)
              .join('')
              .replace('TimeoutMembers', 'ModerateMembers')
              .replace('UseVoiceActivity', 'UseVAD')
              .replace('SendText-to-speechMessasges', 'SendTTSMessages');

            if (!Permissions.hasOwnProperty(resolvable)) throw 'Invalid permission.';

            const permission = Permissions[resolvable as keyof typeof Permissions];

            const { lockOverrides } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (lockOverrides & permission) throw 'That override is already on the list of lock overrides.';

            await interaction.deferReply();

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data: {
                lockOverrides: lockOverrides | permission
              }
            });

            return interaction.editReply('That override will now be set to deny when a channel is locked.');
          }
          case 'remove-override': {
            const override = interaction.options.getString('override', true);
            const resolvable = override
              .split(' ')
              .map(word => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`)
              .join('')
              .replace('TimeoutMembers', 'ModerateMembers')
              .replace('UseVoiceActivity', 'UseVAD')
              .replace('SendText-to-speechMessasges', 'SendTTSMessages');

            if (!Permissions.hasOwnProperty(resolvable)) throw 'Invalid permission.';

            const permission = Permissions[resolvable as keyof typeof Permissions];

            const { lockOverrides } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if ((lockOverrides & permission) === 0n) throw 'That override is not on the list of lock overrides.';

            await interaction.deferReply();

            await this.client.db.guild.update({
              where: {
                id: interaction.guildId
              },
              data: {
                lockOverrides: lockOverrides ^ permission
              }
            });

            return interaction.editReply('Override removed.');
          }
          case 'view-overrides': {
            const { lockOverrides } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            const lockOverridesArray = new PermissionsBitField(lockOverrides)
              .toArray()
              .join('\n')
              .replace(/[a-z][A-Z]/g, replacer => `${replacer[0]} ${replacer[1]}`);

            return interaction.reply(`\`\`\`\n${lockOverridesArray}\`\`\``);
          }
        }
      case 'message-logging': {
        switch (subCmd) {
          case 'channel': {
            if (!interaction.guild.members.me!.permissions.has(Permissions.ManageWebhooks))
              throw 'I need permission to manage webhooks.';

            const channel = interaction.options.getChannel('channel', true) as TextChannel;
            await interaction.deferReply();
            const { messageLogWebhookId } = (await this.client.db.guild.findUnique({
              where: { id: interaction.guildId }
            }))!;

            const webhooks = await interaction.guild.fetchWebhooks();
            const webhook = webhooks.find(wh => wh.id === messageLogWebhookId);

            if (webhook) {
              if (webhook.channel!.id === channel.id) throw 'Message log channel is already set to that channel.';

              await webhook
                .edit({
                  channel: channel.id
                })
                .catch(() => {
                  throw 'Failed to change alert channel likely due to permissions.';
                });
            } else {
              const newWebhook = await channel.createWebhook({
                name: 'Message Logger',
                avatar: this.client.user!.displayAvatarURL()
              });

              await this.client.db.guild
                .update({
                  where: {
                    id: interaction.guildId
                  },
                  data: {
                    messageLogWebhookId: newWebhook.id
                  }
                })
                .catch(() => {
                  throw 'Failed to set alert channel likely due to permissions.';
                });
            }

            return interaction.editReply(`Message log channel set to ${channel.toString()}.`);
          }
          case 'ignored-channels-add': {
            const channel = interaction.options.getChannel('channel', true);

            const { messageLogIgnoredChannels } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (messageLogIgnoredChannels.includes(channel.id))
              throw 'That channel is already on the list of ignored channels.';

            await interaction.deferReply();

            await this.client.db.guild.update({
              where: {
                id: interaction.guild.id
              },
              data: {
                messageLogIgnoredChannels: { push: channel.id }
              }
            });

            return interaction.editReply('Channel added to the list of ignored channels.');
          }
          case 'ignored-channels-remove': {
            const channel = interaction.options.getChannel('channel', true);

            const { messageLogIgnoredChannels } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            if (!messageLogIgnoredChannels.includes(channel.id))
              throw 'That channel is not on the list of ignored channels.';

            await interaction.deferReply();

            messageLogIgnoredChannels.splice(messageLogIgnoredChannels.indexOf(channel.id), 1);

            await this.client.db.guild.update({
              where: {
                id: interaction.guild.id
              },
              data: {
                messageLogIgnoredChannels
              }
            });

            return interaction.editReply('Channel removed from the list of ignored channels.');
          }
          case 'ignored-channels-view': {
            const { messageLogIgnoredChannels } = (await this.client.db.guild.findUnique({
              where: {
                id: interaction.guildId
              }
            }))!;

            const fixedChannels = messageLogIgnoredChannels.filter(c => interaction.guild.channels.cache.get(c));

            if (fixedChannels.length === 0) return interaction.reply('There are no channels on the ignored list.');

            const channelsStr = fixedChannels.map(c => `<#${c}>`);

            if (channelsStr.length > 1000)
              return interaction.reply(
                `Too long to upload as a Discord message, view here: ${await bin(channelsStr.join('\n'))}`
              );

            return interaction.reply(channelsStr.join(', '));
          }
        }
      }
    }
    // simple as that

    switch (subCmd) {
      case 'infraction-moderator-public': {
        const value = interaction.options.getBoolean('value', true);
        await this.client.db.guild.update({
          where: {
            id: interaction.guildId
          },
          data: {
            infractionModeratorPublic: value
          }
        });

        return interaction.reply(
          value
            ? 'Users can now see who issued an infraction against them.'
            : 'Users can no longer see who issued an infraction against them.'
        );
      }
      case 'notify-infraction-changes': {
        const value = interaction.options.getBoolean('value', true);
        await this.client.db.guild.update({
          where: {
            id: interaction.guildId
          },
          data: {
            notifyInfractionChange: value
          }
        });

        return interaction.reply(
          value
            ? 'Users will now be notified when an infraction is deleted or the reason or duration is changed.'
            : 'Users will no longer be notified when an infraction is deleted or the reason or duration is changed.'
        );
      }
      case 'mod-log-channel': {
        if (!interaction.guild.members.me!.permissions.has(Permissions.ManageWebhooks))
          throw 'I need permission to manage webhooks.';

        const channel = interaction.options.getChannel('channel', true) as TextChannel;
        await interaction.deferReply();
        const { modLogWebhookId } = (await this.client.db.guild.findUnique({
          where: { id: interaction.guildId }
        }))!;

        const webhooks = await interaction.guild.fetchWebhooks();
        const webhook = webhooks.find(wh => wh.id === modLogWebhookId);

        if (webhook) {
          if (webhook.channel!.id === channel.id) throw 'Mod log channel is already set to that channel.';

          await webhook
            .edit({
              channel: channel.id
            })
            .catch(() => {
              throw 'Failed to change alert channel likely due to permissions.';
            });
        } else {
          const newWebhook = await channel.createWebhook({
            name: 'Mod Logger',
            avatar: this.client.user!.displayAvatarURL()
          });

          await this.client.db.guild
            .update({
              where: {
                id: interaction.guildId
              },
              data: {
                modLogWebhookId: newWebhook.id
              }
            })
            .catch(() => {
              throw 'Failed to set alert channel likely due to permissions.';
            });
        }

        return interaction.editReply(`Mod log channel set to ${channel.toString()}.`);
      }
      case 'additional-punishment-info': {
        let type = interaction.options.getString('punishment', true);
        switch (type) {
          case InfractionType.Ban:
            type = 'infoBan';
            break;
          case InfractionType.Warn:
            type = 'infoWarn';
            break;
          case InfractionType.Mute:
            type = 'infoMute';
            break;
          case InfractionType.Ban:
            type = 'infoBan';
            break;
        }

        let info: string | null = interaction.options.getString('info', true);
        if (info === 'none') info = null;

        let data: { [key: string]: any } = {};
        data[type] = info;

        await this.client.db.guild.update({
          where: { id: interaction.guildId },
          data
        });

        if (info === null)
          return interaction.reply('No additional information will be added to this punishment anymore.');
        else
          return interaction.reply(
            "Users will now see this message in their DM's upon receiving an infraction of this punishment type."
          );
      }
      case 'default-punishment-duration': {
        let type = interaction.options.getString('punishment', true);

        switch (type) {
          case InfractionType.Ban:
            type = 'defaultBanDuration';
            break;
          case InfractionType.Warn:
            type = 'defaultWarnDuration';
            break;
          case InfractionType.Mute:
            type = 'defaultMuteDuration';
            break;
        }

        const uDuration = interaction.options.getString('duration', true);
        const duration = ms(uDuration);

        let data: { [key: string]: any } = {};
        data[type] = duration;

        if (!duration && duration !== 0) throw 'Invalid duration.';
        if (duration < 1 && duration !== 0) throw 'Duration must be at least 1 seconds or 0.';

        await this.client.db.guild.update({
          where: { id: interaction.guildId },
          data
        });

        if (duration === 0) return interaction.reply('There is now no longer a default duration for this punishment.');
        else
          return interaction.reply(
            `Set the default duration of this punishment to \`${ms(duration, { long: true })}\`.`
          );
      }
      case 'view': {
        await interaction.deferReply();
        const guild = (await this.client.db.guild.findUnique({
          where: { id: interaction.guildId }
        }))!;

        const yamlString = yaml.dump(
          JSON.parse(JSON.stringify(guild, (k, v) => (typeof v === 'bigint' ? v.toString() : v)))
        );

        const url = await bin(yamlString, 'yaml');
        return interaction.editReply(`View your settings here: ${url}`);
      }
    }
  }
}

export default ConfigCommand;
