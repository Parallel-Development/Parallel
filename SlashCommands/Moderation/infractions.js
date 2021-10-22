const warningSchema = require('../../schemas/warning-schema');
const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'infractions',
    description: 'View the infractions of a member or yourself',
    data: new SlashCommandBuilder()
        .setName('infractions')
        .setDescription('View the infractions of a member or yourself')
        .addUserOption(option => option.setName('user').setDescription('The user to get the infractions of'))
        .addIntegerOption(option => option.setName('page').setDescription('The page number to view'))
        .addBooleanOption(option => option.setName('automod').setDescription('Filter for automod infractions'))
        .addBooleanOption(option => option.setName('manual').setDescription('Filter for manual infractions'))
        .addBooleanOption(option => option.setName('permanent').setDescription('Filter for permanent infractions'))
        .addBooleanOption(option => option.setName('to-expire').setDescription('Filter for infractions set to expire')),
    async execute(client, interaction, args) {
        let member = await client.util.getUser(client, args['user']);

        let pageNumber = args['page'] || 0;

        if (!member) member = interaction.user;

        if (
            member !== interaction.user &&
            !interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)
        )
            return client.util.throwError(
                interaction,
                'You do not have the permission to view the infractions of other members'
            );

        if (args['automod'] && args['manual'])
            return client.util.throwError(interaction, 'cannot filter for both automod and manual infractions');
        if (args['permanent'] && args['to-expire'])
            return client.util.throwError(interaction, 'cannot filter for both permanent and to-expire infractions');

        let userWarnings = await warningSchema.findOne({
            guildID: interaction.guild.id
        });
        userWarnings = userWarnings?.warnings?.filter(warning => warning.userID === member.id);

        if (!userWarnings?.length)
            return interaction.reply(`${member === interaction.user ? 'You have' : 'This user has'} no infractions!`);

        if (args['automod']) userWarnings = userWarnings?.filter(warning => warning.auto);
        if (args['manual']) userWarnings = userWarnings?.filter(warning => !warning.auto);
        if (args['permanent']) userWarnings = userWarnings?.filter(warning => warning.expires === 'Never');
        if (args['to-expire']) userWarnings = userWarnings?.filter(warning => warning.expires !== 'Never');

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
            return client.util.throwError(
                interaction,
                `Please specify a page number between \`1\` and \`${amountOfPages}\``
            );
        } else if (pageNumber < 1) {
            pageNumber = 1;
        }

        const user = await client.users.fetch(member.id);

        const warningsEmbed = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(interaction.guild))
            .setAuthor(`Warnings for ${user.tag} (${user.id}) - ${userWarnings.length}`, client.user.displayAvatarURL())
            .setFooter(`Page Number: ${pageNumber}/${amountOfPages}`);
        if (args['automod'] || args['manual'] || args['permanent'] || args['to-expire'])
            warningsEmbed.setDescription(
                `Filters: ${Object.keys(args)
                    .filter(arg => arg === 'automod' || arg === 'manual' || arg === 'permanent' || arg === 'to-expire')
                    .map(flag => `\`${flag}\``)}`
            );

        let count = 0;
        let i = (pageNumber - 1) * 7;
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

        return interaction.reply({ embeds: [warningsEmbed], components: [pageButtons] });
    }
};
