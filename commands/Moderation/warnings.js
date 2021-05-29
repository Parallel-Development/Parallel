const Discord = require('discord.js');
const { isInteger } = require('mathjs');
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema')

module.exports = {
    name: 'warnings',
    description: 'Fetches a user\'s warnings in the server',
    usage: 'warnings <member> (page number)',
    aliases: ['infractions', 'modlogs', 'search', 'record', 'warns'],
    async execute(client, message, args) {

        const prefixSetting = await settingsSchema.findOne({
            guildid: message.guild.id
        })
        const { prefix } = prefixSetting

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

        if(!args[0]) member = message.member;

        if(!message.member.hasPermission('MANAGE_MESSAGES') && member !== message.member) {
            const onlyYourWarnings = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You can only view your warnings and not the warnings of anyone else. To view warnings of other users, you need the `MANAGE MESSAGES` permission\n\nIf you are trying to view a page number of your own warnings, mention yourself, then specify the page number')

            return message.channel.send(onlyYourWarnings)
        }

        if (!member) {
            try {
                member = await client.users.fetch(args[0])
            } catch {
                return message.channel.send('Please specify a valid member | If you specified a page number trying to view your own warnings, you\'ll have to mention yourself first')
            }
        }

        const warningsCheck = await warningSchema.findOne({
            guildid: message.guild.id,
            userid: member.id
        })

        if (!warningsCheck || warningsCheck.warnings.length == 0) return message.channel.send('This user has no infractions!')

        let pageNumber = args[1];
        if (!pageNumber) pageNumber = 1;
        if (typeof(parseInt(pageNumber)) !== 'number') {
            return message.channel.send('Please specify a valid page **number**')
        } 
        pageNumber = Math.round(pageNumber)
        if(isNaN(pageNumber)) {
            return message.channel.send('The page number must be a **number**')
        }

        let amountOfPages = Math.round(warningsCheck.warnings.length / 7);
        if(amountOfPages < warningsCheck.warnings.length / 7) amountOfPages++

        if (pageNumber > amountOfPages) {
            return message.channel.send(`Please specify a page number between \`1\` and \`${amountOfPages}\``)
        } else if(pageNumber < 1) {
            pageNumber = 1
        }

        const u = await client.users.fetch(member.id)
        const warningsEmbed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setAuthor(`Warnings for ${u.tag} - ${warningsCheck.warnings.length}`, client.user.displayAvatarURL())
            .setDescription(`All times are in GMT | Run \`punishinfo (code)\` to get more information about a punishment`)
            .setFooter(`Page ${pageNumber}/${amountOfPages} | ${prefix}warnings (user) <page number> to access a certain page`)

        let i = (pageNumber - 1) * 7;
        let count = 0
        while(i < warningsCheck.warnings.length && count < 7) {
            let x = warningsCheck.warnings[i]
            count++
            if (x.reason.length > 60) {
                x.reason = x.reason.substr(0, 60) + '...'
            }
            warningsEmbed.addField(`${i + 1}: ${x.type}`, `Reason: \`${x.reason}\`\nDate: \`${x.date}\`\nPunishment ID: \`${x.code}\``)
            i += 1
        }

        message.channel.send(warningsEmbed)
    }
}
