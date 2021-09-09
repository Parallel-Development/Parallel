const Discord = require('discord.js');
const punishmentSchema = require('../schemas/punishment-schema');
const settingsSchema = require('../schemas/settings-schema');

module.exports = {
    name: 'guildMemberAdd',
    async execute(client, member) {

        const punishmentCheck = await punishmentSchema.findOne({
            userID: member.id,
            guildID: member.guild.id,
            type: 'mute'
        })

        const settings = await settingsSchema.findOne({ guildID: member.guild.id })

        if (punishmentCheck) {
            const { reason, expires, date } = punishmentCheck;
            const { muterole, removerolesonmute } = settings;
            const unmanagableRoles = member.roles.cache.filter(role => role.managed).map(roles => roles.id);
            const role = member.guild.roles.cache.get(muterole);

            if (removerolesonmute) await member.roles.set([role, ...unmanagableRoles]).catch(async() => {
                for (let i = 0; i !== roles.length; ++i) {
                    await member.roles.add(roles[i]).catch(() => {})
                }
            })
            else await member.roles.add(role)

            const mutedEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.punishment[1])
                .setAuthor(`Parallel Moderation`, client.user.displayAvatarURL())
                .setTitle(`You are currently muted in ${member.guild.name}!`)
                .addField('Reason', reason)
                .addField('Duration', expires !== 'Never' ? client.util.duration(expires - Date.now()) : 'Permanent', true)
                .addField('Expires', expires !== 'Never' ? client.util.timestamp(Date.now() + (expires - Date.now())) : 'Never', true)
                .addField('Date', date)
            member.send({ embeds: [mutedEmbed] }).catch(() => { });
            return;
        }
    }
}