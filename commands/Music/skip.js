const Discord = require('discord.js')

module.exports = {
    name: 'skip',
    description: 'Votes to skip a playing song. Use forecskip to forcefully skip without voting',
    usage: 'skip',
    aliases: ['s'],
    async execute(client, message, args, ops) {
        const botnotinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('<:error:815355171537289257> I am not currently in this voice channel!')

        const notinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('<:error:815355171537289257> You must be in a voice channel to run this command! Please join a voice channel and try again')

        let fetched = ops.active.get(message.guild.id)
        if (!fetched) return message.channel.send('There are no songs in queue to skip!')

        if (!message.member.voice.channel) return message.channel.send(notinVC)
        if(!message.guild.me.voice.channel) return message.channel.send(botnotinVC)
        if (message.member.voice.channel.id !== message.guild.me.voice.channel.id) return message.channel.send(botnotinVC)

        let userCount = message.member.voice.channel.members.size;
        let required = Math.ceil(userCount / 2);
        if (!fetched.queue[0].voteSkips) fetched.queue[0].voteSkips = [];
        if (fetched.queue[0].voteSkips.includes(message.member.id)) return message.channel.send(`You already voted to skip this song! **(${fetched.queue[0].voteSkips.length}/${required})**`)

        fetched.queue[0].voteSkips.push(message.author.id)

        ops.active.set(message.guild.id, fetched);

        if (fetched.queue[0].voteSkips.length >= required) {
            message.channel.send('Skipped! <a:check:800062978899836958>')
            return fetched.dispatcher.emit('finish');
        }

        message.channel.send(`**${message.author.tag}** voted to skip! **(${fetched.queue[0].voteSkips.length}/${required})**`)
    }
}
