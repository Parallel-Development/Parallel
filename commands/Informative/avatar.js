const Discord = require('discord.js');
const { execute } = require('../Moderation/warnings');

module.exports = {
    name: 'avatar',
    description: 'Displays the specified member\'s avatar',
    usage: 'avatar <member>',
    aliases: ['av', 'icon', 'pfp'],
    async execute(client, message, args) {
        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        let userNotMember = false

        let member;

        if (!args[0]) member = message.member
        else {
            try {
                member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
            } catch (err) {
                member = null
            }
            if (!member) {
                try {
                    member = await client.users.fetch(args[0])
                    userNotMember = true
                } catch {
                    return message.channel.send('Please specify a valid member')
                }
            }
        }

        const u = await client.users.fetch(member.id)

        const avatar = new Discord.MessageEmbed()
            .setColor('#90ee90')
            .setAuthor(`${u.tag}'s avatar`, client.user.displayAvatarURL())
        if(!userNotMember) avatar.setImage(member.user.displayAvatarURL({dynamic: true, size: 1024}))
        if(userNotMember) avatar.setImage(member.displayAvatarURL({dynamic: true, size: 1024}))

        message.channel.send(avatar)
    }
}
