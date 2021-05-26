const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async(client, message, args) => { 
    const channel = message.mentions.channels.first();
    if(!channel) return message.channel.send('Please specify a channel')

    if(!channel.permissionsFor(message.guild.me).toArray().includes('SEND_MESSAGES')) {
        return message.channel.send('I cannot send messages in this channel! Please give me permission to send messages here and run again')
    }

    await settingsSchema.updateOne({
        guildid: message.guild.id,
    },
    {
        messageLogging: channel.id
    })

    message.channel.send(`Success! Messages updates will now be logged in ${channel}`)
}