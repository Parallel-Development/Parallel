const Discord = require('discord.js')
const { execute } = require('./leave')

module.exports = {
    name: 'summon',
    description: 'Summons the bot to your voice channel',
    usage: 'summon',
    aliases: ['join', 'connect'],
    async execute(client, message, args) {
        const notinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('<:error:815355171537289257> You must be in a voice channel to run this command! Join a voice channel and try again')

        if (!message.member.voice.channel) return message.channel.send(notinVC)
        if (message.guild.me.voice.channel) return message.channel.send('I am already in a voice channel!')

        if (!message.guild.me.hasPermission('CONNECT')) {
            if (!message.guild.me.hasPermission('ADMINISTRATOR')) {
                return message.channel.send('I cannot play music here. I am either missing the Speak or Connect permission')
            }
        } else if (message.guild.me.hasPermission('SPEAK')) {
            if (!message.guild.me.hasPermission('ADMINISTRATOR')) {
                return message.channel.send('I cannot play music here. I am either missing the Speak or Connect permission')
            }
        }

        message.member.voice.channel.join();
        message.channel.send('Joined!')
    }
}