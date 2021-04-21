const Discord = require('discord.js');
const { isInteger } = require('mathjs');
const warningSchema = require('../../schemas/warning-schema')

module.exports = {
    name: 'warnings',
    description: 'Fetches a user\'s warnings in the server',
    permissions: 'MANAGE_MESSAGES',
    moderationCommand: true,
    usage: 'warnings <member>',
    aliases: ['infractions', 'modlogs', 'search', 'record'],
    async execute(client, message, args) {

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

        if (!args[0]) return message.channel.send(missingarguser);

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

        if (!member) {
            try {
                member = await client.users.fetch(args[0])
            } catch {
                return message.channel.send('Please specify a valid member')
            }
        }

        const warningsCheck = await warningSchema.findOne({
            guildid: message.guild.id,
            userid: member.id
        })

        if (!warningsCheck) return message.channel.send('This user has no infractions!')
        const u = await client.users.fetch(member.id)
        const warningsEmbed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setAuthor(`Warnings for ${u.tag}`, client.user.displayAvatarURL())
            .setDescription(`All times are in GMT | Run \`punishinfo (code)\` to get more information about a punishment`)

        let count = 0
        for (const i of warningsCheck.warnings) {
            count++
            if (i.reason.length > 20) {
                i.reason = i.reason.substr(0, 30) + '...'
            }
            warningsEmbed.addField(`${count}: ${i.type}`, `Reason: \`${i.reason}\`\nDate: \`${i.date}\`\nPunishment ID: \`${i.code}\``)
        }

        if (count = 0) return message.channel.send('This user has no infractions!')

        message.channel.send(warningsEmbed)
    }
}
