const Discord = require('discord.js');
const automodSchema = require('../../schemas/automod-schema');
const settingsSchema = require('../../schemas/settings-schema');
const ms = require('ms');

module.exports = {
    name: 'automod',
    description: 'Manages the auto-moderation for the bot',
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    usage: 'automod <setting> [args]',
    async execute(client, message, args) {
        const automodGrab = await automodSchema.findOne({
            guildID: message.guild.id
        });
        const guildSettings = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        const { modRoles, modRolePermissions } = guildSettings;

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
            maliciouslinksTempMuteDuration,
            maliciouslinksTempBanDuration,
            fast,
            filter,
            invites,
            links,
            massmention,
            walltext,
            maliciouslinks
        } = automodGrab;s

        const automodList = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(message.guild))
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
                'Fast',
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
                }\``, true
            )
            .addField(
                'Malicious-links',
                `Toggled: \`${maliciouslinksTempMuteDuration
                    ? maliciouslinks + ' for ' + client.util.duration(maliciouslinksTempMuteDuration)
                    : maliciouslinksTempBanDuration
                        ? maliciouslinks + ' for ' + client.util.duration(maliciouslinksTempBanDuration)
                        : maliciouslinks
                }\``
            )
            .addField(
                'Filter-list',
                'The list of blacklisted words on the server that if used and the Filter automod is enabled, will be moderated',
                true
            )
            .addField('Channel-bypass', 'The list of channels that are excluded from the automod', true)
            .addField('Role-bypass', 'The list of roles that are excluded from the automod', true)
            .setAuthor(`Auto-moderation for ${message.guild.name}`, client.user.displayAvatarURL());

        const option = args[0] ? args[0].toLowerCase().replace('-', '') : [];
        const whitelistedArguments = [['filterlist', 'view'], ['channelbypass', 'view'], ['rolebypass', 'view']];
        if (args[0] && !whitelistedArguments.some(arguments => arguments.join(' ') === args[0].toLowerCase().replace('-', '') + ' ' + args.slice(1)) && (!message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD) && (!message.member.roles.cache.some(role => modRoles.includes(role.id)) || !new Discord.Permissions(modRolePermissions).has(Discord.Permissions.FLAGS.MANAGE_GUILD)))) return client.util.throwError(message, 'no permission to edit the configuration of the automod, you may only view the toggled automod features by running this command with no additional arguments, or view lists such as the channel-bypass list');
        const toggle = args[1] ? args[1].toLowerCase().replace('-', '') : [];
        if (!option.length) return message.reply({ embeds: [automodList] });

        const duration = args[2] ? ms(args[2]) : null;
        if (!duration && (args[1] === 'tempmute' || args[1] === 'temban')) {
            if (!args[2]) return client.util.throwError(message, client.config.errors.missing_argument_duration);
            else return client.util.throwError(message, client.config.errors.bad_duration);
        } else if (duration && duration > 315576000000 && (args[1] === 'tempmute' || args[1] === 'tempban'))
            return client.util.throwError(message, client.config.errors.time_too_long);

        client.cache.automod.delete(message.guild.id);

        // FUNCTIONS ================================================================================

        const updateFilter = async (type, duration = null) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            filter: type,
                            filterTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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
                            guildID: message.guild.id
                        },
                        {
                            fast: type,
                            fastTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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
                            guildID: message.guild.id
                        },
                        {
                            walltext: type,
                            walltextTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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
                            guildID: message.guild.id
                        },
                        {
                            links: type,
                            linksTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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
                            guildID: message.guild.id
                        },
                        {
                            invites: type,
                            invitesTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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
                            guildID: message.guild.id
                        },
                        {
                            massmention: type,
                            massmentionTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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
                            guildID: message.guild.id
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

        const updateMalicious = async (type, duration) => {
            if (duration) {
                if (type === 'tempban') {
                    await automodSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            maliciouslinks: type,
                            maliciouslinksTempBanDuration: duration
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            maliciouslinks: type,
                            maliciouslinksTempMuteDuration: duration
                        }
                    );
                }
            } else {
                if (type === 'disabled') {
                    await automodSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            maliciouslinks: type,
                            maliciouslinksTempMuteDuration: 0,
                            maliciouslinksTempBanDuration: 0
                        }
                    );
                } else {
                    await automodSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            maliciouslinks: type,
                            maliciouslinksTempMuteDuration: 0,
                            maliciouslinksTempBanDuration: 0
                        }
                    );
                }
            }
        };

        // =================================================================================================

        switch (option) {
            case 'filter':
                switch (toggle) {
                    case 'delete':
                        updateFilter('delete');
                        message.reply(`Members who send words on the \`Filtered List\` will get their message deleted`);
                        break;
                    case 'warn':
                        updateFilter('warn');
                        message.reply(`Members who send words on the \`Filtered List\` will get warned`);
                        break;
                    case 'kick':
                        updateFilter('kick');
                        message.reply(`Members who send words on the \`Filtered List\` will get kicked`);
                        break;
                    case 'mute':
                        updateFilter('mute');
                        message.reply(`Members who send words on the \`Filtered List\` will get muted`);
                        break;
                    case 'ban':
                        updateFilter('ban');
                        message.reply(`Members who send words on the \`Filtered List\` will get banned`);
                        break;
                    case 'tempban':
                        updateFilter('tempban', duration);
                        message.reply(
                            `Members who send words on the \`Filtered List\` will get banned for \`${client.util.duration(
                                duration
                            )}\``
                        );
                        break;
                    case 'tempmute':
                        updateFilter('tempmute', duration);
                        message.reply(
                            `Members who send words on the \`Filtered List\` will get muted for  \`${client.util.duration(
                                duration
                            )}\``
                        );
                        break;
                    case 'disable':
                        updateFilter('disabled');
                        message.reply('Members will no longer be punished for sending words in the `Filter list`');
                        break;
                    default:
                        if (!args[1]) {
                            return client.util.throwError(message, client.config.errors.missing_argument_option);
                        } else {
                            return client.util.throwError(message, client.config.errors.invalid_option);
                        }
                }
                break;

            case 'filterlist':
                const word = args.slice(2).join(' ');
                if (!args[2] && args[1] && args[1] !== 'remove' && args[1] !== 'removeall' && args[1] !== 'view')
                    return client.util.throwError(message, 'Please specify a word');

                switch (toggle) {
                    case 'add':
                        const wordAlreadyInFilter = await automodSchema.find({
                            guildID: message.guild.id,
                            filterList: word
                        });

                        if (wordAlreadyInFilter?.length !== 0)
                            return message.reply(
                                'This word is already in the filter! Run `automod filter view` to view the current list of filtered words'
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: message.guild.id
                            },
                            {
                                $push: { filterList: word.toLowerCase() }
                            }
                        );
                        message.reply(`\`${word.toLowerCase()}\` has been added to the filter`);
                        break;
                    case 'remove':
                        const wordNotInFilter = await automodSchema.find({
                            guildID: message.guild.id,
                            filterList: word
                        });

                        if (!wordNotInFilter || !wordNotInFilter.length)
                            return message.reply(
                                `Could not find the word \`${word}\` on the filter. Run \`automod filterlist view\` to view the current list of filtered words`
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: message.guild.id
                            },
                            {
                                $pull: { filterList: word }
                            }
                        );
                        message.reply(`\`${word}\` has been removed from the filter!`);
                        break;
                    case 'removeall':
                        await automodSchema.updateOne(
                            {
                                guildID: message.guild.id
                            },
                            {
                                filterList: []
                            }
                        );
                        message.reply('Wiped all words from the filter');
                        break;
                    case 'view':
                        const noWordsInFilter = await automodSchema.findOne({
                            guildID: message.guild.id
                        });

                        const { filterList } = noWordsInFilter;

                        if (!filterList || !filterList.length)
                            return message.reply(
                                'No words are on the filter! Want to add some? `automod filterlist add (word)`'
                            );
                        const filterViewList = new Discord.MessageEmbed()
                            .setColor(client.util.mainColor(message.guild))
                            .setAuthor(`Filter list for ${message.guild.name}`, client.user.displayAvatarURL())
                            .setDescription(
                                `${
                                    filterList.map(word => `\`${word}\``).join(', ').length <= 1024
                                        ? filterList.map(word => `\`${word}\``).join(', ')
                                        : await client.util.createBin(filterList.join(', '))
                                }`
                            );
                        message.reply({ embeds: [filterViewList] });
                        break;
                    default:
                        if (!args[1]) {
                            return client.util.throwError(message, client.config.errors.missing_argument_option);
                        } else {
                            return client.util.throwError(message, client.config.errors.invalid_option);
                        }
                }
                break;
            case 'fast':
                switch (toggle) {
                    case 'delete':
                        updateFast('delete');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send fast message spam will get their spam deleted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'warn':
                        updateFast('warn');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send fast message spam will get warned`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'kick':
                        updateFast('kick');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send fast message spam will get kicked`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'mute':
                        updateFast('mute');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send fast message spam will get muted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'ban':
                        updateFast('ban');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send fast message spam will get banned`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempban':
                        updateFast('tempban', duration);
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${
                                            client.config.emotes.success
                                        } Members who send fast message spam will get banned for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempmute':
                        updateFast('tempmute', duration);
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${
                                            client.config.emotes.success
                                        } Members who send fast message spam will get muted for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'disable':
                        updateFast('disabled');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed({})
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send fast message spam will no longer be automatically punished`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    default:
                        if (!args[1]) {
                            return client.util.throwError(message, client.config.errors.missing_argument_option);
                        } else {
                            return client.util.throwError(message, client.config.errors.invalid_option);
                        }
                }
                break;
            case 'walltext':
                switch (toggle) {
                    case 'delete':
                        updateWalltext('delete');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send walltext will get their spam deleted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'warn':
                        updateWalltext('warn');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send walltext will get warned`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'kick':
                        updateWalltext('kick');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send walltext will get kicked`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'mute':
                        updateWalltext('mute');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send walltext will get muted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'ban':
                        updateWalltext('ban');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send walltext will get banned`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempban':
                        updateWalltext('tempban', duration);
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${
                                            client.config.emotes.success
                                        } Members who send walltext will get banned for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempmute':
                        updateWalltext('tempmute');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${
                                            client.config.emotes.success
                                        } Members who send walltext will get muted for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'disable':
                        updateWalltext('disabled');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send walltext will no longer be punished`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    default:
                        if (!args[1]) {
                            return client.util.throwError(message, client.config.errors.missing_argument_option);
                        } else {
                            return client.util.throwError(message, client.config.errors.invalid_option);
                        }
                }
                break;
            case 'links':
                switch (toggle) {
                    case 'delete':
                        updateLinks('delete');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send links will get their message deleted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'warn':
                        updateLinks('warn');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send links will get warned`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'kick':
                        updateLinks('kick');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send links will get kicked`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'mute':
                        updateLinks('mute');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send links will get muted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'ban':
                        updateLinks('ban');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send links will get banned`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempban':
                        updateLinks('tempban', duration);
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${
                                            client.config.emotes.success
                                        } Members who send links will get banned for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempmute':
                        updateLinks('tempmute', duration);
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${
                                            client.config.emotes.success
                                        } Members who send links will get muted for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'disable':
                        updateLinks('disabled');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send links will no longer be automatically punished`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    default:
                        if (!args[1]) {
                            return client.util.throwError(message, client.config.errors.missing_argument_option);
                        } else {
                            return client.util.throwError(message, client.config.errors.invalid_option);
                        }
                }
                break;
            case 'invites':
                switch (toggle) {
                    case 'delete':
                        updateInvites('delete');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send invites will get their deleted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'warn':
                        updateInvites('warn');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send invites will get warned`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'kick':
                        updateInvites('kick');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send invites will get kicked`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'mute':
                        updateInvites('mute');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send invites will get muted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'ban':
                        updateInvites('ban');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send invites will get muted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempban':
                        updateInvites('tempban', duration);
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${
                                            client.config.emotes.success
                                        } Members who send invites will get banned for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        message.reply(success);
                        break;
                    case 'tempmute':
                        updateInvites('tempmute', duration);
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${
                                            client.config.emotes.success
                                        } Members who send invites will get muted for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        message.reply(success);
                        break;
                    case 'disable':
                        updateInvites('disabled');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send invites will no longer get punished`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    default:
                        if (!args[1]) {
                            return client.util.throwError(message, client.config.errors.missing_argument_option);
                        } else {
                            return client.util.throwError(message, client.config.errors.invalid_option);
                        }
                }
                break;
            case 'massmention':
                switch (toggle) {
                    case 'delete':
                        updateMassmention('delete');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who mention 5+ users will get their message deleted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'warn':
                        updateMassmention('warn');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who mention 5+ users will get warned`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'kick':
                        updateMassmention('kick');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who mention 5+ users will get kicked`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'mute':
                        updateMassmention('mute');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who mention 5+ users will get muted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'ban':
                        updateMassmention('ban');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who mention 5+ users will get banned`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempban':
                        updateMassmention('tempban', duration);
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${
                                            client.config.emotes.success
                                        } Members who mention 5+ users will get banned for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempmute':
                        updateMassmention('tempmute', duration);
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${
                                            client.config.emotes.success
                                        } Members who mention 5+ users will get muted for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'disable':
                        updateMassmention('disabled');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who mention 5+ users will no longer get punished`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    default:
                        if (!args[1]) {
                            return client.util.throwError(message, client.config.errors.missing_argument_option);
                        } else {
                            return client.util.throwError(message, client.config.errors.invalid_option);
                        }
                }
                break;

            case 'maliciouslinks':
                switch (toggle) {
                    case 'delete':
                        updateMalicious('delete');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send a malicious link will get their message deleted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'warn':
                        updateMalicious('warn');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send a malicious link will get warned`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'kick':
                        updateMalicious('kick');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send a malicious link will get kicked`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'mute':
                        updateMalicious('mute');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send a malicious link will get muted`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'ban':
                        updateMalicious('ban');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send a malicious links will get banned`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempban':
                        updateMalicious('tempban', duration);
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success
                                        } Members who send a malicious link will get banned for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'tempmute':
                        updateMalicious('tempmute', duration);
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success
                                        } Members who send a malicious link will get muted for \`${client.util.duration(
                                            duration
                                        )}\``
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    case 'disable':
                        updateMalicious('disabled');
                        message.reply({
                            embeds: [
                                new Discord.MessageEmbed()
                                    .setColor(client.util.mainColor(message.guild))
                                    .setDescription(
                                        `${client.config.emotes.success} Members who send a malicious link will no longer get punished`
                                    )
                                    .setAuthor('Automod Update', client.user.displayAvatarURL())
                            ]
                        });
                        break;
                    default:
                        if (!args[1]) {
                            return client.util.throwError(message, client.config.errors.missing_argument_option);
                        } else {
                            return client.util.throwError(message, client.config.errors.invalid_option);
                        }
                }
                break;
            case 'channelbypass':
                const bypassChannel = client.util.getChannel(message.guild, args[2]);

                switch (toggle) {
                    case 'add':
                        if (!bypassChannel)
                            return client.util.throwError(message, client.config.errors.missing_argument_channel);
                        if (bypassChannel.type !== 'GUILD_TEXT')
                            return client.util.throwError(message, client.config.errors.not_type_text_channel);
                        const alreadyInBypassList0 = await automodSchema.findOne({
                            guildID: message.guild.id,
                            bypassChannels: bypassChannel.id
                        });
                        if (alreadyInBypassList0?.bypassChannels?.length)
                            return message.reply(
                                'This channel is already in the bypass list! You can view the list by running `automod bypass view`'
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: message.guild.id
                            },
                            {
                                $push: {
                                    bypassChannels: bypassChannel.id
                                }
                            }
                        );
                        await message.reply(`${bypassChannel} has been added to the automod bypass list`);
                        break;
                    case 'remove':
                        if (!bypassChannel)
                            return client.util.throwError(message, client.config.errors.missing_argument_channel);
                        const alreadyInBypassList1 = await automodSchema.findOne({
                            guildID: message.guild.id,
                            bypassChannels: bypassChannel.id
                        });
                        if (!alreadyInBypassList1?.bypassChannels?.length)
                            return message.reply(
                                'This channel is not in the bypass list! You can view the list by running `automod bypass view`'
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: message.guild.id
                            },
                            {
                                $pull: {
                                    bypassChannels: bypassChannel.id
                                }
                            }
                        );
                        await message.reply(`${bypassChannel} has been removed from the automod bypass list`);
                        break;
                    case 'removeall':
                        await automodSchema.updateOne(
                            {
                                guildID: message.guild.id
                            },
                            {
                                bypassChannels: []
                            }
                        );
                        await message.reply(`All channels have been removed from the automod bypass list`);
                        break;
                    case 'view':
                        const channelsBypassed = await automodSchema.findOne({
                            guildID: message.guild.id
                        });

                        const { bypassChannels } = channelsBypassed;

                        if (!bypassChannels || !bypassChannels.length)
                            return message.reply(
                                'No channels are on the automod bypass list! Want to add some? `automod bypass add (channel)`'
                            );
                        const bypassChannelsViewList = new Discord.MessageEmbed()
                            .setColor(client.util.mainColor(message.guild))
                            .setAuthor(
                                `Bypassed channel list for ${message.guild.name}`,
                                client.user.displayAvatarURL()
                            );
                        for (let i = 0; i !== bypassChannels.length; ++i) {
                            const channel = bypassChannels[i];
                            if (
                                !message.guild.channels.cache.get(channel) ||
                                message.guild.channels.cache.get(channel).type !== 'GUILD_TEXT'
                            ) {
                                await automodSchema.updateOne(
                                    {
                                        guildID: message.guild.id
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
                            .map(channel => message.guild.channels.cache.get(channel))
                            .filter(channel => channel.type === 'GUILD_TEXT')
                            .join(', ');
                        bypassChannelsViewList.addField('Channels', bypassChannels_);

                        message.reply({ embeds: [bypassChannelsViewList] });
                        break;
                    default:
                        if (!args[1]) {
                            return client.util.throwError(message, client.config.errors.missing_argument_option);
                        } else {
                            return client.util.throwError(message, client.config.errors.invalid_option);
                        }
                }
                break;
            case 'rolebypass':
                switch (toggle) {
                    case 'add':
                        var bypassRole =
                            client.util.getRole(message.guild, args[2]) ||
                            message.guild.roles.cache.find(r => r.name === args.slice(2).join(' '));
                        if (!bypassRole)
                            return client.util.throwError(message, client.config.errors.missing_argument_role);
                        const alreadyInBypassList0 = await automodSchema.findOne({
                            guildID: message.guild.id,
                            bypassRoles: bypassRole.id
                        });
                        if (alreadyInBypassList0?.bypassRoles?.length)
                            return message.reply(
                                'This role is already in the bypass list! You can view the list by running `automod rolebypass view`'
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: message.guild.id
                            },
                            {
                                $push: {
                                    bypassRoles: bypassRole.id
                                }
                            }
                        );
                        await message.reply(`\`${bypassRole.name}\` has been added to the automod bypass list`);
                        break;
                    case 'remove':
                        var bypassRole =
                            client.util.getRole(args[2]) ||
                            message.guild.roles.cache.find(r => r.name === args.slice(2).join(' '));
                        if (!bypassRole)
                            return client.util.throwError(message, client.config.errors.missing_argument_role);
                        const alreadyInBypassList1 = await automodSchema.findOne({
                            guildID: message.guild.id,
                            bypassRoles: bypassRole.id
                        });
                        if (!alreadyInBypassList1?.bypassRoles?.length)
                            return message.reply(
                                'This role is not in the bypass list! You can view the list by running `automod rolebypass view`'
                            );
                        await automodSchema.updateOne(
                            {
                                guildID: message.guild.id
                            },
                            {
                                $pull: {
                                    bypassRoles: bypassRole.id
                                }
                            }
                        );
                        await message.reply(`\`${bypassRole.name}\` has been removed from the automod bypass list`);
                        break;
                    case 'removeall':
                        await automodSchema.updateOne(
                            {
                                guildID: message.guild.id
                            },
                            {
                                bypassRoles: []
                            }
                        );
                        await message.reply(`All roles have been removed from the automod rolebypass list`);
                        break;
                    case 'view':
                        const rolesBypassed = await automodSchema.findOne({
                            guildID: message.guild.id
                        });

                        const { bypassRoles } = rolesBypassed;

                        if (!bypassRoles || !bypassRoles.length)
                            return message.reply(
                                'No roles are on the automod rolebypass list! Want to add some? `automod rolebypass add (role)`'
                            );
                        const bypassRolesViewList = new Discord.MessageEmbed()
                            .setColor(client.util.mainColor(message.guild))
                            .setAuthor(`Bypassed role list for ${message.guild.name}`, client.user.displayAvatarURL());
                        const bypassRoles2 = [];
                        for (let i = 0; i !== bypassRoles.length; ++i) {
                            const role = bypassRoles[i];
                            if (!message.guild.roles.cache.get(role)) {
                                await automodSchema.updateOne(
                                    {
                                        guildID: message.guild.id
                                    },
                                    {
                                        $pull: {
                                            bypassRoles: role
                                        }
                                    }
                                );
                            } else {
                                bypassRoles2.push(message.guild.roles.cache.get(role));
                            }
                        }

                        bypassRolesViewList.setDescription(bypassRoles2.join(', '));
                        message.reply({ embeds: [bypassRolesViewList] });
                        break;
                    default:
                        if (!args[1]) {
                            return client.util.throwError(message, client.config.errors.missing_argument_option);
                        } else {
                            return client.util.throwError(message, client.config.errors.invalid_option);
                        }
                }
                break;
            default:
                return message.reply('Invalid setting!');
        }
    }
};
