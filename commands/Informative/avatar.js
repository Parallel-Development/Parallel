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
        let member;

        if (!args[0]) member = message.member
        else {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        }
        if (!member) return message.channel.send('Please specify a valid member | The member must be on the server')

        const avatar = new Discord.MessageEmbed()
            .setColor('#90ee90')
            .setAuthor(`${member.user.tag}'s avatar`, client.user.displayAvatarURL())
            .setImage(member.user.displayAvatarURL({dynamic: true, size: 1024}))

        message.channel.send(avatar)
    }
}
