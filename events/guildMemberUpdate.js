const settingsSchema = require('../schemas/settings-schema');
const punishmentSchema = require('../schemas/punishment-schema');
const Discord = require('discord.js');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(client, oldMember, newMember) {
        if (!oldMember.guild.me.permissions.has(Discord.Permissions.FLAGS.VIEW_AUDIT_LOG)) return;

        if (Date.now() - oldMember.joinedTimestamp <= 5000) return;

        if (oldMember.roles.cache.map(role => role.id) === newMember.roles.cache.map(role => role.id)) return;

        const guildSettings = await settingsSchema.findOne({ guildID: oldMember.guild.id });
        if (!guildSettings) return;
        const { muterole, removerolesonmute } = guildSettings;

        if (removerolesonmute) return;
        if (!oldMember.guild.roles.cache.get(muterole)) return;

        if (
            (oldMember.roles.cache.has(muterole) && newMember.roles.cache.has(muterole)) ||
            (!oldMember.roles.cache.has(muterole) && !newMember.roles.cache.has(muterole))
        )
            return;

        const fetchedLogs = await oldMember.guild.fetchAuditLogs({
            limit: 1,
            type: 'UPDATE_MEMBER_ROLES'
        });

        const log = fetchedLogs.entries.first();
        const { executor } = log;
        if (executor.id === client.user.id) return;

        if (oldMember.roles.cache.has(muterole)) {
            await punishmentSchema.deleteOne({ guildID: oldMember.guild.id, userID: oldMember.id });
            return;
        } else if (newMember.roles.cache.has(muterole)) {
            await punishmentSchema.deleteOne({ guildID: oldMember.guild.id, userID: oldMember.id });
            return await client.punishmentManager.createPunishment(
                oldMember.guild.name,
                oldMember.guild.id,
                'mute',
                newMember.id,
                {
                    reason: 'The mute role was added to a user',
                    time: 'Never'
                }
            );
        }
    }
};
