const Discord = require('discord.js')
const moment = require('moment')

module.exports = {
    name: 'userinfo',
    description: 'Shows informated related to a user',
    usage: 'userinfo <user>',
    aliases: ['memberinfo'],
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

    const userinfo = new Discord.MessageEmbed()
    .setColor('#09fff2')
    .addField('Username', member.user.username, true)
    .addField('ID', member.id, true)
    .addField('Bot Account?', member.user.bot, true, true)
    .addField('Joined on', moment(member.joinedAt).format('dddd, MMMM Do YYYY, h:mm:ss a'), true)
    .addField('Account Creation', moment(member.user.createdAt).format('dddd, MMMM Do YYYY, h:mm:ss a'), true)
    .addField(`Roles [${member.roles.cache.size - 1}]`, memberRoles.join(', '))
    .setThumbnail(member.user.displayAvatarURL({dynamic: true}))
    .setAuthor(`User Info - ${member.user.tag}`, member.user.displayAvatarURL())
    .setFooter(`Information requested by ${message.author.tag}`)
    .setThumbnail(member.user.displayAvatarURL({size: 1024}));

    message.channel.send(userinfo);
    }
}
