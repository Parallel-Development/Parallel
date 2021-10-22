const Discord = require('discord.js');
const automodSchema = require('../../schemas/automod-schema');
const ms = require('ms');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'automod',
    description: 'Manages the auto-moderation for the bot',
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Manage the auto-moderation for the bot')
        .addSubcommand(command => command.setName('current').setDescription('View the current automod state'))
        .addSubcommand(command =>
            command
                .setName('filter')
                .setDescription('Manage the filter automod on the server')
                .addStringOption(option =>
                    option
                        .setName('punishment')
                        .setDescription('The punishment given for triggering this automod')
                        .setRequired(true)
                        .addChoice('Warn', 'warn')
                        .addChoice('Kick', 'kick')
                        .addChoice('Mute', 'mute')
                        .addChoice('Ban', 'ban')
                        .addChoice('Temp-mute', 'tempmute')
                        .addChoice('Temp-ban', 'tempban')
                        .addChoice('Disable', 'disable')
                )
                .addStringOption(option => option.setName('duration').setDescription('The duration of the punishment'))
        )
        .addSubcommand(command =>
            command
                .setName('spam')
                .setDescription('Manage the spam automod on the server')
                .addStringOption(option =>
                    option
                        .setName('punishment')
                        .setDescription('The punishment given for triggering this automod')
                        .setRequired(true)
                        .addChoice('Warn', 'warn')
                        .addChoice('Kick', 'kick')
                        .addChoice('Mute', 'mute')
                        .addChoice('Ban', 'ban')
                        .addChoice('Temp-mute', 'tempmute')
                        .addChoice('Temp-ban', 'tempban')
                        .addChoice('Disable', 'disable')
                )
                .addStringOption(option => option.setName('duration').setDescription('The duration of the punishment'))
        )
        .addSubcommand(command =>
            command
                .setName('walltext')
                .setDescription('Manage the walltext automod on the server')
                .addStringOption(option =>
                    option
                        .setName('punishment')
                        .setDescription('The punishment given for triggering this automod')
                        .setRequired(true)
                        .addChoice('Warn', 'warn')
                        .addChoice('Kick', 'kick')
                        .addChoice('Mute', 'mute')
                        .addChoice('Ban', 'ban')
                        .addChoice('Temp-mute', 'tempmute')
                        .addChoice('Temp-ban', 'tempban')
                        .addChoice('Disable', 'disable')
                )
                .addStringOption(option => option.setName('duration').setDescription('The duration of the punishment'))
        )
        .addSubcommand(command =>
            command
                .setName('links')
                .setDescription('Manage the link automod on the server')
                .addStringOption(option =>
                    option
                        .setName('punishment')
                        .setDescription('The punishment given for triggering this automod')
                        .setRequired(true)
                        .addChoice('Warn', 'warn')
                        .addChoice('Kick', 'kick')
                        .addChoice('Mute', 'mute')
                        .addChoice('Ban', 'ban')
                        .addChoice('Temp-mute', 'tempmute')
                        .addChoice('Temp-ban', 'tempban')
                        .addChoice('Disable', 'disable')
                )
                .addStringOption(option => option.setName('duration').setDescription('The duration of the punishment'))
        )
        .addSubcommand(command =>
            command
                .setName('invites')
                .setDescription('Manage the invite automod on the server')
                .addStringOption(option =>
                    option
                        .setName('punishment')
                        .setDescription('The punishment given for triggering this automod')
                        .setRequired(true)
                        .addChoice('Warn', 'warn')
                        .addChoice('Kick', 'kick')
                        .addChoice('Mute', 'mute')
                        .addChoice('Ban', 'ban')
                        .addChoice('Temp-mute', 'tempmute')
                        .addChoice('Temp-ban', 'tempban')
                        .addChoice('Disable', 'disable')
                )
                .addStringOption(option => option.setName('duration').setDescription('The duration of the punishment'))
        )
        .addSubcommand(command =>
            command
                .setName('mass-mention')
                .setDescription('Manage the mass-mention automod on the server')
                .addStringOption(option =>
                    option
                        .setName('punishment')
                        .setDescription('The punishment given for triggering this automod')
                        .setRequired(true)
                        .addChoice('Warn', 'warn')
                        .addChoice('Kick', 'kick')
                        .addChoice('Mute', 'mute')
                        .addChoice('Ban', 'ban')
                        .addChoice('Temp-mute', 'tempmute')
                        .addChoice('Temp-ban', 'tempban')
                        .addChoice('Disable', 'disable')
                )
                .addStringOption(option => option.setName('duration').setDescription('The duration of the punishment'))
        )
        .addSubcommand(command =>
            command
                .setName('filter-list')
                .setDescription('Manage the filtered words on the server')
                .addStringOption(option =>
                    option
                        .setName('method')
                        .setDescription('To add, remove, remove all, or view')
                        .setRequired(true)
                        .addChoice('Add', 'add')
                        .addChoice('Remove', 'remove')
                        .addChoice('Remove All', 'removeall')
                        .addChoice('View', 'view')
                )
                .addStringOption(option =>
                    option.setName('word').setDescription('The word to add or remove from the filter list')
                )
        )
        .addSubcommand(command =>
            command
                .setName('channel-bypass')
                .setDescription('Manage the channels that are on the bypass list for automod')
                .addStringOption(option =>
                    option
                        .setName('method')
                        .setDescription('To add, remove, remove all, or to view')
                        .setRequired(true)
                        .addChoice('Add', 'add')
                        .addChoice('Remove', 'remove')
                        .addChoice('Remove All', 'removeall')
                        .addChoice('View', 'view')
                )
                .addChannelOption(option =>
                    option.setName('channel').setDescription('The channel to add or remove from the channel bypass')
                )
        )
        .addSubcommand(command =>
            command
                .setName('role-bypass')
                .setDescription('Manage the roles that are on the bypass list for automod')
                .addStringOption(option =>
                    option
                        .setName('method')
                        .setDescription('To add, remove, remove all, or to view')
                        .setRequired(true)
                        .addChoice('Add', 'add')
                        .addChoice('Remove', 'remove')
                        .addChoice('Remove All', 'removeall')
                        .addChoice('View', 'view')
                )
                .addRoleOption(option =>
                    option.setName('role').setDescription('The role to add or remove from the channel bypass')
                )
        ),
    async execute(client, interaction, args) {
        const automodGrab = await automodSchema.findOne({
            guildID: interaction.guild.id
        });

        const {
            fastTempMuteDuration,
            fastTempBanDuration,
            filterTempMuteDuration,
            filterTempBanDuration,
            invitesTempMuteDuration,
            invitesTempBanDuration,
            linksTempMuteDuration,
            linksTempBanDuration,
            massmentionTempMuteDuration,
            massmentionTempBanDuration,
            walltextTempMuteDuration,
            walltextTempBanDuration,
            fast,
            filter,
            invites,
            links,
            massmention,
            walltext
        } = automodGrab;

        const automodList = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(interaction.guild))
            .setDescription(
                'Syntax: `automod (setting) [punishment]` or `automod (setting) disable` to disable. For lists, the options include `add`, `remove`, `removeall`, and `view`\n\nThe valid punishments are `delete`, `warn`, `kick`, `mute`, `tempmute`, and `tempban`'
            )
            .addField(
                'Filter',
                `Toggled: \`${
                    filterTempMuteDuration
                        ? filter + ' for ' + client.util.duration(filterTempMuteDuration)
                        : filterTempBanDuration
                        ? filter + ' for ' + client.util.duration(filterTempBanDuration)
                        : filter
                }\``,
                true
            )
            .addField(
                'Spam',
                `Toggled: \`${
                    fastTempMuteDuration
                        ? fast + ' for ' + client.util.duration(fastTempMuteDuration)
                        : fastTempBanDuration
                        ? fast + ' for ' + client.util.duration(fastTempBanDuration)
                        : fast
                }\``,
                true
            )
            .addField(
                'Walltext',
                `Toggled: \`${
                    walltextTempMuteDuration
                        ? walltext + ' for ' + client.util.duration(walltextTempMuteDuration)
                        : walltextTempBanDuration
                        ? walltext + ' for ' + client.util.duration(walltextTempBanDuration)
                        : walltext
                }\``,
                true
            )
            .addField(
                'Links',
                `Toggled: \`${
                    linksTempMuteDuration
                        ? links + ' for ' + client.util.duration(linksTempMuteDuration)
                        : linksTempBanDuration
                        ? links + ' for ' + client.util.duration(linksTempBanDuration)
                        : links
                }\``,
                true
            )
            .addField(
                'Invites',
                `Toggled: \`${
                    invitesTempMuteDuration
                        ? invites + ' for ' + client.util.duration(invitesTempMuteDuration)
                        : invitesTempBanDuration
                        ? invites + ' for ' + client.util.duration(invitesTempBanDuration)
                        : invites
                }\``,
                true
            )
            .addField(
                'Mass-mention',
                `Toggled: \`${
                    massmentionTempMuteDuration
                        ? massmention + ' for ' + client.util.duration(massmentionTempMuteDuration)
                        : massmentionTempBanDuration
                        ? massmention + ' for ' + client.util.duration(massmentionTempBanDuration)
                        : massmention
                }\``,
                true
            )
            .addField(
                'Filter-list',
                'The list of blacklisted words on the server that if used and the Filter automod is enabled, will be moderated',
                true
            )
            .addField('Channel-bypass', 'The list of channels that are excluded from the automod', true)
            .addField('Role-bypass', 'The list of roles that are excluded from the automod', true)
            .setAuthor(`Auto-moderation for ${interaction.guild.name}`, client.user.displayAvatarURL());

        //const option = args[0] ? args[0].toLowerCase().replace('-', '') : [];
        //const toggle = args[1] ? args[1].toLowerCase().replace('-', '') : [];
        const subArgs = interaction.options.data.reduce((map, arg) => ((map[arg.name] = arg), map), {});
        if (subArgs['current']) return interaction.reply({ embeds: [automodList] });

        // FUNCTIONS ================================================================================

        const updateFilter = async (type, duration = null) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            filter: type,
                            filterTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            filter: type,
                            filterTempMuteDuration: duration
                        }
                    );
                }
            } else {
                if (type === 'disabled') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            filter: type,
                            filterTempMuteDuration: 0,
                            filterTempBanDuration: 0
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            filter: type,
                            filterTempMuteDuration: 0,
                            filterTempBanDuration: 0
                        }
                    );
                }
            }
        };

        const updateFast = async (type, duration) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            fast: type,
                            fastTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            fast: type,
                            fastTempMuteDuration: duration
                        }
                    );
                }
            } else {
                if (type === 'disabled') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            fast: type,
                            fastTempMuteDuration: 0,
                            fastTempBanDuration: 0
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            fast: type,
                            fastTempMuteDuration: 0,
                            fastTempBanDuration: 0
                        }
                    );
                }
            }
        };

        const updateWalltext = async (type, duration) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            walltext: type,
                            walltextTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            walltext: type,
                            walltextTempMuteDuration: duration
                        }
                    );
                }
            } else {
                if (type === 'disabled') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            walltext: type,
                            walltextTempMuteDuration: 0,
                            walltextTempBanDuration: 0
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            walltext: type,
                            walltextTempMuteDuration: 0,
                            walltextTempBanDuration: 0
                        }
                    );
                }
            }
        };

        const updateLinks = async (type, duration) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            links: type,
                            linksTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            links: type,
                            linksTempMuteDuration: duration
                        }
                    );
                }
            } else {
                if (type === 'disabled') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            links: type,
                            linksTempMuteDuration: 0,
                            linksTempBanDuration: 0
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            links: type,
                            linksTempMuteDuration: 0,
                            linksTempBanDuration: 0
                        }
                    );
                }
            }
        };

        const updateInvites = async (type, duration) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            invites: type,
                            invitesTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            invites: type,
                            invitesTempMuteDuration: duration
                        }
                    );
                }
            } else {
                if (type === 'disabled') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            invites: type,
                            invitesTempMuteDuration: 0,
                            invitesTempBanDuration: 0
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            invites: type,
                            invitesTempMuteDuration: 0,
                            invitesTempBanDuration: 0
                        }
                    );
                }
            }
        };

        const updateMassmention = async (type, duration) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            massmention: type,
                            massmentionTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            massmention: type,
                            massmentionTempMuteDuration: duration
                        }
                    );
                }
            } else {
                if (type === 'disabled') {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            massmention: type,
                            massmentionTempMuteDuration: 0,
                            massmentionTempBanDuration: 0
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: interaction.guild.id
                        },
                        {
                            massmention: type,
                            massmentionTempMuteDuration: 0,
                            massmentionTempBanDuration: 0
                        }
                    );
                }
            }
        };

        // =================================================================================================

        const _subArgs = Object.keys(subArgs).toString();
        let toggle, duration;

        switch (_subArgs) {
            case 'filter':
                toggle = subArgs['filter'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
                duration = toggle['duration'] ? ms(toggle['duration']) : undefined;
                if (toggle['duration'] && toggle['punishment'] !== 'tempban' && toggle['punishment'] !== 'tempmute')
                    return client.util.throwError(interaction, client.config.errors.duration_not_expected);
                if (!toggle['duration'] && (toggle['punishment'] === 'tempban' || toggle['punishment'] === 'tempmute'))
                    return client.util.throwError(interaction, client.config.missing_argument_duration);
                if (!duration && toggle['duration'])
                    return client.util.throwError(interaction, client.config.bad_duration);
                if (duration > 315576000000) return client.util.throwError(interaction, client.config.time_too_long);

                switch (toggle['punishment']) {
                    case 'delete':
                        updateFilter('delete');
                        interaction.reply(
                            `Members who send words on the \`Filtered List\` will get their message deleted`
                        );
                        break;
                    case 'warn':
                        updateFilter('warn');
                        interaction.reply(`Members who send words on the \`Filtered List\` will get warned`);
                        break;
                    case 'kick':
                        updateFilter('kick');
                        interaction.reply(`Members who send words on the \`Filtered List\` will get kicked`);
                        break;
                    case 'mute':
                        updateFilter('mute');
                        interaction.reply(`Members who send words on the \`Filtered List\` will get muted`);
                        break;
                    case 'ban':
                        updateFilter('ban');
                        interaction.reply(`Members who send words on the \`Filtered List\` will get banned`);
                        break;
                    case 'tempban':
                        updateFilter('tempban', duration);
                        interaction.reply(
                            `Members who send words on the \`Filtered List\` will get banned for \`${client.util.duration(
                                duration
                            )}\``
                        );
                        break;
                    case 'tempmute':
                        updateFilter('tempmute', duration);
                        interaction.reply(
                            `Members who send words on the \`Filtered List\` will get muted for  \`${client.util.duration(
                                duration
                            )}\``
                        );
                        break;
                    case 'disable':
                        updateFilter('disabled');
                        interaction.reply('Members will no longer be punished for sending words in the `Filter list`');
                        break;
                }
                break;

            case 'filter-list':
                toggle = subArgs['filter-list'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
                const word = toggle['word'];

                if (toggle['method'] !== 'view' && toggle['method'] !== 'removeall' && !word)
                    return client.util.throwError(interaction, 'Please specify a word');

                switch (toggle['method']) {
                    case 'add':
                        const wordAlreadyInFilter = await automodSchema.find({
                            guildID: interaction.guild.id,
                            filterList: word
                        });

                        if (wordAlreadyInFilter?.length !== 0)
                            return interaction.reply(
                                'This word is already in the filter! Run `automod filter view` to view the current list of filtered words'
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: interaction.guild.id
                            },
                            {
                                $push: { filterList: word.toLowerCase() }
                            }
                        );
                        interaction.reply(`\`${word.toLowerCase()}\` has been added to the filter`);
                        break;
                    case 'remove':
                        const wordNotInFilter = await automodSchema.find({
                            guildID: interaction.guild.id,
                            filterList: word
                        });

                        if (!wordNotInFilter || !wordNotInFilter.length)
                            return interaction.reply(
                                `Could not find the word \`${word}\` on the filter. Run \`automod filterlist view\` to view the current list of filtered words`
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: interaction.guild.id
                            },
                            {
                                $pull: { filterList: word }
                            }
                        );
                        interaction.reply(`\`${word}\` has been removed from the filter!`);
                        break;
                    case 'removeall':
                        await automodSchema.updateOne(
                            {
                                guildID: interaction.guild.id
                            },
                            {
                                filterList: []
                            }
                        );
                        interaction.reply('Wiped all words from the filter');
                        break;
                    case 'view':
                        const noWordsInFilter = await automodSchema.findOne({
                            guildID: interaction.guild.id
                        });

                        const { filterList } = noWordsInFilter;

                        if (!filterList || !filterList.length)
                            return interaction.reply(
                                'No words are on the filter! Want to add some? `automod filterlist add (word)`'
                            );
                        const filterViewList = new Discord.MessageEmbed()
                            .setColor(client.util.mainColor(interaction.guild))
                            .setAuthor(`Filter list for ${interaction.guild.name}`, client.user.displayAvatarURL())
                            .setDescription(
                                `${
                                    filterList.map(word => `\`${word}\``).join(', ').length <= 1024
                                        ? filterList.map(word => `\`${word}\``).join(', ')
                                        : await client.util.createBin(filterList.join(', '))
                                }`
                            );
                        interaction.reply({ embeds: [filterViewList] });
                        break;
                }
                break;
            case 'spam':
                toggle = subArgs['spam'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
                duration = toggle['duration'] ? ms(toggle['duration']) : undefined;
                if (toggle['duration'] && toggle['punishment'] !== 'tempban' && toggle['punishment'] !== 'tempmute')
                    return client.util.throwError(interaction, client.config.errors.duration_not_expected);
                if (!toggle['duration'] && (toggle['punishment'] === 'tempban' || toggle['punishment'] === 'tempmute'))
                    return client.util.throwError(interaction, client.config.missing_argument_duration);
                if (!duration && toggle['duration'])
                    return client.util.throwError(interaction, client.config.bad_duration);
                if (duration > 315576000000) return client.util.throwError(interaction, client.config.time_too_long);

                switch (toggle['punishment']) {
                    case 'delete':
                        updateFast('delete');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send fast message spam will get their spam deleted`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'warn':
                        updateFast('warn');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send fast message spam will get warned`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'kick':
                        updateFast('kick');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send fast message spam will get kicked`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'mute':
                        updateFast('mute');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send fast message spam will get muted`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'ban':
                        updateFast('ban');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send fast message spam will get banned`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempban':
                        updateFast('tempban', duration);
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who send fast message spam will get banned for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempmute':
                        updateFast('tempmute', duration);
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who send fast message spam will get muted for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'disable':
                        updateFast('disabled');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed({})
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who send fast message spam will no longer be automatically punished`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                }
                break;
            case 'walltext':
                toggle = subArgs['walltext'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
                duration = toggle['duration'] ? ms(toggle['duration']) : undefined;
                if (toggle['duration'] && toggle['punishment'] !== 'tempban' && toggle['punishment'] !== 'tempmute')
                    return client.util.throwError(interaction, client.config.errors.duration_not_expected);
                if (!toggle['duration'] && (toggle['punishment'] === 'tempban' || toggle['punishment'] === 'tempmute'))
                    return client.util.throwError(interaction, client.config.missing_argument_duration);
                if (!duration && toggle['duration'])
                    return client.util.throwError(interaction, client.config.bad_duration);
                if (duration > 315576000000) return client.util.throwError(interaction, client.config.time_too_long);

                switch (toggle['punishment']) {
                    case 'delete':
                        updateWalltext('delete');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send walltext will get their spam deleted`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'warn':
                        updateWalltext('warn');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send walltext will get warned`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'kick':
                        updateWalltext('kick');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send walltext will get kicked`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'mute':
                        updateWalltext('mute');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send walltext will get muted`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'ban':
                        updateWalltext('ban');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send walltext will get banned`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempban':
                        updateWalltext('tempban', duration);
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who send walltext will get banned for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempmute':
                        updateWalltext('tempmute');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who send walltext will get muted for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'disable':
                        updateWalltext('disabled');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send walltext will no longer be punished`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                }
                break;
            case 'links':
                toggle = subArgs['links'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
                duration = toggle['duration'] ? ms(toggle['duration']) : undefined;
                if (toggle['duration'] && toggle['punishment'] !== 'tempban' && toggle['punishment'] !== 'tempmute')
                    return client.util.throwError(interaction, client.config.errors.duration_not_expected);
                if (!toggle['duration'] && (toggle['punishment'] === 'tempban' || toggle['punishment'] === 'tempmute'))
                    return client.util.throwError(interaction, client.config.missing_argument_duration);
                if (!duration && toggle['duration'])
                    return client.util.throwError(interaction, client.config.bad_duration);
                if (duration > 315576000000) return client.util.throwError(interaction, client.config.time_too_long);

                switch (toggle['punishment']) {
                    case 'delete':
                        updateLinks('delete');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send links will get their message deleted`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'warn':
                        updateLinks('warn');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send links will get warned`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'kick':
                        updateLinks('kick');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send links will get kicked`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'mute':
                        updateLinks('mute');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send links will get muted`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'ban':
                        updateLinks('ban');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send links will get banned`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempban':
                        updateLinks('tempban', duration);
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who send links will get banned for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempmute':
                        updateLinks('tempmute', duration);
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who send links will get muted for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'disable':
                        updateLinks('disabled');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who send links will no longer be automatically punished`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                }
                break;
            case 'invites':
                toggle = subArgs['invites'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
                duration = toggle['duration'] ? ms(toggle['duration']) : undefined;
                if (toggle['duration'] && toggle['punishment'] !== 'tempban' && toggle['punishment'] !== 'tempmute')
                    return client.util.throwError(interaction, client.config.errors.duration_not_expected);
                if (!toggle['duration'] && (toggle['punishment'] === 'tempban' || toggle['punishment'] === 'tempmute'))
                    return client.util.throwError(interaction, client.config.missing_argument_duration);
                if (!duration && toggle['duration'])
                    return client.util.throwError(interaction, client.config.bad_duration);
                if (duration > 315576000000) return client.util.throwError(interaction, client.config.time_too_long);

                switch (toggle['punishment']) {
                    case 'delete':
                        updateInvites('delete');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send invites will get their deleted`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'warn':
                        updateInvites('warn');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send invites will get warned`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'kick':
                        updateInvites('kick');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send invites will get kicked`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'mute':
                        updateInvites('mute');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send invites will get muted`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'ban':
                        updateInvites('ban');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send invites will get muted`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempban':
                        updateInvites('tempban', duration);
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who send invites will get banned for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        interaction.reply(success);
                        break;
                    case 'tempmute':
                        updateInvites('tempmute', duration);
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who send invites will get muted for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        interaction.reply(success);
                        break;
                    case 'disable':
                        updateInvites('disabled');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who send invites will no longer get punished`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                }
                break;
            case 'mass-mention':
                toggle = subArgs['mass-mention'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
                duration = toggle['duration'] ? ms(toggle['duration']) : undefined;
                if (toggle['duration'] && toggle['punishment'] !== 'tempban' && toggle['punishment'] !== 'tempmute')
                    return client.util.throwError(interaction, client.config.errors.duration_not_expected);
                if (!toggle['duration'] && (toggle['punishment'] === 'tempban' || toggle['punishment'] === 'tempmute'))
                    return client.util.throwError(interaction, client.config.missing_argument_duration);
                if (!duration && toggle['duration'])
                    return client.util.throwError(interaction, client.config.bad_duration);
                if (duration > 315576000000) return client.util.throwError(interaction, client.config.time_too_long);
                switch (toggle['punishment']) {
                    case 'delete':
                        updateMassmention('delete');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who mention 5+ users will get their message deleted`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'warn':
                        updateMassmention('warn');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who mention 5+ users will get warned`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'kick':
                        updateMassmention('kick');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who mention 5+ users will get kicked`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'mute':
                        updateMassmention('mute');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who mention 5+ users will get muted`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'ban':
                        updateMassmention('ban');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who mention 5+ users will get banned`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempban':
                        updateMassmention('tempban', duration);
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who mention 5+ users will get banned for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempmute':
                        updateMassmention('tempmute', duration);
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(
                                        `✅ Members who mention 5+ users will get muted for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'disable':
                        updateMassmention('disabled');
                        interaction.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(interaction.guild))
                                    .setDescription(`✅ Members who mention 5+ users will no longer get punished`)
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                }
                break;
            case 'channel-bypass':
                toggle = subArgs['channel-bypass'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
                if (toggle['method'] !== 'view' && toggle['method'] !== 'removeall' && !toggle['channel'])
                    return client.util.throwError(interaction, client.config.errors.missing_argument_channel);
                const bypassChannel = client.util.getChannel(interaction.guild, toggle['channel']);
                if (toggle['method'] !== 'add' && toggle['method'] !== 'remove' && bypassChannel)
                    return client.util.throwError(interaction, 'A channel was provided but was not expected');
                if (bypassChannel && bypassChannel.type !== 'GUILD_TEXT')
                    return client.util.throwError(interaction, client.config.errors.not_type_text_channel);

                switch (toggle['method']) {
                    case 'add':
                        if (!bypassChannel)
                            return client.util.throwError(interaction, client.config.errors.missing_argument_channel);
                        if (bypassChannel.type !== 'GUILD_TEXT')
                            return client.util.throwError(interaction, client.config.errors.not_type_text_channel);
                        const alreadyInBypassList0 = await automodSchema.findOne({
                            guildID: interaction.guild.id,
                            bypassChannels: bypassChannel.id
                        });
                        if (alreadyInBypassList0?.bypassChannels?.length)
                            return interaction.reply(
                                'This channel is already in the bypass list! You can view the list by running `automod bypass view`'
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: interaction.guild.id
                            },
                            {
                                $push: {
                                    bypassChannels: bypassChannel.id
                                }
                            }
                        );
                        await interaction.reply(`${bypassChannel} has been added to the automod bypass list`);
                        break;
                    case 'remove':
                        const alreadyInBypassList1 = await automodSchema.findOne({
                            guildID: interaction.guild.id,
                            bypassChannels: bypassChannel.id
                        });
                        if (!alreadyInBypassList1?.bypassChannels?.length)
                            return interaction.reply(
                                'This channel is not in the bypass list! You can view the list by running `automod bypass view`'
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: interaction.guild.id
                            },
                            {
                                $pull: {
                                    bypassChannels: bypassChannel.id
                                }
                            }
                        );
                        await interaction.reply(`${bypassChannel} has been removed from the automod bypass list`);
                        break;
                    case 'removeall':
                        await automodSchema.updateOne(
                            {
                                guildID: interaction.guild.id
                            },
                            {
                                bypassChannels: []
                            }
                        );
                        await interaction.reply(`All channels have been removed from the automod bypass list`);
                        break;
                    case 'view':
                        const channelsBypassed = await automodSchema.findOne({
                            guildID: interaction.guild.id
                        });

                        const { bypassChannels } = channelsBypassed;

                        if (!bypassChannels || !bypassChannels.length)
                            return interaction.reply(
                                'No channels are on the automod bypass list! Want to add some? `automod bypass add (channel)`'
                            );
                        const bypassChannelsViewList = new Discord.MessageEmbed()
                            .setColor(client.util.mainColor(interaction.guild))
                            .setAuthor(
                                `Bypassed channel list for ${interaction.guild.name}`,
                                client.user.displayAvatarURL()
                            );
                        for (let i = 0; i !== bypassChannels.length; ++i) {
                            const channel = bypassChannels[i];
                            if (
                                !interaction.guild.channels.cache.get(channel) ||
                                !interaction.guild.channels.cache.get(channel).isText()
                            ) {
                                await automodSchema.updateOne(
                                    {
                                        guildID: interaction.guild.id
                                    },
                                    {
                                        $pull: {
                                            bypassChannels: channel
                                        }
                                    }
                                );
                            }
                        }

                        const bypassChannels_ = bypassChannels
                            .map(channel => interaction.guild.channels.cache.get(channel))
                            .filter(channel => channel.isText())
                            .join(', ');
                        bypassChannelsViewList.addField('Channels', bypassChannels_);

                        interaction.reply({ embeds: [bypassChannelsViewList] });
                        break;
                }
                break;
            case 'role-bypass':
                toggle = subArgs['role-bypass'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
                if (toggle['method'] !== 'view' && toggle['method'] !== 'removeall' && !toggle['role'])
                    return client.util.throwError(interaction, client.config.errors.missing_argument_role);
                const bypassRole = client.util.getRole(interaction.guild, toggle['role']);
                if (toggle['method'] !== 'add' && toggle['method'] !== 'remove' && bypassRole)
                    return client.util.throwError(interaction, 'A role was provided but was not expected');

                switch (toggle['method']) {
                    case 'add':
                        const alreadyInBypassList0 = await automodSchema.findOne({
                            guildID: interaction.guild.id,
                            bypassRoles: bypassRole.id
                        });
                        if (alreadyInBypassList0?.bypassRoles?.length)
                            return interaction.reply(
                                'This role is already in the bypass list! You can view the list by running `automod rolebypass view`'
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: interaction.guild.id
                            },
                            {
                                $push: {
                                    bypassRoles: bypassRole.id
                                }
                            }
                        );
                        await interaction.reply(`\`${bypassRole.name}\` has been added to the automod bypass list`);
                        break;
                    case 'remove':
                        const alreadyInBypassList1 = await automodSchema.findOne({
                            guildID: interaction.guild.id,
                            bypassRoles: bypassRole.id
                        });
                        if (!alreadyInBypassList1?.bypassRoles?.length)
                            return interaction.reply(
                                'This role is not in the bypass list! You can view the list by running `automod rolebypass view`'
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: interaction.guild.id
                            },
                            {
                                $pull: {
                                    bypassRoles: bypassRole.id
                                }
                            }
                        );
                        await interaction.reply(`\`${bypassRole.name}\` has been removed from the automod bypass list`);
                        break;
                    case 'removeall':
                        await automodSchema.updateOne(
                            {
                                guildID: interaction.guild.id
                            },
                            {
                                bypassRoles: []
                            }
                        );
                        await interaction.reply(`All roles have been removed from the automod rolebypass list`);
                        break;
                    case 'view':
                        const rolesBypassed = await automodSchema.findOne({
                            guildID: interaction.guild.id
                        });

                        const { bypassRoles } = rolesBypassed;

                        if (!bypassRoles || !bypassRoles.length)
                            return interaction.reply(
                                'No roles are on the automod rolebypass list! Want to add some? `automod rolebypass add (role)`'
                            );
                        const bypassRolesViewList = new Discord.MessageEmbed()
                            .setColor(client.util.mainColor(interaction.guild))
                            .setAuthor(
                                `Bypassed role list for ${interaction.guild.name}`,
                                client.user.displayAvatarURL()
                            );
                        const bypassRoles2 = [];
                        for (let i = 0; i !== bypassRoles.length; ++i) {
                            const role = bypassRoles[i];
                            if (!interaction.guild.roles.cache.get(role)) {
                                await automodSchema.updateOne(
                                    {
                                        guildID: interaction.guild.id
                                    },
                                    {
                                        $pull: {
                                            bypassRoles: role
                                        }
                                    }
                                );
                            } else {
                                bypassRoles2.push(interaction.guild.roles.cache.get(role));
                            }
                        }

                        bypassRolesViewList.setDescription(bypassRoles2.join(', '));
                        interaction.reply({ embeds: [bypassRolesViewList] });
                        break;
                }
                break;
        }
    }
};
