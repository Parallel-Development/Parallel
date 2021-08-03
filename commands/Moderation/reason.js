const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');

module.exports = {
    name: 'reason',
    description: 'Change the reason of an infraction',
    usage: 'reason [punishment ID] <new punishment ID>',
    aliases: ['changereason'],
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

        const moderatorID = findPunishmentID.warnings.find(key => key.punishmentID === ID).moderatorID;
        const userID = findPunishmentID.warnings.find(key => key.punishmentID === ID).userID;
        const reason = findPunishmentID.warnings.find(key => key.punishmentID === ID).reason;

        if (moderatorID !== message.author.id && !message.member.permissions.has('MANAGE_MESSAGES')) return message.reply('You can only delete warnings that you distributed');

        const newReason = args.slice(1).join(' ');
        if(!newReason) return message.reply('Please specify a new reason');
        if(newReason === reason) return message.reply('The new reason must be different from the old reason!');

        await warningSchema.updateOne({
            guildID: message.guild.id,
            warnings: {
                $elemMatch: {
                    punishmentID: ID
                }
            }
        },
            {
                $set: {
                    "warnings.$.reason": newReason
                }
            })

        const changedInfractionReasonEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`${client.config.emotes.success} Reason for infraction \`${ID}\` has been updated to ${newReason.length < 1500 ? newReason : await client.util.createBin(newReason)} for **${(await client.users.fetch(userID)).tag}**`)

        return message.reply({ embeds: [changedInfractionReasonEmbed] });
    }
}
