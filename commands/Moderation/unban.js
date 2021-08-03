const Discord = require('discord.js');
const NewInfraction = require('../../structures/NewInfraction');
const ModerationLogger = require('../../structures/ModerationLogger');
const punishmentSchema = require('../../schemas/punishment-schema');

module.exports = {
    name: 'unban',
    description: 'Unbans a member from the server',
    usage: 'unban [member]\nunban [member] <reason>',
    aliases: ['unbanish', 'pardon', 'revokeban'],
    permissions: 'BAN_MEMBERS',
    requiredBotPermission: 'BAN_MEMBERS',
    async execute(client, message, args) {

        if(!args[0]) return message.reply(client.config.errorMessages.missing_argument_user);

        const user = await client.users.fetch(args[0]).catch(() => { });
        if(!user) return message.reply(client.config.errorMessages.invalid_user);

        const reason = args.slice(1).join(' ') || 'Unspecified';

        const serverBans = await message.guild.bans.fetch();
        if(!serverBans.size) return message.reply('There are no users banned from this server')
        const userBanned = await message.guild.bans.fetch().then(bans => bans.find(ban => ban.user.id === user.id));
        if(!userBanned) return message.reply('This user is not banned');

        await message.guild.members.unban(user.id);

        await punishmentSchema.deleteMany({
            guildID: message.guild.id,
            userID: user.id,
            type: 'ban'
        })

        const punishmentID = client.util.generateRandomBase62String();

        NewInfraction.run(client, 'Unban', message, user, reason, punishmentID, null, false);
        ModerationLogger.run(client, 'Unbanned', message.member, user, message.channel, reason, null, punishmentID);

        const unbannedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`${client.config.emotes.success} **${user.tag}** has been unbanned`)

        return message.reply({ embeds: [unbannedEmbed] });


    }
}
