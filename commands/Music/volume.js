const Discord = require('discord.js')
const { execute } = require('../Utility/clear')

module.exports = {
    name: 'volume',
    description: 'Changes the volume of the music',
    usage: 'volume <volume>',
    aliases: ['vol'],
    async execute(client, message, args, ops) {
        const notinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('<:error:815355171537289257> You must be in a voice channel to run this command! Please join a voice channel and try again')

        const botnotinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('<:error:815355171537289257> I am not currently in this voice channel!')

        const accessdenied = new Discord.MessageEmbed()
            .setColor("#FF0000")
            .setDescription('<:error:815355171537289257> Because you are not the only one listening to music, you do not have permission to change the volume')
        if(!message.member.voice.channel)  return message.channel.send(notinVC)
        if(!message.guild.me.voice.channel) return message.channel.send(botnotinVC)
        if (message.member.voice.channel.id !== message.guild.me.voice.channel.id) return message.channel.send(botnotinVC)
        if (message.member.voice.channel.members.filter(m => m.user.bot == false).size > 1 && !message.member.hasPermission('MANAGE_MESSAGES')) {
            return message.channel.send(accessdenied)
        }

        let fetched = ops.active.get(message.guild.id)
        if (!fetched) return message.channel.send('There are no songs playing!')

        let volume = args[0]
        if(!volume) {
            const currentVolume = fetched.dispatcher.volume;
            return message.channel.send(`The current volume is **${currentVolume * 100}**`)
        }
        if(volume > 500) return message.channel.send('Please specify a volume between 0 and 500')
        if (volume < 0) return message.channel.send('Please specify a volume between 0 and 500')
        if(isNaN(volume)) return message.channel.send('This is not a valid volume!')

        fetched.dispatcher.setVolume(volume/100)
        const setVolume = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription(`Successfully set the volume to ${volume} <a:check:800062978899836958>`)
        .setFooter('The normal volume is 100')
        message.channel.send(setVolume)
    }
}
