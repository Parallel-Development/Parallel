const Discord = require('discord.js');

module.exports = {
    name: 'nick',
    description: 'Change the nickname of a user',
    usage: 'nick [member] <new nickname>\nnick [name]',
    permissions: Discord.Permissions.FLAGS.MANAGE_NICKNAMES,
    requiredBotPermissions: Discord.Permissions.FLAGS.MANAGE_NICKNAMES,
    async execute(client, message, args) {
        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_member);

        const member = await client.util.getMember(message.guild, args[0]);
        if (!member) return client.util.throwError(message, client.config.errors.invalid_member);

        if (
            member.roles.highest.position >= message.member.roles.highest.position &&
            message.member.id !== message.guild.ownerId &&
            member !== message.member
        )
            return client.util.throwError(message, client.config.errors.hierarchy);
        if (member.roles.highest.position >= message.guild.me.roles.highest.position && member !== message.guild.me)
            return client.util.throwError(message, client.config.errors.my_hierarchy);
        if (message.guild.ownerId === member.id)
            return client.util.throwError(message, client.config.errors.cannot_punish_owner);

        const nickname = args.slice(1).join(' ') || null;
        if (member.nickname === nickname && nickname === null)
            return client.util.throwError(message, 'please provide a nickname as this user has none!');
        if (member.displayName === nickname)
            return client.util.throwError(message, 'this user already has this nickname!');
        if (nickname?.length > 32) return client.util.throwError(message, 'nickname length must be 32 or less');
        await member.setNickname(nickname);

        const successEmbed = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(message.guild))
            .setDescription(
                `${client.config.emotes.success} Nickname for ${member} set ${
                    nickname ? `to \`${nickname}\`` : 'back to normal'
                }`
            );
        return message.reply({ embeds: [successEmbed] });
    }
};
