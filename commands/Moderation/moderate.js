const Discord = require('discord.js')

module.exports = {
    name: 'moderate',
    description: 'Changes a member\'s username to Moderated_<random code>',
    permissions: 'MANAGE_NICKNAMES',
    moderationCommand: true,
    usage: 'moderate <member>',
    async execute(client, message, args) {

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to moderate member nicknames. Please give me the `Manage Nicknames` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL());

        if (!message.guild.me.hasPermission('MANAGE_NICKNAMES')) return message.channel.send()

        function getUserFromMention(mention) {
            if (!mention) return false;
            const matches = mention.match(/^<@!?(\d+)>$/);
            if (!matches) return mention;
            const id = matches[1];

            return id;
        }

        if (!args[0]) return message.channel.send('Please specify a member')

        var member;

        try {
            member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
        } catch (err) {
            member = null
        }
        if (!member) return message.channel.send('Please specify a valid member | The member must be on the server')

        if (member) {
            if (member.id == '745401642664460319') return message.channel.send('no.')
            if (message.guild.me.roles.highest.position <= member.roles.highest.position) {
                message.channel.send('I cannot moderate this user\'s nickname, as their highest role is equal or higher to me in hierarchy ')
                return;
            }
            if(message.member.roles.highest.position <= member.roles.highest.position) {
                return message.reply('you cannot moderate the user for their highest role is equal or above your highest role in hierarchy')
            }
        }

        let nick = '';
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ091234567890';
        for (i = 0; i < 6; i++) {
            nick += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        member.setNickname(`Moderated_${nick}`)
        message.reply(`user has been moderated with code \`${nick}\``)
    }
}
