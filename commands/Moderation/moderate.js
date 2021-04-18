const Discord = require('discord.js')

module.exports = {
    name: 'moderate',
    description: 'Changes a member\'s username to Moderated Nickname <random code>',
    permissions: 'MANAGE_NICKNAMES',
    moderationCommand: true,
    usage: 'moderate <member>',
    async execute(client, message, args) {

        if (!message.guild.me.hasPermission('MANAGE_NICKNAMES')) return message.reply('I do not have the permission to manage nickanmes. Please give me the `Manage Nicknames` permission')

        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        if (!args[0]) return message.channel.send('I like moderating actual accounts')

        var member;

        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }
        if (!member) return message.channel.send('Please specify a valid member ID | The member must be on the server')

        if (member) {
            if (message.guild.me.roles.highest.position <= member.roles.highest.position) {
                message.channel.send('I cannot moderate this user\'s nickname, as their highest role is hoisted above me')
                return;
            }
        }

        let nick = '';
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ091234567890';
        for (i = 0; i < 6; i++) {
            nick += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        member.setNickname(`Moderated Nickname ${nick}`)
        message.reply('user has successfully been moderated!')
    }
}
