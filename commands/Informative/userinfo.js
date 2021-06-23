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

        let userNotMember = false;

        member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        if (!member) { 
            member = await client.users.fetch(args[0]).catch(() => { member = null })
            if(!member) member = message.member
        }
        if(!member.user) userNotMember = true;
        const user = await client.users.fetch(member.id)

        let memberRolesRaw = new Array();
        let memberRoles;
        if(!userNotMember) {
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
        }

        var bot;
        if (user.bot) {
            bot = 'Yes'
        } else {
            bot = 'No'
        }

        var status;
        if (user.presence.status === 'dnd') {
            status = 'Do Not Disturb'
        } else if (user.presence.status === 'idle') {
            status = 'Idle'
        } else if (user.presence.status === 'online') {
            status = 'Online'
        } else {
            status = 'Offline'
        }

        let description = `User information for ${user}`;
        if(!userNotMember) if(member.user.username !== member.displayName) description += ` (${member.user.username})`

        const userinfo = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(description)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addField('User Tag', user.tag, true)
            .addField('User ID', user.id, true)
            .addField('Bot Account?', bot, false)
            if(!userNotMember) userinfo.addField('Status', status, true)
            if(!userNotMember) userinfo.addField('Joined', moment(member.joinedAt).format('dddd, MMMM Do YYYY, h:mm:ss a'), false)
            userinfo.addField('Created', moment(user.createdAt).format('dddd, MMMM Do YYYY, h:mm:ss a'), false)
            if(!userNotMember) userinfo.addField(`Roles [${member.roles.cache.size - 1}]`, memberRoles, false)
            .setFooter(`Information requested by ${message.author.tag}`, message.member.user.displayAvatarURL())

        message.channel.send(userinfo);
    }
}
