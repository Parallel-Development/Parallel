const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async (client, message, args) => {
    if (args[1].toLowerCase() === 'current') {
        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { automodLogging } = guildSettings;

        const automodLoggingChannelEmbed = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(message.guild))
            .setDescription(
                automodLogging === 'none'
                    ? 'There is no channel set for logging automod instances!'
                    : `The current automod log channel is ${message.guild.channels.cache.get(automodLogging)}`
            );

        return message.reply({ embeds: [automodLoggingChannelEmbed] });
    }

    if (args[1].toLowerCase() === 'none') {
        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                automodLogging: 'none'
            }
        );

        return message.reply(`Success! Automod instances will no longer be logged`);
    }

    const channel = client.util.getChannel(message.guild, args[1]);
    if (!channel) return client.util.throwError(message, client.config.errors.invalid_channel);
    if (!channel) return client.util.throwError(message, client.config.errors.missing_argument_channel);

    if (channel.type !== 'GUILD_TEXT')
        return client.util.throwError(message, client.config.errors.not_type_text_channel);

    if (!channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.SEND_MESSAGES)) {
        return message.reply(
            'I cannot send messages in this channel! Please give me permission to send messages here and run again'
        );
    }

    await settingsSchema.updateOne(
        {
            guildID: message.guild.id
        },
        {
            automodLogging: channel.id
        }
    );

    message.reply(`Success! Automod instances will now be logged in ${channel}`);
};
