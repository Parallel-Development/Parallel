const warningSchema = require('../../schemas/warning-schema');
const Discord = require('discord.js');

module.exports = {
    name: 'infractions',
    description: 'View the infractions of a member',
    usage: 'infractions\ninfractions [page]\ninfractions [member]\ninfractions [member] <page>',
    aliases: ['warnings', 'warns', 'punishments', 'record'],
    async execute(client, message, args) {
        let member = await client.util.getUser(client, args[0]);

        let pageNumber = 0;
        if (!member && parseInt(args[1])) pageNumber = args[1];
        else if (parseInt(args[0]) && !member) pageNumber = parseInt(args[0]);
        else if (member && parseInt(args[1])) pageNumber = args[1];

        if (!member) member = message.author;

        if (member !== message.author && !message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
            return client.util.throwError(
                message,
                'You do not have the permission to view the infractions of other members'
            );

        let userWarnings = await warningSchema.findOne({
            guildID: message.guild.id
        });
        userWarnings = userWarnings?.warnings?.filter(warning => warning.userID === member.id);

        if (!userWarnings?.length)
            return message.reply(`${member === message.author ? 'You have' : 'This user has'} no infractions!`);

        if (!pageNumber) {
            if (!args[1]) pageNumber = 1;
            else {
                pageNumber = Math.floor(args[1]);
                if (!pageNumber) pageNumber = 1;
            }
        }

        let amountOfPages = Math.floor(userWarnings.length / 7);
        if (amountOfPages < userWarnings.length / 7) amountOfPages++;

        if (pageNumber > amountOfPages) {
            return message.reply(`Please specify a page number between \`1\` and \`${amountOfPages}\``);
        } else if (pageNumber < 1) {
            pageNumber = 1;
        }

        const user = await client.users.fetch(member.id);

        const warningsEmbed = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(message.guild))
            .setAuthor(`Warnings for ${user.tag} (${user.id}) - ${userWarnings.length}`, client.user.displayAvatarURL())
            .setFooter(`Page Number: ${pageNumber}/${amountOfPages}`);

        let count = 0;
        var i = (pageNumber - 1) * 7;
        while (i !== userWarnings.length && count !== 7) {
            const infraction = userWarnings[i];
            count++;
            if (infraction.reason.length > 60) {
                infraction.reason = infraction.reason.substr(0, 60) + '...';
            }
            warningsEmbed.addField(
                `${i + 1}: ${infraction.type}`,
                `Reason: \`${infraction.reason}\`\nDate: ${infraction.date}\nPunishment ID: \`${infraction.punishmentID}\``
            );
            ++i;
        }

        const jumpToBeginning = new Discord.MessageButton()
            .setEmoji('↩')
            .setCustomId('jumpToBeginning')
            .setStyle('PRIMARY');
        const goBack = new Discord.MessageButton().setEmoji('◀').setCustomId('goBack').setStyle('PRIMARY');
        const goForward = new Discord.MessageButton().setEmoji('▶').setCustomId('goForward').setStyle('PRIMARY');
        const jumpToBack = new Discord.MessageButton().setEmoji('↪').setCustomId('jumpToBack').setStyle('PRIMARY');
        const pageButtons = new Discord.MessageActionRow().addComponents(
            jumpToBeginning,
            goBack,
            goForward,
            jumpToBack
        );

        return message.reply({ embeds: [warningsEmbed], components: [pageButtons] });
    }
};
