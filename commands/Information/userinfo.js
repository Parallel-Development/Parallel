const Discord = require('discord.js');

module.exports = {
    name: 'userinfo',
    description: 'Shows informated related to a user',
    usage: 'userinfo [user]',
    aliases: ['memberinfo', 'whois', 'ui', 'userinformation'],
    async execute(client, message, args) {

        const member = message.mentions.members.first()
        || message.guild.members.cache.get(args[0])
        || await client.users.fetch(args[0]).catch(() => { })
        || message.member;

        const user = await client.users.fetch(member.id)

        let description = `User information for ${user}`;
        if (member.user && member.user.username !== member.nickname) description += ` (${member.user.username})`

        const userinfo = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(description)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addField('User Tag', user.tag, true)
            .addField('User ID', user.id, true)
            .addField('Bot Account?', user.bot ? "Yes" : "No", false)
            .addField('Created', client.util.timestamp(member.user ? member.user.createdAt : member.createdAt))
            .setFooter(`Information requested by ${message.author.tag}`, message.member.user.displayAvatarURL())
        if(member.user) {
            userinfo.addField('Joined', client.util.timestamp(member.joinedAt));
            userinfo.addField(`Roles [${member.roles.cache.size - 1}]`, member.roles.cache.map(role => role).slice(0, -1).join(', '), false)
        }

        return message.reply({ embeds: [userinfo] });
    }
}
