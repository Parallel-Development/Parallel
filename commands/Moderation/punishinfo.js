const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');

module.exports = {
    name: 'punishinfo',
    description: 'View more in depth detail of a punishment',
    usage: 'punishinfo [code]',
    aliases: ['case', 'caseinfo', 'punishment'],
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, message, args) {
        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_punishmentID);
        const ID = args[0];

        const findPunishmentID = await warningSchema.findOne({
            guildID: message.guild.id,
            warnings: {
                $elemMatch: {
                    punishmentID: ID
                }
            }
        });

        if (!findPunishmentID) return client.util.throwError(message, client.config.errors.invalid_punishmentID);

        const userID = findPunishmentID.warnings.find(key => key.punishmentID === ID).userID;
        const user = await client.users.fetch(userID).catch(() => {});
        const type = findPunishmentID.warnings.find(key => key.punishmentID === ID).type;
        const moderatorID = findPunishmentID.warnings.find(key => key.punishmentID === ID).moderatorID;
        const moderator = await client.users.fetch(moderatorID).catch(() => {});
        const expires = findPunishmentID.warnings.find(key => key.punishmentID === ID).expires;
        const duration = findPunishmentID.warnings.find(key => key.punishmentID === ID).duration;
        const date = findPunishmentID.warnings.find(key => key.punishmentID === ID).date;
        const reason = findPunishmentID.warnings.find(key => key.punishmentID === ID).reason;

        const punishInfoEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setAuthor(`Punishment information`, client.user.displayAvatarURL())
            .setDescription(`Type: **${type}**`)
            .addField('User Mention', user.toString())
            .addField('User Tag and ID', `**${user.tag}** - \`${user.id}\``)
            .addField('Moderator Mention', moderator.toString())
            .addField('Moderator Tag and ID', `**${moderator.tag}** - \`${moderator.id}\``)
            .addField('Punishment Reason', reason.length <= 1024 ? reason : await client.util.createBin(reason))
            .addField('Punishment Date', date);
        if (duration && type !== 'Unmute' && type !== 'Kick') punishInfoEmbed.addField('Duration', duration);
        if (duration && type !== 'Unmute' && type !== 'Kick')
            punishInfoEmbed.addField(
                'Expires',
                duration !== 'Permanent'
                    ? expires - Date.now() > 0
                        ? client.util.timestamp(expires)
                        : 'This punishment has already expired'
                    : 'Never'
            );

        return message.reply({ embeds: [punishInfoEmbed] });
    }
};
