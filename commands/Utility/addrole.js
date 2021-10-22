const Discord = require('discord.js');

module.exports = {
    name: 'addrole',
    description: 'Add a role to a member',
    usage: 'addrole [member] <role>\naddrole [member] <role> --dm\naddrole [member] <role> --dm (reason)\n\nIf you are to use the DM flag, you cannot target the role by its name!',
    permissions: Discord.Permissions.FLAGS.MANAGE_ROLES,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_ROLES,
    aliases: ['grant', 'giverole'],
    async execute(client, message, args) {
        if (!args[0]) return client.util.throwError(message, client.config.errors.missing_argument_member);
        const member = await client.util.getMember(message.guild, args[0]);
        if (!member) return client.util.throwError(message, client.config.errors.invalid_member);

        if (!args[1]) return client.util.throwError(message, client.config.errors.missing_argument_role);
        const role =
            client.util.getRole(message.guild, args[1]) ||
            message.guild.roles.cache.find(r => r.name === args.slice(1).join(' '));
        if (!role) return client.util.throwError(message, client.config.errors.invalid_role);

        if (role.position >= message.member.roles.highest.position && message.member.id !== message.guild.ownerId)
            return client.util.throwError(message, client.config.errors.hierarchy);
        if (role.position >= message.guild.me.roles.highest.position)
            return client.util.throwError(message, client.config.errors.my_hierarchy);
        if (role === message.guild.roles.everyone || role.managed)
            return client.util.throwError(message, client.config.errors.unmanagable_role);
        if (member.roles.cache.has(role.id))
            return client.util.throwError(message, 'This member already has this role!');

        await member.roles.add(role, `Responsible Member: ${message.member.user.tag}`);

        let didNotSend = false;
        if (args[2] === '--dm') {
            const reason = args.slice(3).join(' ') || 'Unspecified';
            const addedRoleDM = new Discord.MessageEmbed()
                .setColor(client.util.mainColor(message.guild))
                .setAuthor('Parallel Role Management', client.user.displayAvatarURL())
                .setTitle(`You were assigned a role in ${message.guild.name}!`)
                .addField('Added Role', `${role.name} - \`${role.id}\``)
                .addField('Reason', reason.length <= 1024 ? reason : await client.util.createBin(reason));

            await member.send({ embeds: [addedRoleDM] }).catch(() => {
                didNotSend = true;
            });
        }

        await member.roles.add(role, `Responsible Member: ${message.author.tag}`);
        const assignedRole = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(message.guild))
            .setDescription(
                `${
                    client.config.emotes.success
                } Role ${role.toString()} successfully assigned to ${member.toString()} ${
                    args['dm'] ? (didNotSend ? '| Failed to DM them' : "| Successfully DM'd them") : ''
                }`
            );
        message.reply({ embeds: [assignedRole] });

        return;

        return;
    }
};
