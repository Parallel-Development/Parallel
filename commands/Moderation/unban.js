const Discord = require('discord.js');
const Infraction = require('../../structures/Infraction');
const ModerationLogger = require('../../structures/ModerationLogger');
const punishmentSchema = require('../../schemas/punishment-schema');

module.exports = {
    name: 'unban',
    description: 'Unbans a member from the server',
    usage: 'unban [member]\nunban [member] <reason>',
    aliases: ['unbanish', 'pardon', 'revokeban'],
    permissions: Discord.Permissions.FLAGS.BAN_MEMBERS,
    requiredBotPermission: Discord.Permissions.FLAGS.BAN_MEMBERS,
    async execute(client, message, args) {

        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_user);

        const user = await client.util.getUser(client, args[0]);
        if (!user) return await client.util.throwError(message, client.config.errors.invalid_user);

        const reason = args.slice(1).join(' ') || 'Unspecified';

        const serverBans = await message.guild.bans.fetch();
        if (!serverBans.size) return await client.util.throwError(message, 'There are no users banned from this server');
        if (!await client.util.getUser(client, args[0])) return await client.util.throwError(message, client.config.errors.invalid_user)
        const userBanned = await message.guild.bans.fetch().then(bans => bans.find(ban => ban.user.id === user.id));
        if (!userBanned) return await client.util.throwError(message, 'This user is not banned');

        await message.guild.members.unban(user.id);

        await punishmentSchema.deleteMany({
            guildID: message.guild.id,
            userID: user.id,
            type: 'ban'
        })

        const punishmentID = client.util.generateID();

        new Infraction(client, 'Unban', message, message.member, user, { reason: reason, punishmentID: punishmentID, time: null, auto: false });
        new ModerationLogger(client, 'Unbanned', message.member, user, message.channel, { reason: reason, duration: null, punishmentID: punishmentID });

        const unbannedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`${client.config.emotes.success} **${user.tag}** has been unbanned`)

        return message.reply({ embeds: [unbannedEmbed] });


    }
}
