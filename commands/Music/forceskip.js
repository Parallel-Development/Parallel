const Discord = require('discord.js')

module.exports = {
    name: 'forceskip',
    description: 'Forcefully skips a song without the voting process',
    usage: 'forceskip',
    aliases: ['fs', 'fskip'],
    async execute(client, message, args, ops) {
        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL())

        if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(accessdenied)

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

        ops.active.set(message.guild.id, fetched);

        message.channel.send('Forcefully skipped! <a:check:800062978899836958>')
        return fetched.dispatcher.emit('finish');
    }
}

