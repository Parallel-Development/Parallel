const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async (client, message, args) => {
    const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
    const { messageLoggingIgnored } = guildSettings;

    if (args[1].toLowerCase() === 'view') {
        if (!messageLoggingIgnored.length)
            return message.reply(`There are no channels on the message logging ignored list`);

        for (let i = 0; i !== messageLoggingIgnored.length; ++i) {
            const ignoredChannel = messageLoggingIgnored[i];
            if (!message.guild.channels.cache.get(ignoredChannel)) {
                await settingsSchema.updateOne(
                    {
                        guildID: message.guild.id
                    },
                    {
                        $pull: {
                            messageLoggingIgnored: ignoredChannel
                        }
                    }
                );
            }
        }

        const _ignoredChannels = await settingsSchema
            .findOne({ guildID: message.guild.id })
            .then(result => result.messageLoggingIgnored);

        const ignoredChannelsList =
            _ignoredChannels.map(channel => message.guild.channels.cache.get(channel)).join(', ').length <= 2000
                ? _ignoredChannels.map(channel => message.guild.channels.cache.get(channel)).join(', ')
                : await client.util.createBin(_ignoredChannels.map(channel => message.guild.roles.cache.get(channel)));

        const ignoredChannelsEmbed = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(message.guild))
            .setAuthor(
                `Ignored message logging channels list for ${message.guild.name}`,
                client.user.displayAvatarURL()
            )
            .setDescription(ignoredChannelsList);

        return message.reply({ embeds: [ignoredChannelsEmbed] });
    } else if (args[1].toLowerCase() === 'add') {
        if (!args[2]) return client.util.throwError(message, client.config.errors.missing_argument_channel);
        const channel = client.util.getChannel(message.guild, args[2]);
        if (!channel) return client.util.throwError(message, client.config.errors.invalid_channel);

        if (messageLoggingIgnored.includes(channel.id))
            return client.util.throwError(message, 'channel is already in the message logging ignored list');

        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                $push: {
                    messageLoggingIgnored: channel.id
                }
            }
        );

        return message.reply(`Channel ${channel} has been added to the message logging ignored list!`);
    } else if (args[1].toLowerCase() === 'remove') {
        if (!args[2]) return client.util.throwError(message, client.config.errors.missing_argument_channel);
        const channel = client.util.getChannel(message.guild, args[2]);
        if (!channel) return client.util.throwError(message, client.config.errors.invalid_channel);

        if (!messageLoggingIgnored.includes(channel.id))
            return client.util.throwError(message, 'channel is not in the message logging ignored list');

        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                $pull: {
                    messageLoggingIgnored: channel.id
                }
            }
        );

        return message.reply(`Channel ${channel} has been removed from the message logging ignored list!`);
    } else if (args[1].toLowerCase() === 'removeall') {
        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                messageLoggingIgnored: []
            }
        );

        return message.reply(`Removed all channels from the message logging ignored list!`);
    } else return client.util.throwError(message, client.config.errors.invalid_option);
};
