const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async (client, message, args) => {
    const grabLocked = await settingsSchema.findOne({
        guildID: message.guild.id
    });
    const { locked } = grabLocked;

    switch (args[1].toLowerCase()) {
        case 'enable':
            if (!args[2]) return client.util.throwError(message, client.config.errors.missing_argument_channel);
            const enableChannel = client.util.getChannel(message.guild, args[2]);
            if (!enableChannel) return client.util.throwError(message, client.config.errors.invalid_channel);
            if (!enableChannel.isText())
                return client.util.throwError(message, client.config.errors.not_type_text_channel);

            var prevent = false;
            for (let i = 0; i !== locked.length; ++i) {
                const channel = locked[i];

                if (!message.guild.channels.cache.get(channel)) {
                    await settingsSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            $pull: {
                                locked: channel
                            }
                        }
                    );
                }

                if (
                    message.guild.channels.cache.get(channel)?.type === 'category' &&
                    enableChannel.parent &&
                    message.guild.channels.cache.get(channel)?.id === enableChannel.parent.id
                )
                    prevent = true;
            }

            if (prevent)
                return message.reply(
                    "This channel's category is currently disabled, therefore you cannot enable this channel"
                );

            const alreadyEnabled = await settingsSchema.findOne({
                guildID: message.guild.id,
                locked: enableChannel.id
            });

            if (!alreadyEnabled || alreadyEnabled.length === 0) {
                return message.reply(
                    'Commands are already enabled in this channel! `allowcmds viewdisabled` to view disabled command channels'
                );
            }

            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    $pull: {
                        locked: enableChannel.id
                    }
                }
            );
            message.reply(`Commands in ${enableChannel} have been enabled`);
            break;
        case 'enablecategory':
            const enableCategory =
                message.guild.channels.cache.find(c => c.name === args.slice(2).join(' ')) ||
                message.guild.channels.cache.find(c => c.id === args[2]);
            if (!enableCategory)
                return client.util.throwError(message, 'please specify the category you want to enable commands in');
            if (enableCategory.type !== 'GUILD_CATEGORY')
                return client.util.throwError(message, 'please specify a category only');

            const alreadyEnabledCategory = await settingsSchema.findOne({
                guildID: message.guild.id,
                locked: enableCategory.id
            });

            if (!alreadyEnabledCategory || alreadyEnabledCategory.length === 0) {
                return message.reply(
                    'Commands are already enabled in this category! `allowcmds viewdisabled` to view disabled command channels'
                );
            }

            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    $pull: {
                        locked: enableCategory.id
                    }
                }
            );

            for (let i = 0; i !== locked.length; ++i) {
                const channel = locked[i];

                if (!message.guild.channels.cache.get(channel)) {
                    await settingsSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            $pull: {
                                locked: channel
                            }
                        }
                    );
                }

                if (channel.parent && message.guild.channels.cache.get(channel)?.parent?.id === disableCategory.id) {
                    await settingsSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            $pull: {
                                locked: channel
                            }
                        }
                    );
                }
            }

            message.reply(`Commands in the category \`${enableCategory.name}\` have been enabled`);
            break;

        case 'disable':
            if (!args[2]) return client.util.throwError(message, client.config.errors.missing_argument_channel);
            const disableChannel = client.util.getChannel(message.guild, args[2]);
            if (!disableChannel) return client.util.throwError(message, client.config.errors.invalid_channel);
            if (!disableChannel.isText())
                return client.util.throwError(message, 'the channel must only be a text channel!');

            var prevent = false;
            for (let i = 0; i !== locked.length; ++i) {
                const channel = locked[i];

                if (!message.guild.channels.cache.get(channel)) {
                    await settingsSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            $pull: {
                                locked: channel
                            }
                        }
                    );
                }

                if (
                    message.guild.channels.cache.get(channel)?.type === 'category' &&
                    disableChannel.parent &&
                    message.guild.channels.cache.get(channel)?.id === disableChannel.parent.id
                )
                    prevent = true;
            }
            if (prevent)
                return message.reply(
                    "This channel's category is currently disabled, therefore you cannot disable this channel"
                );

            const alreadyDisabled = await settingsSchema.findOne({
                guildID: message.guild.id,
                locked: disableChannel.id
            });

            if (alreadyDisabled && !alreadyDisabled.length) {
                return message.reply(
                    'Commands are already disabled in this channel! `allowcmds viewdisabled` to view disabled command channels'
                );
            }

            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    $push: {
                        locked: disableChannel.id
                    }
                }
            );
            message.reply(`Commands in ${disableChannel} have been disabled`);
            break;
        case 'disablecategory':
            const disableCategory =
                message.guild.channels.cache.find(c => c.name === args.slice(2).join(' ')) ||
                message.guild.channels.cache.find(c => c.id === args[2]);
            if (!disableCategory)
                return client.util.throwError(message, 'please specify the category you want to disable commands in');
            if (disableCategory.type !== 'GUILD_CATEGORY')
                return client.util.throwError(message, 'please specify a category only');

            const alreadyDisabledCategory = await settingsSchema.findOne({
                guildID: message.guild.id,
                locked: disableCategory.id
            });
            if (alreadyDisabledCategory && !alreadyDisabledCategory.length) {
                return message.reply(
                    'Commands are already disabled in this category! `allowcmds viewdisabled` to view disabled command channels'
                );
            }

            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    $push: {
                        locked: disableCategory.id
                    }
                }
            );

            for (let i = 0; i !== locked.length; ++i) {
                const channel = locked[i];

                if (!message.guild.channels.cache.get(channel)) {
                    await settingsSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            $pull: {
                                locked: channel
                            }
                        }
                    );
                }

                if (channel.parent && message.guild.channels.cache.get(channel)?.parent?.id === disableCategory.id) {
                    await settingsSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            $pull: {
                                locked: channel
                            }
                        }
                    );
                }
            }

            message.reply(`Commands in the category \`${disableCategory.name}\` have been disabled`);
            break;
        case 'enableall':
            await settingsSchema.updateOne(
                {
                    guildID: message.guild.id
                },
                {
                    locked: []
                }
            );
            message.reply(`All channels now allow commands`);
            break;
        case 'viewdisabled':
            if (locked === null || !locked.length)
                return message.reply(
                    'No channels currrently prevent commands. Want to add some? `allowcmds disable (channel)`'
                );
            const disabledCommandChannels = new Discord.MessageEmbed()
                .setColor(client.util.getMainColor(message.guild))
                .setAuthor(`Disabled command channels for ${message.guild.name}`, client.user.displayAvatarURL());

            for (let i = 0; i !== locked.length; ++i) {
                const channel = locked[i];
                if (
                    !message.guild.channels.cache.get(channel) ||
                    message.guild.channels.cache.get(channel).type === 'GUILD_VOICE'
                ) {
                    await settingsSchema.updateOne(
                        {
                            guildID: message.guild.id
                        },
                        {
                            $pull: {
                                locked: channel
                            }
                        }
                    );
                }
            }

            const lockedCategories = locked
                .filter(channel => message.guild.channels.cache.get(channel).type === 'GUILD_CATEGORY')
                .map(channel => message.guild.channels.cache.get(channel).name)
                .join(', ');
            const lockedChannels = locked
                .filter(channel => message.guild.channels.cache.get(channel).type === 'GUILD_TEXT')
                .map(channel => message.guild.channels.cache.get(channel))
                .join(', ');

            if (lockedCategories) disabledCommandChannels.addField('Categories', lockedCategories);
            if (lockedChannels) disabledCommandChannels.addField('Channels', lockedChannels);
            message.reply({ embeds: [disabledCommandChannels] });
            break;
        default:
            return message.reply(
                'Invalid option! Options: enable, enablecateory, disable, disablecategory, viewdisabled'
            );
    }
};
