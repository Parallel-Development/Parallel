const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async(client, message, args) => {
    const toggle = args[1];
    if(!toggle) return message.channel.send('Options: enable, disable')

    if(toggle == 'enable') {
        await settingsSchema.updateOne({
            guildid: message.guild.id
        },
        {
            rmrolesonmute: true
        })
        message.channel.send('Roles will now be removed from users when muted')
    } else if(toggle == 'disable') {
        await settingsSchema.updateOne({
            guildid: message.guild.id
        },
        {
            rmrolesonmute: false
        })
        message.channel.send('Roles will no longer be removed from users when muted')
    } else {
        return message.channel.send('Invalid option!')
    }
}