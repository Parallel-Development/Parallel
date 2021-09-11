const Discord = require('discord.js');

module.exports = {
    name: 'userinfo',
    description: 'Shows informated related to a user',
    usage: 'userinfo [user]',
    aliases: ['whois', 'ui'],
    async execute(client, message, args) {

        const member = await client.util.getMember(message.guild, args[0]) ||
        await client.util.getUser(client, args[0]) ||
        message.member;

        const user = member.user ? member.user : member;

        const userinfo = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`User information for ${member} ${member.user && member.user.username !== member.displayName ? `(${member.user.username})` : ''}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addField('User Tag', user.tag, true)
            .addField('User ID', user.id, true)
            .addField('Bot Account?', user.bot ? "Yes" : "No", false)
            .addField('Created', `${client.util.timestamp(user.createdAt)} -> ${client.util.duration(Math.floor(Date.now() - user.createdAt))} ago`)
            .setFooter(`Information requested by ${message.author.tag}`, message.author.displayAvatarURL())
        if (member.user) { 
            const memberRoles = [...member.roles.cache.values()].sort((a, b) => b.position - a.position).slice(0, -1).join(', ');
            userinfo.addField('Joined', `${client.util.timestamp(member.joinedAt)} -> ${client.util.duration(Date.now() - member.joinedAt)} ago`);
            userinfo.addField(`Roles [${member.roles.cache.size - 1}]`, !(member.roles.cache.size - 1) ? 'No Roles' : memberRoles.length <= 1024 ? memberRoles : [...member.roles.cache.values()].sort((a, b) => b.position - a.position).slice(0, 10).join(', '), false)
        }

        return message.reply({ embeds: [userinfo] });
    }
}
