const Discord = require('discord.js')

module.exports = {
    name: 'leave',
    description: 'Makes the bot leave the voice channel you are in',
    usage: 'leave',
    aliases: ['disconnect', ''],
    async execute(client, message, args) {
        const notinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('<:error:815355171537289257> You must be in a voice channel to run this command! Please join a voice channel and try again')

        const botnotinVC = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('<:error:815355171537289257> I am not currently in this voice channel!')

        const accessdenied = new Discord.MessageEmbed()
            .setColor("#FF0000")
            .setDescription('<:error:815355171537289257> Because you are not the only one listening to music, you do not have permission to make this bot leave')

        const leftVC = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription('Successfully disconnected from voice channel <a:check:800062978899836958>')

        if (!message.member.voice.channel) return message.channel.send(notinVC)
        if(!message.guild.me.voice.channel) return message.channel.send(botnotinVC)
        if (message.guild.me.voice.channel.id !== message.member.voice.channel.id) return message.channel.send(botnotinVC)
        if (message.member.voice.channel.members.size > 2 && !message.member.hasPermission('MANAGE_MESSAGES')) {
            return message.channel.send(accessdenied)
        }

        message.guild.me.voice.channel.leave();
        message.channel.send(leftVC)
    }
}
