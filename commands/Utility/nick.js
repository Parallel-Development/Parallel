const Discord = require('discord.js')

module.exports = {
    name: 'nick',
    description: 'Changes the nickname of the specified member to the specified nickname',
    permisisons: 'MANAGE_NICKNAMES',
    usage: 'nick <user> [New Nickname]',
    async execute(clinet, message, args) {
        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        if (!args[0]) return message.channel.send(missingarguser);

        var member;

        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }
        if (!member) return message.channel.send('Please specify a valid member | The member must be on the server')

        let nick = args.slice(1).join(' ')
        if(!nick) nick = null;

        if(nick == null && member.user.username == member.displayName) return message.reply('please specify a nickname to assign to the member')

        member.setNickname(nick)

        if(nick == null) {
            message.reply(`successfully reset the nickname for ${member}`)
        } else {
            message.reply(`successfully changed the nickname for ${member} to **${nick}**`)
        }
    }
}