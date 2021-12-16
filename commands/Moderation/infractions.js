const warningSchema = require('../../schemas/warning-schema');
const Discord = require('discord.js');

module.exports = {
    name: 'infractions',
    description: 'View the infractions of a member',
    usage: 'infractions\ninfractions [page]\ninfractions [member]\ninfractions [member] <page>\n\nFlags: `--automod`, `--manual`, `--permanent`, `--to-expire`',
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

        const filterFlags = args.filter(arg => arg.startsWith('--'));
        if (filterFlags.includes('--automod') && filterFlags.includes('--manual'))
            return client.util.throwError(message, 'cannot filter for both automod and manual infractions');
        if (filterFlags.includes('--permanent') && filterFlags.includes('--to-expire'))
            return client.util.throwError(message, 'cannot filter for both permanent and to-expire infractions');

        let userWarnings = await warningSchema.findOne({
            guildID: message.guild.id
        });

        userWarnings = userWarnings?.warnings?.filter(warning => warning.userID === member.id);

        if (!userWarnings?.length)
            return message.reply(`${member === message.author ? 'You have' : 'This user has'} no infractions!`);

        if (filterFlags.includes('--automod')) userWarnings = userWarnings?.filter(warning => warning.auto);
        if (filterFlags.includes('--manual')) userWarnings = userWarnings?.filter(warning => !warning.auto);
        if (filterFlags.includes('--permanent'))
            userWarnings = userWarnings?.filter(warning => warning.expires === 'Never');
        if (filterFlags.includes('--to-expire'))
            userWarnings = userWarnings?.filter(warning => warning.expires !== 'Never');

        if (!userWarnings?.length)
            return message.reply(
                `${member === message.author ? 'You have' : 'This user has'} no infractions from the filters provided!`
            );

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
            .setColor(client.util.getMainColor(message.guild))
            .setAuthor(`Warnings for ${user.tag} (${user.id}) - ${userWarnings.length}`, client.user.displayAvatarURL())
            .setFooter(`Page Number: ${pageNumber}/${amountOfPages}`);
        if (
            filterFlags.includes('--automod') ||
            filterFlags.includes('--manual') ||
            filterFlags.includes('--permanent') ||
            filterFlags.includes('--to-expire')
        )
            warningsEmbed.setDescription(`Filters: ${filterFlags.map(flag => `\`${flag}\``).join(', ')}`);

        for (let i = (pageNumber - 1) * 7, count = 0; i !== userWarnings.length && count !== 7; ++i, ++count) {
            const infraction = userWarnings[i];
            if (infraction.reason.length > 60) {
                infraction.reason = infraction.reason.substr(0, 60) + '...';
            }
            warningsEmbed.addField(
                `${i + 1}: ${infraction.type}`,
                `Reason: \`${infraction.reason}\`\nDate: ${infraction.date}\nPunishment ID: \`${infraction.punishmentID}\``
            );
        }

        const jumpToBeginning = new Discord.MessageButton()
            .setLabel('<<')
            .setCustomId('jumpToBeginning')
            .setStyle('SECONDARY');
        const goBack = new Discord.MessageButton().setLabel('<').setCustomId('goBack').setStyle('SECONDARY');
        const goForward = new Discord.MessageButton().setLabel('>').setCustomId('goForward').setStyle('SECONDARY');
        const jumpToBack = new Discord.MessageButton().setLabel('>>').setCustomId('jumpToBack').setStyle('SECONDARY');
        const stop = new Discord.MessageButton().setLabel('#').setCustomId('stop').setStyle('SECONDARY');
        const pageButtons = new Discord.MessageActionRow().addComponents(
            jumpToBeginning,
            goBack,
            goForward,
            jumpToBack,
            stop
        )

        return message.reply({ embeds: [warningsEmbed], components: [pageButtons] });
    }
};
