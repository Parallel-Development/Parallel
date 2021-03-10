const Discord = require('discord.js')
const cmdSchema = require('../../schemas/cmd-schema');
const locked = require('../../schemas/cmd-schema')

module.exports = {
    name: 'cmd',
    description: 'Manages in what channels commands are allowed in. Staff commands are unable to be locked',
    usage: 'cmd <lock / whitelist / lockall / whitelistall> [channel]',
    aliases: ['command'],
    async execute(client, message, args) {
        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL());

        if(!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(accessdenied)

        const type = args[0]
        if(!type) return message.channel.send('Please specify a type (lock/whitelist)')
        const channel = message.mentions.channels.first();
        if(!channel) return message.channel.send('Please mention the channel you want to manage')

        const check = await cmdSchema.find({
            guildid: message.guild.id,
            locked: { $gt: channel.id } 
        })

        if(type == 'lock') {
            if(check) return message.channel.send('This channel is already command-locked!')
            await cmdSchema.updateOne({
                guildid: message.guild.id
            },
            {
                $push: { locked: channel.id }
            })
            const lockedCommands = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Commands in ${channel} have successfully been locked <a:check:800062847974375424>`)
            .setAuthor('Commands Locked', client.user.displayAvatarURL())
            .setFooter('Staff commands are still available in this channel')
            message.channel.send(lockedCommands)
            return;
        } else if(type == 'whitelist') {
            if(!check) return message.channel.send('This channel is not command-locked!')
            await cmdSchema.updateOne({
                guildid: message.guild.id
            },
            {
                $push: { locked: channel.id }
            })
            const unlockedCommands = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Commands in ${channel} have successfully been unlocked <a:check:800062847974375424>`)
            .setAuthor('Commands Unlocked', client.user.displayAvatarURL())
            message.channel.send(unlockedCommands)
         } else {
            return message.channel.send('Invalid type! (lock/whitelist')
        }
    }
}