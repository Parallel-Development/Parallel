const automodSchema = require('../schemas/automod-schema');
const ModerationLogger = require('../structures/ModerationLogger');
const warningSchema = require('../schemas/warning-schema');
const DMUserInfraction = require('../structures/DMUserInfraction');
const Infraction = require('./Infraction');
const Punishment = require('../structures/Punishment');
const settingsSchema = require('../schemas/settings-schema');
const systemSchema = require('../schemas/system-schema');
const Discord = require('discord.js');
const automodCooldown = new Set();

class Automod {

    punished;

    constructor(client, message, type, { deleteAmount } = {}) {

        if (!client) throw new Error('required argument `client` is missing');
        if (!message) throw new Error('required argument `message` is missing');
        if (!type) throw new Error('required argument `type` is missing');
        if (typeof message !== 'object') throw new Error('message must be an object');
        if (typeof type !== 'string') throw new Error('type must be a string');

        this.punished = true;

        const main = async() => {

            const automod = await automodSchema.findOne({
                guildID: message.guild.id
            })

            const {
                fast,
                massmention,
                filter,
                invites,
                walltext,
                links,
                fastTempMuteDuration,
                fastTempBanDuration,
                massmentionTempMuteDuration,
                massmentionTempBanDuration,
                filterTempMuteDuration,
                filterTempBanDuration,
                invitesTempMuteDuration,
                invitesTempBanDuration,
                walltextTempMuteDuration,
                walltextTempBanDuration,
                linksTempMuteDuration,
                linksTempBanDuration
            } = automod;

            const settings = await settingsSchema.findOne({
                guildID: message.guild.id
            })
            const { autowarnexpire, baninfo, muterole, removerolesonmute } = settings;
            const that = this;

            const structure = async (name, reason, time, color) => {

                message.delete().catch(() => {})
                if (name === 'disabled') that.punished = false;
                if (name === 'delete') return;

                if (automodCooldown.has(message.author.id)) return;
                else {
                    automodCooldown.add(message.author.id);
                    setTimeout(() => { automodCooldown.delete(message.author.id) }, 2500)
                }

                const role = message.guild.roles.cache.get(muterole) || await client.util.createMuteRole(message);

                if (name === 'tempmute') name = 'mute';
                if (name === 'tempban') name = 'ban';

                let memberRoles;

                if (name === 'mute') {

                    if (!message.member.roles.cache.has(role.id)) {
                        memberRoles = removerolesonmute ? message.member.roles.cache.map(roles => roles.id) : [];
                        const unmanagableRoles = message.member.roles.cache.filter(role => role.managed).map(roles => roles.id);

                        if (removerolesonmute) await message.member.roles.set([role, ...unmanagableRoles]);
                        else await client.util.muteMember(message, message.member, role);

                    }
                }
                if (name === 'warn') {
                    if (autowarnexpire !== 'disabled') time = parseFloat(autowarnexpire)
                    else time = null
                }

                let member = message.member
                let punishmentID = client.util.generateID();

                new Infraction(client, `${name.charAt(0).toUpperCase() + name.slice(1)}`, message, message.guild.me, message.member, { reason: reason, punishmentID: punishmentID, time: time, auto: true });
                if (name !== 'warn') new Punishment(message.guild.name, message.guild.id, name, message.member.id, { reason: reason, time: time ? Date.now() + time : 'Never', roles: memberRoles });
                await new DMUserInfraction(client, `${name.endsWith('e') ? name : name.endsWith('ban') ? name + 'ne' : name + 'e'}d`, color, message, message.member, { reason: reason, punishmentID: punishmentID, time: time, baninfo: name === 'ban' ? baninfo !== 'none' ? baninfo : null : null })
                new ModerationLogger(client, `${name.charAt(0).toUpperCase() + name.slice(1) + (name.endsWith('e') ? '' : name.endsWith('ban') ? 'ne' : 'e')}d`, message.guild.me, message.member, message.channel, { reason: reason, duration: time, punishmentID: punishmentID, auto: true });

                if (name === 'kick') await message.member.kick({ reason: reason })
                else if (name === 'ban') await message.guild.members.ban(message.member, { reason: reason });

                const punishedEmbed = new Discord.MessageEmbed()
                    .setColor(color)
                    .setDescription(`${client.config.emotes.success} ${member.toString()} has been automatically ${name.endsWith('e') ? name : name.endsWith('ban') ? name + 'ne' : name + 'e'}d with ID \`${punishmentID}\``)

                const msg = await message.channel.send({ embeds: [punishedEmbed] });
                setTimeout(() => { msg.delete() }, 5000);

                if(name !== 'warn') return;

                const guildSystem = await systemSchema.findOne({
                    guildID: message.guild.id
                })
                if (!guildSystem) return;
                const { system } = guildSystem;
                if (!system.length) return;
                const guildWarnings = await warningSchema.findOne({
                    guildID: message.guild.id,
                })
                const memberAutomodWarnings = guildWarnings.warnings.filter(warning => warning.userID === message.author.id && warning.auto && warning.type === 'Warn')

                const x = [];
                for (let i = 0; i !== system.length; ++i) {
                    if (memberAutomodWarnings.length - system[i].amount >= 0) x.push(memberAutomodWarnings.length - system[i].amount)
                }


                if (!x.length) return;
                const closestInstance = memberAutomodWarnings.length - Math.min(...x);
                const instance = system.find(instance => instance.amount === closestInstance);
                const _reason = `[AUTO] Reaching or exceeding **${closestInstance}** infractions`;
                punishmentID = client.util.generateID();

                if (instance.punishment === 'ban' || instance.punishment === 'tempban') {
                    await new DMUserInfraction(client, 'banned', client.config.colors.punishment[2], message, message.member, { reason: _reason, punishmentID: punishmentID, time: time, baninfo: baninfo !== 'none' ? baninfo : null });

                    new ModerationLogger(client, 'Banned', message.guild.me, message.member, message.channel, { reason: _reason, duration: instance.duration, punishmentID: punishmentID, auto: true });
                    new Infraction(client, 'Ban', message, message.guild.me, message.member, { reason: _reason, punishmentID: punishmentID, time: instance.duration, auto: true });
                    if (time) new Punishment(message.guild.name, message.guild.id, 'ban', message.member.id, { reason: _reason, time: instance.duration ? Date.now() + instance.duration : 'Never' });

                    await message.guild.members.ban(message.member, { reason: _reason });
                } else if (instance.punishment === 'mute' || instance.punishment === 'tempmute') {

                    const memberRoles = removerolesonmute ? member.roles.cache.map(roles => roles.id) : [];
                    const unmanagableRoles = message.member.roles.cache.filter(role => role.managed).map(roles => roles.id);

                    if (!message.member.roles.cache.has(role.id)) {

                        if (removerolesonmute) await member.roles.set([role, ...unmanagableRoles]);
                        else await client.util.muteMember(message, member, role);
        
                    }

                    new Infraction(client, 'Mute', message, message.guild.me, message.member, { reason: _reason, punishmentID: punishmentID, time: instance.duration, auto: true });
                    new Punishment(message.guild.name, message.guild.id, 'mute', message.member.id, { reason: _reason, time: instance.duration ? Date.now() + instance.duration : 'Never', roles: memberRoles });
                    new DMUserInfraction(client, 'muted', client.config.colors.punishment[1], message, message.member, { reason: _reason, punishmentID: punishmentID, time: instance.duration })
                    new ModerationLogger(client, 'Muted', message.guild.me, message.member, message.channel, { reason: _reason, duration: instance.duration, punishmentID: punishmentID, auto: true })
                } else if (instance.punishment === 'kick') {

                    new DMUserInfraction(client, 'kicked', client.config.colors.punishment[1], message, member, { reason: _reason, punishmentID: punishmentID, time: time });
                    new Infraction(client, 'Kick', message, message.guild.me, message.member, { reason: _reason, punishmentID: punishmentID, time: instance.duration, auto: true });
                    new ModerationLogger(client, 'Kicked', message.guild.me, message.member, message.channel, { reason:_reason, duration: instance.duration, punishmentID: punishmentID, auto: true });

                    await message.guild.members.kick(message.member, { reason: _reason });
                }

                const _punishedEmbed = new Discord.MessageEmbed()
                if (instance.punishment === 'warn') _punishedEmbed.setColor(client.config.colors.punishment[0]);
                if (instance.punishment === 'kick') _punishedEmbed.setColor(client.config.colors.punishment[1]);
                if (instance.punishment === 'mute' || instance.punishment === 'tempmute') _punishedEmbed.setColor(client.config.colors.punishment[1]);
                if (instance.punishment === 'ban' || instance.punishment === 'tempban') _punishedEmbed.setColor(client.config.colors.punishment[2]);
                const stype = instance.punishment.replace('temp', '')
                _punishedEmbed.setDescription(`${client.config.emotes.success} ${member.toString()} has been automatically ${(stype.charAt(0).toUpperCase() + stype.slice(1) + (stype.endsWith('e') ? '' : stype.endsWith('ban') ? 'ne' : 'e')).toLowerCase()}d with ID \`${punishmentID}\``);
                const msg2 = await message.channel.send({ embeds: [_punishedEmbed] });
                return setTimeout(async() => await msg2.delete(), 5000);
            }

            if (type === 'fast') await message.channel.bulkDelete(7, true).catch(() => {})

            switch (type) {
                case 'filter':
                    if (filter === 'disabled') return;
                    structure(
                        filter,
                        `[AUTO] Sending or editing a message to a blacklisted word on the server`,
                        filterTempMuteDuration ? filterTempMuteDuration : filterTempBanDuration ? filterTempBanDuration : null,
                        filter === 'warn' ? client.config.colors.punishment[0] : (filter === 'mute' || filter === 'tempmute') ? client.config.colors.punishment[1] : (filter === 'ban' || filter === 'tempban') ? client.config.colors.punishment[2] : null
                    )
                    break;
                case 'massmention':
                    if (massmention === 'disabled') return;
                    structure(
                        massmention,
                        `[AUTO] Pinging 5 or more users`,
                        massmentionTempMuteDuration ? massmentionTempMuteDuration : massmentionTempBanDuration ? massmentionTempBanDuration : null,
                        massmention === 'warn' ? client.config.colors.punishment[0] : (massmention === 'mute' || massmention === 'tempmute') ? client.config.colors.punishment[1] : (massmention === 'ban' || massmention === 'tempban') ? client.config.colors.punishment[2] : null
                    )
                    break;
                case 'walltext':
                    if (walltext === 'disabled') return;
                    structure(
                        walltext,
                        `[AUTO] Sending huge or wall-like messages`,
                        walltextTempMuteDuration ? walltextTempMuteDuration : walltextTempBanDuration ? walltextTempBanDuration : null,
                        walltext === 'warn' ? client.config.colors.punishment[0] : (walltext === 'mute' || walltext === 'tempmute') ? client.config.colors.punishment[1] : (walltext === 'ban' || walltext === 'tempban') ? client.config.colors.punishment[2] : null
                    )
                    break;
                case 'fast':
                    if (fast === 'disabled') return;
                    structure(
                        fast,
                        `[AUTO] Sending many messages in quick succession`,
                        fastTempMuteDuration ? fastTempMuteDuration : fastTempBanDuration ? fastTempBanDuration : null,
                        fast === 'warn' ? client.config.colors.punishment[0] : (fast === 'mute' || fast === 'tempmute') ? client.config.colors.punishment[1] : (fast === 'ban' || fast === 'tempban') ? client.config.colors.punishment[2] : null
                    )
                    break;
                case 'invites':
                    if (invites === 'disabled') return;
                    structure(
                        invites,
                        `[AUTO] Sending a discord server invite`,
                        invitesTempMuteDuration ? invitesTempMuteDuration : invitesTempBanDuration ? invitesTempBanDuration : null,
                        invites === 'warn' ? client.config.colors.punishment[0] : (invites === 'mute' || invites === 'tempmute') ? client.config.colors.punishment[1] : (invites === 'ban' || invites === 'tempban') ? client.config.colors.punishment[2] : null
                    )
                    break;
                case 'links':
                    if (links === 'disabled') return;
                    structure(
                        links,
                        `[AUTO] Sending links`,
                        linksTempMuteDuration ? linksTempMuteDuration : linksTempBanDuration ? linksTempBanDuration : null,
                        links === 'warn' ? client.config.colors.punishment[0] : (links === 'mute' || links === 'tempmute') ? client.config.colors.punishment[1] : (links === 'ban' || links === 'tempban') ? client.config.colors.punishment[2] : null
                    )
                    break
            }
        }

        return main();
    }
}

module.exports = Automod;