const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'removerole',
    description: 'Removes a role from a member',
    permissions: Discord.Permissions.FLAGS.MANAGE_ROLES,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_ROLES,
    data: new SlashCommandBuilder().setName('removerole').setDescription('Remove a role to a member')
    .addUserOption(option => option.setName('member').setDescription('The target you are removing the role from').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('The role you are removing from the target member').setRequired(true))
    .addBooleanOption(option => option.setName('dm').setDescription('DM the user regarding their role change (with if specified, your reason)'))
    .addStringOption(option => option.setName('reason').setDescription('The message sent to the user regarding their role change if you are to DM them')),
    async execute(client, interaction, args) {

        if (args['reason'] && !args['dm']) return client.util.throwError(interaction, client.config.errors.reason_but_no_dm);

        const member = await client.util.getMember(interaction.guild, args['member'])
        if (!member) return client.util.throwError(interaction, client.config.errors.invalid_member);

        const role = client.util.getRole(interaction.guild, args['role'])

        if (role.position >= interaction.member.roles.highest.position && interaction.member.id !== interaction.guild.ownerId) return client.util.throwError(interaction, client.config.errors.hierarchy);
        if (role.position >= interaction.guild.me.roles.highest.position) return client.util.throwError(interaction, client.config.errors.my_hierarchy);
        if (role === interaction.guild.roles.everyone || role.managed) return client.util.throwError(interaction, client.config.errors.unmanagable_role);
        if (!member.roles.cache.has(role.id)) return client.util.throwError(interaction, 'This member does not has this role!');

        await member.roles.remove(role, `Responsible Member: ${interaction.user.tag}`);

        let didNotSend = false;
        if (args['dm'] === true) {
            const reason = args['reason'] || 'Unspecified';
            const addedRoleDM = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setAuthor('Parallel Role Management', client.user.displayAvatarURL())
            .setTitle(`A role has been revoked from you in ${interaction.guild.name}!`)
            .addField('Removed Role', `${role.name} - \`${role.id}\``)
            .addField('Reason', reason.length <= 1024 ? reason : await client.util.createBin(reason))

            await member.send({ embeds: [addedRoleDM] }).catch(() => { didNotSend = true });
        }

        const removedRole = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`✅ Role ${role.toString()} successfully removed from ${member.toString()} ${args['dm'] ? didNotSend ? '| Failed to DM them' : '| Successfully DM\'d them' : '' }`);
        interaction.reply( { embeds: [removedRole] }); 

        return;
    }
}