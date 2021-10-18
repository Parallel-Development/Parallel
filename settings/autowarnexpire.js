const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');
const ms = require('ms');

exports.run = async (client, message, args) => {

    if (args[1].toLowerCase() === 'current') {
        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { autowarnexpire } = guildSettings;
        
        const autowarnexpireEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(autowarnexpire === 'disabled' ? 'Auto-warnings are **not** currently set to expire' : `All auto-warnings are set to expire in \`${client.util.duration(autowarnexpire)}\``);

        return message.reply({ embeds: [autowarnexpireEmbed]})
    }

    if (args[1].toLowerCase() === 'disable') {
        await settingsSchema.updateOne({
            guildID: message.guild.id
        },
            {
                autowarnexpire: 'disabled'
            })

        const disableSuccess = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`${client.config.emotes.success} Success! Automod warnings will now never expire`)

        return message.reply({ embeds: [disableSuccess] })

    }

    const duration = ms(args[1])
    if (!duration) return client.util.throwError(message, client.config.errors.missing_argument_duration);
    if (duration > 315576000000) return client.util.throwError(message, client.config.errors.time_too_long);
    if (duration < 5000) return client.util.throwError(message, 'The minimum time allowed is 5 seconds');

    await settingsSchema.updateOne({
        guildID: message.guild.id
    },
        {
            autowarnexpire: duration
        })

    const success = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(` ${client.config.emotes.success} Success! Automod warnings will now expire in \`${client.util.duration(duration)}\``)

    return message.reply({ embeds: [success] })

}