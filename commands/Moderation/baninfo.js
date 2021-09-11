const Discord = require('discord.js');
const punishmentSchema = require('../../schemas/punishment-schema');

module.exports = {
    name: 'baninfo',
    description: 'View the ban information of a user',
    usage: 'baninfo [user]',
    permissions: Discord.Permissions.FLAGS.BAN_MEMBERS,
    requiredBotPermission: Discord.Permissions.FLAGS.BAN_MEMBERS,
    async execute(client, message, args) {

        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_user);

        const user = await client.util.getUser(client, args[0]);
        if (!user) return await client.util.throwError(message, client.config.errors.invalid_user);

        const banInformation = await message.guild.bans.fetch().then(bans => bans.find(u => u.user.id === user.id));
        if (!banInformation) return message.reply('This user is not banned');

        const banInfoEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.punishment[2])
        .setAuthor(`Ban information for ${user.tag}`, client.user.displayAvatarURL())
        .addField('Reason', banInformation.reason || "No reason provided")

        const guildPunishments = await punishmentSchema.find({
            guildID: message.guild.id
        })

        const userBan = guildPunishments.find(info => info.userID === user.id && info.type === 'ban')

        if (userBan) {
            banInfoEmbed.addField('Date', userBan.date, true)
            banInfoEmbed.addField('Expires', client.util.timestamp(userBan.expires), true)
        }

        return message.reply({ embeds: [banInfoEmbed] });

    }
}