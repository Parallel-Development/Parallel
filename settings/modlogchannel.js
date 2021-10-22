const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async (client, message, args) => {
    if (args[1].toLowerCase() === 'current') {
        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { moderationLogging } = guildSettings;

        const moderationLoggingChannelEmbed = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(message.guild))
            .setDescription(
                moderationLogging === 'none'
                    ? 'There is no channel set for logging moderation instances with Parallel!'
                    : `The current moderation log channel is ${message.guild.channels.cache.get(moderationLogging)}`
            );

        return message.reply({ embeds: [moderationLoggingChannelEmbed] });
    }

    if (args[1].toLowerCase() === 'none') {
        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                moderationLogging: 'none'
            }
        );

        return message.reply(`Success! Moderator actions with Parallel will no longer be logged`);
    }

    const channel = client.util.getChannel(message.guild, args[1]);
    if (!channel) return client.util.throwError(message, client.config.errors.invalid_channel);

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
            moderationLogging: channel.id
        }
    );

    return message.reply(`Success! Moderator actions with Parallel will now be logged in ${channel}`);
};
