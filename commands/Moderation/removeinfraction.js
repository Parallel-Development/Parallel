const warningSchema = require('../../schemas/warning-schema')
const Discord = require('discord.js');

module.exports = {
    name: 'removeinraction',
    description: 'Remove an infraction from a member',
    usage: 'removeinfraction [PUNISHMENT ID]',
    aliases: ['delwarn', 'deletewarn', 'rmpunish', 'removepunish', 'rminfraction'],
    permissions: 'MANAGE_MESSAGES',
    async execute(client, message, args) {

        if (!args[0]) return message.channel.send(client.config.errorMessages.missing_argument_punishmentID);
        const ID = args[0];

        const findPunishmentID = await warningSchema.findOne({
            guildID: message.guild.id,
            warnings: {
                $elemMatch: { 
                    punishmentID: ID
                }
            }
        })

        if (!findPunishmentID) return message.channel.send(client.config.errorMessages.invalid_punishmentID);

        const moderatorID = findPunishmentID.warnings.find(key => key.punishmentID === ID).moderatorID;
        const userID = findPunishmentID.warnings.find(key => key.punishmentID === ID).userID

        if (message.author.id !== moderatorID && !message.member.hasPermission('MANAGE_GUILD')) return message.channel.send('You can only delete warnings that you distributed');

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
        
        return message.channel.send(removedInfractionEmbed);
    }
}