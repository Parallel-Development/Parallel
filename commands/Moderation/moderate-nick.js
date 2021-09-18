const Discord = require('discord.js');

module.exports = {
    name: 'moderate-nick',
    description: 'Set the nickname of a user to Moderated_(Random Code) - Useful for filtering out names blacklisted on a server',
    usage: 'moderate-nick [member]\nmoderate-nick [member] --dm\nmoderate-nick [member] --dm <reason>',
    aliases: ['moderate-nickname', 'modnick', 'moderate', 'mod'],
    permissions: Discord.Permissions.FLAGS.MANAGE_NICKNAMES,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_NICKNAMES,
    async execute(client, message, args) {

        if (!args[0]) return await client.util.throwError(message, client.config.errors.missing_argument_member);

        const member = await client.util.getMember(message.guild, args[0])
        if (!member) return await client.util.throwError(message, client.config.errors.invalid_member);

        if (member.id === client.user.id) return await client.util.throwError(message, client.config.errors.cannot_punish_myself);
        if (member.id === message.member.id) return await client.util.throwError(message, client.config.errors.cannot_punish_yourself);
        if (member.roles.highest.position >= message.member.roles.highest.position && message.member.id !== message.guild.ownerId) return await client.util.throwError(message, client.config.errors.hierarchy);
        if (member.roles.highest.position >= message.guild.me.roles.highest.position) return await client.util.throwError(message, client.config.errors.my_hierarchy);

        let code = '';
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i !== 8; ++i) {
            code += chars[(Math.floor(Math.random() * chars.length))]
        }

        await member.setNickname(`Moderated_${code}`);

        let failedToSend = false;
        if (args[1] === '--dm') {
            let reason = args.slice(2).join(' ');
            if (reason.length >= 1024) reason = await client.util.createBin(reason);
            await member.send(`Your username was moderated in **${message.guild.name}** ${reason ? "| Reason: " + reason : ""}`).catch(() => failedtoSend = true )
        }

        const moderatedNicknameEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`${client.config.emotes.success} User with ID \`${member.id}\` has been moderated with identifier code \`${code}\` ${args['dm'] ? failedToSend ? '| Failed to DM them' : '| Successfully DM\'d them' : ''}`)
        
        await message.reply({ embeds: [moderatedNicknameEmbed] });
    }
}
