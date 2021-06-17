const Discord = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'userinfo',
    description: 'Shows informated related to a user',
    usage: 'userinfo <user>',
    aliases: ['memberinfo', 'whois', 'ui'],
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

        let memberRolesRaw = new Array();
        let memberRoles;
        member.roles.cache.forEach(role => {
            memberRolesRaw.push("<@&" + role.id + ">")
        })
        memberRolesRaw.pop(0)
        if(member.roles.cache.size < 1) {
            memberRoles = 'None'
        } else {
            memberRoles = memberRolesRaw.join(', ')
        }

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

        let description = `User information for ${member}`;
        if(member.user.username !== member.displayName) description += ` (${member.user.username})`

        const userinfo = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(description)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addField('User ID', member.id, false)
            .addField('Bot Account?', bot, true)
            .addField('Status', status, true)
            .addField('Joined', moment(member.joinedAt).format('dddd, MMMM Do YYYY, h:mm:ss a'), false)
            .addField('Created', moment(member.user.createdAt).format('dddd, MMMM Do YYYY, h:mm:ss a'), false)
            .addField(`Roles [${member.roles.cache.size - 1}]`, memberRoles, false)
            .setFooter(`Information requested by ${message.author.tag}`, message.member.user.displayAvatarURL())

        message.channel.send(userinfo);
    }
}
