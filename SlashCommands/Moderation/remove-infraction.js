const warningSchema = require('../../schemas/warning-schema');
const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'remove-infraction',
    description: 'Remove an infraction from a member',
    data: new SlashCommandBuilder().setName('remove-infraction').setDescription('Remove an infraction from a member')
    .addStringOption(option => option.setName('id').setDescription('The infraction ID to remove').setRequired(true)),
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
        const userID = findPunishmentID.warnings.find(key => key.punishmentID === ID).userID

        if (interaction.user.id !== moderatorID && !interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD)) return client.util.throwError(message, 'You can only delete warnings that you distributed');

        await warningSchema.updateOne({
            guildID: interaction.guild.id,
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
        .setDescription(`✅ Infraction \`${ID}\` has been removed from **${(await client.users.fetch(userID)).tag}**`)

        return interaction.reply({ embeds: [removedInfractionEmbed] });
    }
}
