const Discord = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'userinfo',
    description: 'Shows informated related to a user',
    usage: 'userinfo <user>',
    aliases: ['memberinfo', 'whois'],
    async execute(client, message, args) {
        var member;

        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }
        if (!member) member = message.member

        let memberRoles = new Array();
        member.roles.cache.forEach(role => {
            memberRoles.push("<@&" + role.id + ">")
        })
        memberRoles.pop(0)

        if (memberRoles.length < 1) memberRoles = "No roles";

        var bot;
        if (member.user.bot) {
            bot = 'Yes'
        } else {
            bot = 'No'
        }

        var status;
        if (member.presence.status === 'dnd') {
            status = 'Do Not Disturb'
        } else if (member.presence.status === 'idle') {
            status = 'Idle'
        } else if (member.presence.status === 'online') {
            status = 'Online'
        } else {
            status = 'Offline'
        }

        const userinfo = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`User information for ${member.user} (${member.user.username})`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addField('User ID', member.id, false)
            .addField('Bot Account?', bot, true)
            .addField('Status', status, true)
            .addField('Joined', moment(member.joinedAt).format('dddd, MMMM Do YYYY, h:mm:ss a'), false)
            .addField('Created', moment(member.user.createdAt).format('dddd, MMMM Do YYYY, h:mm:ss a'), false)
            .addField(`Roles [${member.roles.cache.size - 1}]`, memberRoles.join(', '), false)
            .setFooter(`Information requested by ${message.author.tag}`)

        message.channel.send(userinfo);
    }
}