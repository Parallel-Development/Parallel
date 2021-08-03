const warningSchema = require('../../schemas/warning-schema');
const Discord = require('discord.js');

module.exports = {
    name: 'infractions',
    description: 'View the infractions of a member',
    usage: 'infractions\ninfractions [member]\infractions [member] <page>',
    aliases: ['warnings', 'warns', 'punishments', 'record'],
    async execute(client, message, args) {

        let member = message.mentions.members.first()
        || message.guild.members.cache.get(args[0])
        || await client.users.fetch(args[0]).catch(() => { })

        let pageNumber = 0;
        if(!member && !parseInt(args[0]) !== NaN) {
            pageNumber = args[0];
            member = message.member;
        }

        if (member !== message.member && !message.member.permissions.has('MANAGE_MESSAGES')) return message.reply('You do not have the permission to view the infractions of other members');

        const userWarnings = await warningSchema.findOne({
            guildID: message.guild.id,
            warnings: {
                $elemMatch: { userID: member.id }
            }
        })

        if(!userWarnings || !userWarnings.warnings.length) return message.reply('This user has no infractions!');

        if(!pageNumber) {
            if(!args[1]) pageNumber = 1;
            else {
                pageNumber = Math.round(args[1]);
                if(!pageNumber) pageNumber = 1;
            }
        }

        let amountOfPages = Math.round(userWarnings.warnings.length / 7);
        if (amountOfPages < userWarnings.warnings.length / 7) amountOfPages++

        if (pageNumber > amountOfPages) {
            return message.reply(`Please specify a page number between \`1\` and \`${amountOfPages}\``)
        } else if (pageNumber < 1) {
            pageNumber = 1
        }

        const user = await client.users.fetch(member.id);

        const warningsEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor(`Warnings for ${user.tag} - ${userWarnings.warnings.length}`, client.user.displayAvatarURL())
        .setDescription('All times are in UTC')
        .setFooter(`Page Number: ${pageNumber}/${amountOfPages}`)

        let count = 0;
        var i = (pageNumber - 1) * 7;
        while (i !== userWarnings.warnings.length && count !== 7) {
            const infraction = userWarnings.warnings[i]
            count++
            if (infraction.reason.length > 60) {
                infraction.reason = infraction.reason.substr(0, 60) + '...'
            }
            warningsEmbed.addField(`${i + 1}: ${infraction.type}`, `Reason: \`${infraction.reason}\`\nDate: ${infraction.date}\nPunishment ID: \`${infraction.punishmentID}\``)
            ++i
        }

        return message.reply({ embeds: [warningsEmbed] })

    }

}
