const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'reason',
    description: 'Change the reason of an infraction',
    data: new SlashCommandBuilder().setName('reason').setDescription('Change the reason of an infraction')
    .addStringOption(option => option.setName('id').setDescription('The ID of the infraction to change').setRequired(true))
    .addStringOption(option => option.setName('new_reason').setDescription('The new reason to change the punishment to').setRequired(true)),
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, interaction, args) {
 
        const ID = args['id'];

        const findPunishmentID = await warningSchema.findOne({
            guildID: interaction.guild.id,
            warnings: {
                $elemMatch: {
                    punishmentID: ID
                }
            }
        })

        if (!findPunishmentID) return client.util.throwError(interaction, client.config.errors.invalid_punishmentID);

        const moderatorID = findPunishmentID.warnings.find(key => key.punishmentID === ID).moderatorID;
        const userID = findPunishmentID.warnings.find(key => key.punishmentID === ID).userID;
        const reason = findPunishmentID.warnings.find(key => key.punishmentID === ID).reason;

        if (moderatorID !== interaction.user.id && !interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) return client.util.throwError(interaction, 'You can only delete warnings that you distributed');

        const newReason = args['new_reason'];
        if (newReason === reason) return client.util.throwError(interaction, 'The new reason must be different from the old reason!');

        await warningSchema.updateOne({
            guildID: interaction.guild.id,
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
        .setDescription(`✅ Reason for infraction \`${ID}\` has been updated to ${newReason.length <= 1024 ? newReason : await client.util.createBin(newReason)} for **${(await client.users.fetch(userID)).tag}**`)

        return interaction.reply({ embeds: [changedInfractionReasonEmbed] });
    }
}
