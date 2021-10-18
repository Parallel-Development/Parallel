const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'demote',
    description: 'Remove all roles with staff permissions from a member',
    data: new SlashCommandBuilder()
        .setName('demote')
        .setDescription('Remove all roles with staff permissions from a member')
        .addUserOption(option =>
            option
                .setName('member')
                .setDescription('The member to remove all roles with staff permissions from')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('dm').setDescription('DM the user regarding their demotion (with if specified, your reason)')
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The message sent to the user regarding their demote if you are to DM them')
        ),
    permissions: Discord.Permissions.FLAGS.ADMINISTRATOR,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_ROLES,
    async execute(client, interaction, args) {
        if (args['reason'] && !args['dm'])
            return client.util.throwError(interaction, client.config.errors.reason_but_no_dm);

        const member = await client.util.getMember(interaction.guild, args['member']);
        if (!member) return client.util.throwError(interaction, client.config.errors.invalid_member);

        if (member.id === client.user.id)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_myself);
        if (member.id === interaction.member.id)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_yourself);
        if (
            member.roles.highest.position >= interaction.member.roles.highest.position &&
            interaction.member.id !== interaction.guild.ownerId
        )
            return client.util.throwError(interaction, client.config.errors.hierarchy);
        if (member.roles.highest.position >= interaction.guild.me.roles.highest.position)
            return client.util.throwError(interaction, client.config.errors.my_hierarchy);
        if (member === interaction.guild.owner)
            return client.util.throwError(interaction, client.config.errors.cannot_punish_owner);

        if (!member.roles.cache.size) return client.util.throwError(interaction, 'This user does not have any roles');

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
            return client.util.throwError(interaction, 'This user does not have any roles with staff permissions');

        await member.roles.set(memberRoles, `Administrator: ${interaction.user.tag}`);

        let failedToSend = false;
        if (args['dm'] === true) {
            const reason = args['reason'];
            const demotedDMEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.punishment[1])
                .setAuthor('Parallel Role Management', client.user.displayAvatarURL())
                .setTitle(`You were demoted in ${interaction.guild.name}!`)
                .addField('Reason', reason.length <= 1024 ? reason : await client.util.createBin(reason));

            await member.send({ embeds: [demotedDMEmbed] }).catch(() => {
                failedToSend = true;
            });
        }

        const demotedEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.punishment[1])
            .setDescription(
                `✅ ${member} has been demoted ${
                    args['dm'] ? (failedToSend ? '| Failed to DM them' : "| Successfully DM'd them") : ''
                }`
            );
        interaction.reply({ embeds: [demotedEmbed] });

        return;
    }
};
