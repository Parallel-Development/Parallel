const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');
const ms = require('ms');

exports.run = async (client, message, args) => {

    if (args[1] === 'disable') {
        await settingsSchema.updateOne({
            guildID: message.guild.id
        },
            {
                manualwarnexpire: 'disabled'
            })

        const disableSuccess = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`${client.config.emotes.success} Success! Manual warnings with no duration specified will now never expire`)

        return message.channel.send(disableSuccess)

    }

    const duration = ms(args[1]);
    if (!duration) return message.channel.send(client.config.errorMessages.missing_argument_duration);
    if (duration > 315576000000) return message.channel.send(client.config.errorMessages.time_too_long);
    if (duration < 5000) return message.channel.send('The minimum time allowed is 5 seconds');

    await settingsSchema.updateOne({
        guildID: message.guild.id
    },
        {
            manualwarnexpire: duration
        })

    const success = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription(`${client.config.emotes.success} Success! Manual warnings with no duration specified will now expire in \`${client.util.convertMillisecondsToDuration(duration)}\``)

    return message.channel.send(success)
}