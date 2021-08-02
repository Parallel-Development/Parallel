const Discord = require('discord.js');

module.exports = {
    name: 'avatar',
    description: 'Displays the specified member\'s avatar',
    usage: 'avatar [member]',
    aliases: ['av', 'icon', 'pfp'],
    async execute(client, message, args) {

        const member = message.mentions.members.first()
        || message.guild.members.cache.get(args[0])
        || await client.users.fetch(args[0]).catch(() => { member = null })
        || message.member

        const user = await client.users.fetch(member.id)

        const avatar = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor(`${user.tag}'s avatar`, client.user.displayAvatarURL())
        avatar.setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))

        return message.channel.send(avatar)
    }
}
