const Discord = require('discord.js')
const warningSchema = require('../../schemas/warning-schema')
const moment = require('moment')
module.exports = {
    name: 'punishinfo',
    description: 'Get more specific information about a punishment',
    permissions: 'MANAGE_MESSAGES',
    moderationCommand: true,
    aliases: ['case', 'punishment'],
    usage: 'punishinfo (code)',
    async execute(client, message, args) {
        
        const missingargcode = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('Please specify a punishment ID to view information about')
            .setAuthor('Error', client.user.displayAvatarURL());

        const code = args[0]
        if(!code) return message.channel.send(missingargcode)

        const check = await warningSchema.findOne({
            guildid: message.guild.id,
            warnings: {
                $elemMatch: {
                    code: code
                }
            }
        })
        
        if(!check) {
            const noID = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription(`No punishment with the ID \`${code}\` exists on this server`)
            
            message.channel.send(noID)
            return
        }

        let type;
        let moderatorID;
        let expires;
        let date;
        let reason;
        let duration

        for(const i of check.warnings) {
            if(i.code == code) {
                if (i.type) type = i.type
                if (i.moderatorID) moderatorID = i.moderatorID
                if (i.expires) {
                    expires = i.expires
                    duration = i.expires
                }
                if (i.date) date = i.date
                if (i.reason) reason = i.reason
            }
        }
        
        let user;
        try {
            user = message.guild.members.cache.get(check.userid)
        } catch {
            user = null
        }
        let moderator;
        try {
            moderator = message.guild.members.cache.get(moderatorID)
        } catch {
            moderator = null
        }
        let timeTillExpires;
        if(expires - parseInt(new Date().getTime()) <= 0) {
            timeTillExpires = 'This punishment has expired'
        } else {
            timeTillExpires = `${moment(expires + 14400000).format('dddd, MMMM Do YYYY, h:mm:ss A')} |  ${cleanTime(expires - parseInt(new Date().getTime()))} from now`
        }

        const punishmentInformation = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setAuthor(`Punishment information`, client.user.displayAvatarURL())
        .setDescription(`All times are in GMT\n\nPunishment ID: \`${code}\`\nType: \`${type}\``)
        if(user) punishmentInformation.addField('User', user, true)
        punishmentInformation.addField('User ID', check.userid, true)
        if(moderator) punishmentInformation.addField('Moderator', moderator)
        punishmentInformation.addField('Moderator ID', moderatorID, true)
        if(expires) punishmentInformation.addField('Expires', timeTillExpires)
        punishmentInformation.addField('Date', date)
        punishmentInformation.addField('Reason', reason)

        message.channel.send(punishmentInformation)
    }
}

function cleanTime(amount) {
    let days = 0;
    let hours = 0;
    let minutes = 0;
    let seconds = amount / 1000;

    while (seconds >= 60) {
        seconds -= 60;
        minutes++
    }

    while (minutes >= 60) {
        minutes -= 60;
        hours++
    }

    while (hours >= 24) {
        hours -= 24;
        days++
    }

    let product = [];
    if (days > 0) product.push(`${Math.round(days)} days`)
    if (hours > 0) product.push(`${Math.round(hours)} hours`)
    if (minutes > 0) product.push(`${Math.round(minutes)} minutes`)
    if (seconds > 0) product.push(`${Math.round(seconds)} seconds`)

    return product.join(', ')

}