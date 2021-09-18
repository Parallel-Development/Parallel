const Discord = require('discord.js');
const punishmentSchema = require('../../schemas/punishment-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'baninfo',
    description: 'View the ban information of a user',
    data: new SlashCommandBuilder().setName('baninfo').setDescription('View the ban information of a user')
    .addUserOption(option => option.setName('user').setDescription('The user to get ban information on').setRequired(true)),
    permissions: Discord.Permissions.FLAGS.BAN_MEMBERS,
    requiredBotPermission: Discord.Permissions.FLAGS.BAN_MEMBERS,
    async execute(client, interaction, args) {

        const user = await client.util.getUser(client, args['user']);

        const banInformation = await interaction.guild.bans.fetch().then(bans => bans.find(u => u.user.id === user.id));
        if (!banInformation) return interaction.reply('This user is not banned');

        const banInfoEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.punishment[2])
        .setAuthor(`Ban information for ${user.tag}`, client.user.displayAvatarURL())
        .addField('Reason', banInformation.reason || "No reason provided")

        const guildPunishments = await punishmentSchema.find({
            guildID: interaction.guild.id
        })

        const userBan = guildPunishments.find(info => info.userID === user.id && info.type === 'ban')

        if (userBan) {
            banInfoEmbed.addField('Date', userBan.date, true)
            banInfoEmbed.addField('Expires', client.util.timestamp(userBan.expires), true)
        }

        return interaction.reply({ embeds: [banInfoEmbed] });

    }
}