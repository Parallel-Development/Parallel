const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');

module.exports = {
    name: 'punishinfo',
    description: 'View more in depth detail of a punishment',
    usage: 'punishinfo [code]',
    aliases: ['case', 'caseinfo', 'punishment'],
    permissions: 'MANAGE_MESSAGES',
    async execute(client, message, args) {

        if (!args[0]) return message.reply(client.config.errorMessages.missing_argument_punishmentID);
        const ID = args[0];

        const findPunishmentID = await warningSchema.findOne({
            guildID: message.guild.id,
            warnings: {
                $elemMatch: {
                    punishmentID: ID
                }
            }
        })

        if (!findPunishmentID) return message.reply(client.config.errorMessages.invalid_punishmentID);

        const userID = findPunishmentID.warnings.find(key => key.punishmentID === ID).userID;
        const user = await client.users.fetch(userID).catch(() => {})
        const type = findPunishmentID.warnings.find(key => key.punishmentID === ID).type;
        const moderatorID = findPunishmentID.warnings.find(key => key).moderatorID;
        const moderator = await client.users.fetch(moderatorID).catch(() => {})
        const expires = findPunishmentID.warnings.find(key => key.punishmentID === ID).expires;
        const duration = findPunishmentID.warnings.find(key => key.punishmentID === ID).duration;
        const date = findPunishmentID.warnings.find(key => key.punishmentID === ID).date;
        const reason = findPunishmentID.warnings.find(key => key.punishmentID === ID).reason;

        const punishInfoEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor(`Punishment information`, client.user.displayAvatarURL())
        .setDescription(`Type: **${type}**`)
        .addField('User Mention', user)
        .addField('User Tag and ID', `**${user.tag}** - \`${user.id}\``)
        .addField('Moderator Mention', moderator)
        .addField('Moderator Tag and ID', `**${moderator.tag}** - \`${moderator.id}\``)
        .addField('Punishment Reason', reason.length <= 1500 ? reason : await client.util.createBin(reason))
        .addField('Punishment Date', date);
        if(duration && type !== 'Unmute') punishInfoEmbed.addField('Duration', duration);
        if(duration && type !== 'Unmute') punishInfoEmbed.addField('Expires', duration !== 'Permanent' ? expires - Date.now() > 0 ? client.util.timestamp(expires) : 'This punishment has already expired' : 'Never');

        return message.reply({ embeds: [punishInfoEmbed] });

    }
}
