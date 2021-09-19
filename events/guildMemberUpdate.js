const settingsSchema = require('../schemas/settings-schema');
const punishmentSchema = require('../schemas/punishment-schema');
const Punishment = require('../structures/Punishment');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(client, oldMember, newMember) {

        if((Date.now() - oldMember.joinedTimestamp) <= 5000) return;

        if (oldMember.roles.cache.map(role => role.id) === newMember.roles.cache.map(role => role.id)) return;

        const guildSettings = await settingsSchema.findOne({ guildID: oldMember.guild.id });
        const { muterole, removerolesonmute } = guildSettings;

        if (removerolesonmute) return;
        if (!oldMember.guild.roles.cache.get(muterole)) return;

        if ((oldMember.roles.cache.has(muterole) && newMember.roles.cache.has(muterole)) 
        || (!oldMember.roles.cache.has(muterole) && !newMember.roles.cache.has(muterole))) return;

        if (oldMember.roles.cache.has(muterole)) {
            await punishmentSchema.deleteOne({ guildID: oldMember.guild.id, userID: oldMember.id })
            return;
        } else if (newMember.roles.cache.has(muterole)) {
            await punishmentSchema.deleteOne({ guildID: oldMember.guild.id, userID: oldMember.id })
            return new Punishment(oldMember.guild.name, oldMember.guild.id, 'mute', newMember.id, { reason: 'Moderator manually added mute role to user', time: 'Never' })
        }
    }
}