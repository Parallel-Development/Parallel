const Discord = require('discord.js')
const { execute } = require('./leave')

module.exports = {
    name: 'pause',
    description: 'Pauses the current playing song',
    usage: 'pause',
    aliases: ['stop'],
    async execute(client, message, args, ops) {
        let fetched = ops.active.get(message.guild.id)
        if (!fetched) return message.channel.send('There is no music currently playing')

        const notinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You must be in a voice channel to run this command! Please join a voice channel and try again')

        const botnotinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I am not currently in this voice channel!')

        const accessdenied = new Discord.MessageEmbed()
            .setColor("#FF0000")
            .setDescription('Because you are not the only one listening to music, you do not have permission to pause the music')

        if (!message.member.voice.channel) return message.channel.send(notinVC)
        if(!message.guild.me.voice.channel) return message.channel.send(botnotinVC)
        if (message.guild.me.voice.channel.id !== message.member.voice.channel.id) return message.channel.send(botnotinVC)
        if (message.member.voice.channel.members.filter(m => m.user.bot == false).size > 1 && !message.member.hasPermission('MANAGE_MESSAGES')) {
            return message.channel.send(accessdenied)
        }

        if (fetched.dispatcher.paused) return message.channel.send('The music is already paused!')
        fetched.dispatcher.pause()
        const paused = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`[${fetched.queue[0].songTitle}](${fetched.queue[0].songURL}) has been paused <a:check:800062978899836958>`)
        message.channel.send(paused)
    }
}
