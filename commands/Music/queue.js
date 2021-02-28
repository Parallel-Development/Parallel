const Discord = require('discord.js');
const { execute } = require('./leave');

module.exports = {
    name: 'queue',
    description: 'Shows the queue of songs waiting to be played',
    usage: 'queue',
    aliases: ['q'],
    async execute(client, message, args, ops) {
        let fetched = ops.active.get(message.guild.id)
        if (!fetched) return message.channel.send(`There are no songs in the queue!`)

        let queue = fetched.queue;
        let nowPlaying = queue[0]

        let resp = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`__**Now Playing**__\n[${nowPlaying.songTitle}](${nowPlaying.songURL})\nRequested by: **${nowPlaying.requester}**`)

        for (var i = 1; i < queue.length; i++) {
            resp.addField(`**${i}** ) ${queue[i].songTitle}`, `[${queue[i].songTitle}](${queue[i].songURL})\nRequested by: **${queue[i].requester}**`)
        }
        message.channel.send(resp)
    }
}