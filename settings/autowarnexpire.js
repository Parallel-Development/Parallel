const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');
const ms = require('ms');

exports.run = async (client, message, args) => {

    if (args[1] === 'disable') {
        await settingsSchema.updateOne({
            guildID: message.guild.id
        },
            {
                autowarnexpire: 'disabled'
            })

        const disableSuccess = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${client.config.emotes.success} Success! Automod warnings will now never expire`)

        return message.reply({ embeds: [disableSuccess] })

    }

    const duration = ms(args[1]);
    if (!duration) return message.reply(client.config.errorMessages.missing_argument_duration);
    if (duration > 315576000000) return message.reply(client.config.errorMessages.time_too_long);
    if (duration < 5000) return message.reply('The minimum time allowed is 5 seconds');

    await settingsSchema.updateOne({
        guildID: message.guild.id
    },
        {
            autowarnexpire: duration
        })

    const success = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription(` ${client.config.emotes.success} Success! Automod warnings will now expire in \`${client.util.convertMillisecondsToDuration(duration)}\``)

    return message.reply({ embeds: [success] })

}