const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async(client, message, args) => {

    if (args[1] === 'enable') {
        await settingsSchema.updateOne({
            guildID: message.guild.id
        },
        {
            removerolesonmute: true
        })

        return message.reply(`${client.config.emotes.success} I will now remove all roles from a user when they are muted and add the muted role to them`)
    } else if (args[1] === 'disable') {
        await settingsSchema.updateOne({
            guildID: message.guild.id
        },
        {
            removerolesonmute: false
        })

        return message.reply(`${client.config.emotes.success} I will now only add the muted role to a user when they are muted`)
    } else {
        return await client.util.throwError(message, client.config.errors.invalid_option);
    }
}