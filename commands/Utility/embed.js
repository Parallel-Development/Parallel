const Discord = require('discord.js')
const { execute } = require('./calc')
let cooldown = new Set()

module.exports = {
    name: 'embed',
    description: 'Sends an embeded message as the bot',
    usage: 'embed (color), (title), (description), (footer)',
    async execute(client, message, args) {

        let counter = 0;
        let color;
        let title;
        let description;
        let footer;
        let channel;

        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL());

        if(!message.member.hasPermission("MANAGE_MESSAGES")) return message.channel.send(accessdenied)
        if(cooldown.has(message.guild.id)) return message.channel.send('This server is on cooldown')
        else {
            cooldown.add(message.guild.id)
            setTimeout(async => {
                cooldown.delete(message.guild.id)
            }, 60000)
        }
        message.delete()
        const startEmbed = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setAuthor('Embed', client.user.displayAvatarURL())
        .setDescription('Please specify the color you wish to use in hex form (Invalid hex colors will result in the color being black)')
        const msg = await message.channel.send(startEmbed)

        let filter = m => m.author.id == message.author.id
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 300000, max: 5 })
        collector.on('collect', (message, col) => {
            if(counter == 0) {
                message.delete();
                color = message.content
                const secondEmbed = new Discord.MessageEmbed()
                secondEmbed.setColor('#09fff2')
                secondEmbed.setAuthor('Embed', client.user.displayAvatarURL())
                secondEmbed.addField('Embed', `Color: ${color}`)
                secondEmbed.setDescription('Please specify the title you wish to use')
                msg.edit(secondEmbed)
            } else if(counter == 1) {
                message.delete();
                title = message.content
                const thirdEmbed = new Discord.MessageEmbed()
                thirdEmbed.setColor('#09fff2')
                thirdEmbed.setAuthor('Embed', client.user.displayAvatarURL())
                thirdEmbed.addField('Embed', `Color: ${color}\n\nTitle: ${title}`)
                thirdEmbed.setDescription('Please specify the description you wish to use')
                msg.edit(thirdEmbed)
            } else if(counter == 2) {
                message.delete();
                description = message.content
                const fourthEmbed = new Discord.MessageEmbed()
                fourthEmbed.setColor('#09fff2')
                fourthEmbed.setAuthor('Embed', client.user.displayAvatarURL())
                fourthEmbed.addField('Embed', `Color: ${color}\n\nTitle: ${title}\n\nDescription: ${description}`)
                fourthEmbed.setDescription('Please specify the footer you wish to use (input \'skip\' to skip this step)')
                msg.edit(fourthEmbed)
            } else if(counter == 3) {
                message.delete();
                if(message.content == 'skip') {
                    footer = null
                } else {
                    footer = message.content
                }
                const channelEmbed = new Discord.MessageEmbed()
                channelEmbed.setColor('#09fff2')
                channelEmbed.setAuthor('Embed', client.user.displayAvatarURL())
                channelEmbed.setDescription('Please mention the channel you wish to send this embed in')
                msg.edit(channelEmbed)
            } else if(counter == 4) {
                message.delete();
                channel = message.mentions.channels.first()
                if(!channel) {
                    message.channel.send('This is not a valid channel. Please mention a valid channel (embed creation cancelled)')
                    collector.stop();
                    return;
                }

            }
            
            counter++

        })

        collector.on('end', (col, reason) => {
            msg.delete()
            if(reason == 'time') return message.channel.send('You took too long to finish the embed!')
            if(reason == 'limit') {
                const finalEmbed = new Discord.MessageEmbed()
                finalEmbed.setColor(color)
                finalEmbed.setTitle(title)
                finalEmbed.setDescription(description)
                finalEmbed.setFooter(footer)
                channel.send(finalEmbed)
                if(channel !== message.channel) message.channel.send(`Embed sent! Check ${channel}`)
            }
        })

    }
}