const Discord = require('discord.js');
const warningSchema = require('../schemas/warning-schema');

module.exports.run = async(client, interaction) => {

    const user = await client.util.getUser(client, 
        /#[0-9]{4} \([0-9]{18}\)/.exec(
            interaction.channel.messages.cache.get(interaction.message.id)
            .embeds[0].author.name)[0]
            .replace('#', '').replaceAll(' ', '').replace('(', '').replace(')', '')
            .slice(4)
    );

    let whoToCheck = interaction.message?.interaction?.user || interaction.channel.messages.cache.get(interaction.message?.reference.messageId)?.author;
    if(!whoToCheck) whoToCheck = await interaction.channel.messages.fetch(interaction.message.reference.messageId).then(message => interaction.channel.messages.cache.get(message.id).author);

    if(interaction.user !== whoToCheck) return client.util.throwError(interaction, client.config.errors.no_button_access);
    let currentPage = +interaction.channel.messages.cache.get(interaction.message.id).embeds[0].footer.text.slice(13, 14);
    let userWarnings = await warningSchema.findOne({
        guildID: interaction.guild.id
    })
    userWarnings = userWarnings?.warnings?.filter(warning => warning.userID === user.id);
    if(!userWarnings.length) {
        const noWarningsEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor(`Warnings for ${user.tag} (${user.id}) - ${userWarnings.length}`, client.user.displayAvatarURL())
        .setDescription('This user does not have any infractions');

        return interaction.update({ embeds: [noWarningsEmbed] });
    }

    let amountOfPages = Math.floor(userWarnings.length / 7);
    if (amountOfPages < userWarnings.length / 7) amountOfPages++;

    switch (interaction.customId) {
        case 'jumpToBeginning': currentPage = 1; break;
        case 'goBack':
            if(currentPage === 1) currentPage = amountOfPages;
            else --currentPage;
            break;
        case 'goForward':
            if(currentPage === amountOfPages) currentPage = 1;
            else ++currentPage;
            break;
        case 'jumpToBack': currentPage = amountOfPages; break;
    }


    const warningsEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor(`Warnings for ${user.tag} (${user.id}) - ${userWarnings.length}`, client.user.displayAvatarURL())
        .setFooter(`Page Number: ${currentPage}/${amountOfPages}`)

    let count = 0;
    let i = (currentPage - 1) * 7;
    while (i !== userWarnings.length && count !== 7) {
        const infraction = userWarnings[i];
        count++
        if (infraction.reason.length > 60) {
            infraction.reason = infraction.reason.substr(0, 60) + '...'
        }
        warningsEmbed.addField(`${i + 1}: ${infraction.type}`, `Reason: \`${infraction.reason}\`\nDate: ${infraction.date}\nPunishment ID: \`${infraction.punishmentID}\``)
        ++i
    }

    return interaction.update({ embeds: [warningsEmbed] })
}