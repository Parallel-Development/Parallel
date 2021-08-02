const settingsSchema = require('../schemas/settings-schema');
const automodSchema = require('../schemas/automod-schema');
const blacklistSchema = require('../schemas/blacklist-schema');
const punishmentSchema = require('../schemas/punishment-schema');
const cooldown = new Set();
const doubleCooldown = new Set();

const Discord = require('discord.js');

module.exports = {
    name: 'message',
    async execute(client, message) {
        
        if (
            message.author.bot 
            || !message.guild 
            || !message.channel.permissionsFor(message.guild.me).toArray().includes('SEND_MESSAGES')
        ) return;

        const punishmentCheck = await punishmentSchema.findOne({
            userID: message.member.id,
            guildID: message.member.guild.id,
            type: 'mute'
        })

        if (punishmentCheck) {
            const { reason, expires, date } = punishmentCheck;
            const role = member.guild.roles.cache.find(r => r.name === 'Muted');
            if (!role) return;
            else {
                await message.member.roles.add(role).catch(() => { });
                const mutedEmbed = new Discord.MessageEmbed()
                    .setColor(client.config.colors.punishment[1])
                    .setAuthor(`You are currently muted in ${member.guild.name}`, client.user.displayAvatarURL())
                    .addField('Reason', reason)
                    .addField('Duration', expires !== 'Never' ? client.util.convertMillisecondsToDuration(expires) : 'Permanent', true)
                    .addField('Date', date, true)
                message.member.send(mutedEmbed).catch(() => { });

                return;

            }
        }

        const __settings = await settingsSchema.findOne({
            guildID: message.guild.id
        }).catch(() => { });

        if (!__settings) {
            await new settingsSchema({
                guildname: message.guild.name,
                guildID: message.guild.id,
                prefix: client.config.prefix,
                baninfo: 'none',
                delModCmds: false,
                locked: [],
                autowarnexpire: 'disabled',
                manualwarnexpire: 'disabled',
                messageLogging: 'none',
                moderationLogging: 'none',
                automodLogging: 'none',
                modRoles: [],
            }).save()
        } 

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        }).catch(() => { });

        const prefix = settings.prefix || client.config.prefix;

        const automodCheck = await automodSchema.findOne({
            guildID: message.guild.id
        })

        if(!automodCheck) {
            await new automodSchema({
                guildname: message.guild.name,
                guildID: message.guild.id,
                filter: 'disabled',
                filterList: [],
                fast: 'disabled',
                walltext: 'disabled',
                flood: 'disabled',
                links: 'disabled',
                allowTenor: {
                    enabled: false,
                    attachmentPermsOnly: false
                },
                invites: 'disabled',
                massmention: 'disabled',
                filterTempMuteDuration: 0,
                fastTempMuteDuration: 0,
                walltextTempMuteDuration: 0,
                linksTempMuteDuration: 0,
                invitesTempMuteDuration: 0,
                massmentionTempMuteDuration: 0,
                filterTempBanDuration: 0,
                fastTempBanDuration: 0,
                walltextTempBanDuration: 0,
                linksTempBanDuration: 0,
                invitesTempBanDuration: 0,
                massmentionTempBanDuration: 0,
                bypassChannels: []
            }).save();
        }

        const getModerators = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        const isModerator = getModerators.modRoles.some(role => message.member.roles.cache.has(role));
        const channelBypassed = await automodSchema.findOne({
            guildID: message.guild.id,
            bypassChannels: message.channel.id
        })

        const isBlacklisted = await blacklistSchema.findOne({
            ID: message.author.id,
            server: false
        })
        const isBlacklistedServer = await blacklistSchema.findOne({
            ID: message.guild.id,
            server: true
        })

        if (
            !message.member.hasPermission('MANAGE_MESSAGES') &&
            !isModerator &&
            (!channelBypassed || !channelBypassed)
        ) require('../structures/AutomodChecks').run(client, message);
        


        if (
            new RegExp(`^<@!?${client.user.id}>`).test(message.content) && 
            !cooldown.has(message.author.id)
        ) {

            const cooldownWhitelist = client.config.developers;
            if (!cooldownWhitelist.includes(message.author.id)) {
                cooldown.add(message.author.id);
                setTimeout(() => {
                    cooldown.delete(message.author.id)
                }, 1500)
            } 

            return message.channel.send(`My prefix is \`${prefix}\` | Run \`${prefix}help\` for a list of commands`)
        }

        if(!message.content.startsWith(prefix)) return;
        
        const args = message.content.split(' ');
        const cmd = args.shift().slice(prefix.length).toLowerCase();
        const command = client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd));
        if (!command) return;

        if(isBlacklisted) {

            const { reason, date, sent } = isBlacklisted;
            if (sent) return;

            const blacklistEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setDescription(`Unfortunately, you were blacklisted from this bot. This means the bot will ignores all your commands. If you believe this ban is unjustified, you can submit an appeal [here](https://docs.google.com/document/d/15EwKPOPvlIO5iSZj-qQyBjmQ5X7yKHlijW9wCiDfffM/edit)`)
                .setAuthor('You are blacklisted from this bot!', client.user.displayAvatarURL())
                .addField('Reason', reason)
                .addField('Date', date)
                .setFooter('You cannot appeal your ban if it is not unjustified!');
            message.react('🛑').catch(() => { })
            message.author.send(blacklistEmbed).catch(() => {  })

            await blacklistSchema.updateOne({
                ID: message.author.id,
                server: false
            },
                {
                    sent: true
                })

            return;

        } 

        if(isBlacklistedServer) {

            const { reason, date, sent } = isBlacklistedServer;
            if (!sent) {

                message.channel.send(`This server is blacklisted!\n\nReason: ${reason}\nDate: ${date}`)

                await blacklistSchema.updateOne({
                    ID: message.author.id,
                    server: false
                },
                {
                    sent: true
                }
            )}

            return message.guild.leave();
        };

        if (doubleCooldown.has(message.author.id)) return;
        if(cooldown.has(message.author.id)) {
            message.channel.send('You are on cooldown');
            doubleCooldown.add(message.author.id);
            return setTimeout(() => { doubleCooldown.delete(message.author.id) }, 3000)
        } else if(!client.config.developers.includes(message.author.id)) {
            cooldown.add(message.author.id);
            setTimeout(() => { cooldown.delete(message.author.id); }, 1500)
        }


        if(command.developing && !client.config.developers.includes(message.author.id)) return;

        
        if (
            command.permissions && 
            !message.member.hasPermission(command.permissions) 
        ) {

            const denyAccess = () => {
                const errorMessage = new Discord.MessageEmbed()
                    .setColor(client.config.colors.err)
                    .setAuthor('Access Denied')
                    .setDescription(`You do not have permission to run the \`${command.name}\` command`)
                return message.channel.send(errorMessage).then(msg => {
                    setTimeout(() => { message.delete(msg).catch(() => { }); msg.delete() }, 3000)
                })
            }
            if (
                command.permissions === 'MANAGE_MESSAGES'
                || command.permissions === 'BAN_MEMBERS'
                || command.permissions === 'KICK_MEMBERS'
                || command.permissions === 'MANAGE_NICKNAMES'
                || command.permissions === 'MANAGE_ROLES'
                || command.permissions === 'MANAGE_CHANNELS'
            ) {
                if(!isModerator) return denyAccess();
            } else return denyAccess();
        }

        if(command.requiredBotPermissions && !message.guild.me.hasPermission(command.requiredBotPermission)) {
            const missingPermissionEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.err)
            .setAuthor(`Missing Permissions`)
            .setDescription(`I am missing required permissions for this command to work\nMissing Permission: \`${command.requiredBotPermission.toUpperCase().replace('_', ' ').replace('_', ' ')}\``)

            return message.channel.send(missingPermissionEmbed)
        };
        
       if(
           await settingsSchema.findOne({
            guildID: message.guild.id,
            locked: message.channel.id
            }) ||
            await settingsSchema.findOne({
                guildID: message.guild.id,
                locked: message.channel.parentID
            })
       ) {
           if(!message.member.hasPermission('MANAGE_MESSAGES') && !isModerator) {
               const msg = await message.channel.send('Commands are disabled in this channel');
               setTimeout(() => {
                   message.delete();
                   msg.delete();
               }, 3000);
               return;
           }
       }




        await message.guild.members.fetch();

        try { command.execute(client, message, args) }
        catch { return; }
    }
}