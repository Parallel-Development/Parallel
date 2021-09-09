const warningSchema = require('../../schemas/warning-schema');
const Discord = require('discord.js');

module.exports = {
    name: 'remove-infraction',
    description: 'Remove an infraction from a member',
    usage: 'remove-infraction [PUNISHMENT ID]',
    aliases: ['delwarn', 'rmpunish', 'removepunish', 'rminfraction'],
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, message, args) {

        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_punishmentID);
        const ID = args[0];

        const findPunishmentID = await warningSchema.findOne({
            guildID: message.guild.id,
            warnings: {
                $elemMatch: {
                    punishmentID: ID
                }
            }
        })

        if (!findPunishmentID) return await client.util.throwError(message, client.config.errors.invalid_punishmentID);

        const moderatorID = findPunishmentID.warnings.find(key => key.punishmentID === ID).moderatorID;
        const userID = findPunishmentID.warnings.find(key => key.punishmentID === ID).userID

        if (message.author.id !== moderatorID && !message.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD)) return await client.util.throwError(message, 'You can only delete warnings that you distributed');

        await warningSchema.updateOne({
            guildID: message.guild.id,
            warnings: {
                $elemMatch: {
                    punishmentID: ID
                }
            }
        },
        {
            $pull: {
                warnings: {
                    punishmentID: ID
                }
            }
        })

        const removedInfractionEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`${client.config.emotes.success} Infraction \`${ID}\` has been removed from **${(await client.users.fetch(userID)).tag}**`)

        return message.reply({ embeds: [removedInfractionEmbed] });
    }
}
