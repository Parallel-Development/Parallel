const Discord = require('discord.js');

module.exports = {
    name: 'demote',
    description: 'Remove all roles with staff permissions from a member',
    usage: 'demote [member]\ndemote [member] --dm\ndemote [member] --dm <reason>',
    aliases: ['removeallstaffroles', 'removeallmoderationroles'],
    permissions: Discord.Permissions.FLAGS.ADMINISTRATOR,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_ROLES,
    async execute(client, message, args) {
        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_member);

        const member = await client.util.getMember(message.guild, args[0]);
        if (!member) return client.util.throwError(message, client.config.errors.invalid_member);

        if (member.id === client.user.id)
            return client.util.throwError(message, client.config.errors.cannot_punish_myself);
        if (member.id === message.member.id)
            return client.util.throwError(message, client.config.errors.cannot_punish_yourself);
        if (
            member.roles.highest.position >= message.member.roles.highest.position &&
            message.member.id !== message.guild.ownerId
        )
            return client.util.throwError(message, client.config.errors.hierarchy);
        if (member.roles.highest.position >= message.guild.me.roles.highest.position)
            return client.util.throwError(message, client.config.errors.my_hierarchy);
        if (member === message.guild.owner)
            return client.util.throwError(message, client.config.errors.cannot_punish_owner);

        if (!member.roles.cache.size) return client.util.throwError(message, 'this user does not have any roles');

        const memberRoles = [];
        for (let i = 0; i !== [...member.roles.cache.values()].length; ++i) {
            const role = [...member.roles.cache.values()][i];
            if (
                !(
                    role.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) ||
                    role.permissions.has(Discord.Permissions.FLAGS.MANAGE_CHANNELS) ||
                    role.permissions.has(Discord.Permissions.FLAGS.MANAGE_ROLES) ||
                    role.permissions.has(Discord.Permissions.FLAGS.VIEW_AUDIT_LOG) ||
                    role.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD) ||
                    role.permissions.has(Discord.Permissions.FLAGS.MANAGE_NICKNAMES) ||
                    role.permissions.has(Discord.Permissions.FLAGS.KICK_MEMBERS) ||
                    role.permissions.has(Discord.Permissions.FLAGS.BAN_MEMBERS) ||
                    role.permissions.has(Discord.Permissions.FLAGS.MUTE_MEMBERS) ||
                    role.permissions.has(Discord.Permissions.FLAGS.DEAFEN_MEMBERS) ||
                    role.permissions.has(Discord.Permissions.FLAGS.MOVE_MEMBERS)
                )
            )
                memberRoles.push(role);
        }

        if (member.roles.cache.size === memberRoles.length)
            return client.util.throwError(message, 'this user does not have any roles with staff permissions');
        member.roles.set(memberRoles, `Administrator: ${message.author.tag}`);

        const demotedEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[1])
            .setDescription(`${client.config.emotes.success} ${member} has been demoted`);
        message.reply({ embeds: [demotedEmbed] });

        if (args[1] === '--dm') {
            const reason = args.slice(2).join(' ') || 'Unspecified';
            const demotedDMEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.punishment[1])
                .setAuthor('Parallel Role Management', client.user.displayAvatarURL())
                .setTitle(`You were demoted in ${message.guild.name}!`)
                .addField('Reason', reason.length <= 1024 ? reason : await client.util.createBin(reason));

            await member.send({ embeds: [demotedDMEmbed] }).catch(() => {});
        }

        return;
    }
};
