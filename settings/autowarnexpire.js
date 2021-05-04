const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');
const ms = require('ms');

exports.run = async(client, message, args) => {

    if(args[1] == 'disable') {
        await settingsSchema.updateOne({
            guildid: message.guild.id
        },
        {
            autowarnexpire: 'disabled'
        })

        const disableSuccess = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription(`Success! Automod warnings will now never expire`)

        return message.channel.send(disableSuccess)

    } else if(!args[1]) {
        return message.channel.send('Please specify a duration. Input `disable` to make all automod warnings permanent | This will set an expiration date for all automod warnings');
    }

    let duration = ms(args[1]);
    if(!duration) return message.channel.send('Invalid time!')

    if(duration < 5000) {
        return message.channel.send('The minimum time allowed is 5 seconds')
    } 

    await settingsSchema.updateOne({
        guildid: message.guild.id
    },
    {
        autowarnexpire: duration
    })

    const success = new Discord.MessageEmbed()
    .setColor('#09fff2')
    .setDescription(`Success! Automod warnings will now expire in \`${args[1]}\``)
    
    message.channel.send(success)

}