const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'clear-infractions',
    description: 'Clears all infractions from a user',
    data: new SlashCommandBuilder().setName('clear-infractions').setDescription('Clear all infractions from a user')
    .addUserOption(option => option.setName('user').setDescription('The user to clear all infractions from').setRequired(true)),
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    async execute(client, interaction, args)  {

        const user = await client.util.getUser(client, args['user'])
        if (!user) return client.util.throwError(interaction, client.config.errors.invalid_user);

        const guildWarnings = await warningSchema.findOne({
            guildID: interaction.guild.id,
        })
        const userWarnings = guildWarnings.warnings.filter(warning => warning.userID === user.id)

        if (!userWarnings.length) return interaction.reply('This user has no infractions');

        if (global.confirmationRequests.some(request => request.ID === interaction.user.id)) global.confirmationRequests.pop({ ID: interaction.user.id })
        global.confirmationRequests.push({ ID: interaction.user.id, guildID: interaction.guild.id, request: 'clearInfractions', at: Date.now(), data: { ID: user.id } });
        return interaction.reply(`Are you sure? This will delete all warnings from **${user.tag}**. To confirm, run \`/confirm\`. To cancel, run \`/cancel\``);

    }
}
