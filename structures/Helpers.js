const Discord = require('discord.js');
const cooldown = new Map();
const blacklistSchema = require('../schemas/blacklist-schema');

class Helpers {
    cooldown = {

        check(user, keep = false) {
            
            const isValidMember = validateUser(user);
            if(isValidMember === undefined) return Promise.reject('expected 1 argument `user`, found undefined');
            else if (isValidMember === false) return Promise.reject('invalid user/member object or snowflake provided');

            const ID = user?.id || user;
            const rawCooldownInformation = cooldown.get(ID);

            if (!rawCooldownInformation) return { inCooldown: false };
            const cooldownInformation = { 
                inCooldown: true, 
                hard: rawCooldownInformation.hard, 
                at: rawCooldownInformation.at, 
                triggered: rawCooldownInformation.triggered 
            };

            if (
                keep === false &&
                (Date.now() - cooldownInformation.at >= 1500 && cooldownInformation.hard === false) || 
                (Date.now() - cooldownInformation.at >= 3000 && cooldownInformation.hard === true)
            ) {
                this.remove(ID);
                return { inCooldown: false };
            }
            return cooldownInformation;
        },

        /**
         * 
         * @param {Discord.User | Discord.Member | Snowflake} user - the user to add to the cooldown
         * @param {Boolean} hard - set the cooldown as hard, making it not respond to the user that they are on cooldown
         * @param {Boolean} force - ignore the developer check and add a developer to cooldown anyway
         * @returns cooldown
         */

        add(user, hard = false, force = false) {
            const isValidMember = validateUser(user);
            if (isValidMember === undefined) return Promise.reject('expected 1 argument `user`, found undefined');
            else if (isValidMember === false) return Promise.reject('invalid user/member object or snowflake provided');

            const ID = user?.id || user;
            if (["633776442366361601", "671882127041626143"].includes(ID) && force === false) return false;
            return cooldown.set(ID, { at: Date.now(), hard: hard });
        }, 

        remove(user) {
            const isValidMember = validateUser(user);
            if (isValidMember === undefined) return Promise.reject('expected 1 argument `user`, found undefined');
            else if (isValidMember === false) return Promise.reject('invalid user/member object or snowflake provided');

            const ID = user?.id || user;
            return cooldown.delete(ID);
        },

        makeHard(user) {
            const isValidMember = validateUser(user);
            if (isValidMember === undefined) return Promise.reject('expected 1 argument `user`, found undefined');
            else if (isValidMember === false) return Promise.reject('invalid user/member object or snowflake provided');

            const ID = user?.id || user;
            const rawCooldownInformation = cooldown.get(ID);
            rawCooldownInformation.hard = true;

            cooldown.delete(ID);
            return cooldown.set(ID, rawCooldownInformation);
        },

        makeTriggered(user) {
            const isValidMember = validateUser(user);
            if (isValidMember === undefined) return Promise.reject('expected 1 argument `user`, found undefined');
            else if (isValidMember === false) return Promise.reject('invalid user/member object or snowflake provided');

            const ID = user?.id || user;
            const rawCooldownInformation = cooldown.get(ID);
            rawCooldownInformation.triggered = true;

            cooldown.delete(ID);
            return cooldown.set(ID, rawCooldownInformation);
        }
    }

        
    blacklist = {
        async check(ID, server = false) {
            const blacklistInformation = await blacklistSchema.findOne({ ID: ID, server: server });
            if (blacklistInformation === null) return { isBlackisted: false };
            return { 
                isBlacklisted: true, 
                reason: blacklistInformation.reason, 
                date: blacklistInformation.date, 
                sent: blacklistInformation.sent
            };
        },
        async DMUserBlacklist(client, user, reason, date) {
            const isValidMember = validateUser(user);
            if (isValidMember === undefined) return Promise.reject('expected 1 argument `user`, found undefined');
            else if (isValidMember === false) return Promise.reject('invalid user/member object or snowflake provided');
            user = await client.util.getUser(client, user?.id || user);
            const blacklistEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setDescription(
                    `You cannot run any commands because you are blacklisted from Parallel. This means I will ignore all your commands. If you believe this blacklist is unjustified, you can submit an appeal [here](https://docs.google.com/forms/d/1xedhPPJONP3tGmL58xQAiTd-XVQ1V8tCkEqUu9q1LWM/edit?usp=drive_web)`
                )
                .setAuthor('You are blacklisted from Parallel!', client.user.displayAvatarURL())
                .addField('Reason', reason)
                .addField('Date', date)
                .setFooter('You cannot appeal your ban if it is not unjustified!');
            const wasSent = await user.send({ embeds: [blacklistEmbed] }).catch(() => false);
            if (wasSent) {
                await blacklistSchema.updateOne(
                    {
                        ID: user.id,
                        server: false
                    },
                    {
                        sent: true
                    }
                );
            }
            return;
        },
        
        async sendServerBlacklist(client, message, reason, date) {
            const wasSent = await message.channel.send(
                `**[IMPORTANT NOTICE]**\nPlease do not delete this message until it has been regarded!\n\nUnfortunately, this server has been blacklisted. This means the server may not use Parallel anymore. Further information is listed below:\n\n**Reason:** ${reason}\n**Date:** ${date}\n\nIf you wish to appeal this server blacklist, appeal at https://docs.google.com/forms/d/1xedhPPJONP3tGmL58xQAiTd-XVQ1V8tCkEqUu9q1LWM/edit?usp=drive_web`
            ).catch(() => false);
            if (wasSent) {
                await blacklistSchema.updateOne(
                    {
                        ID: message.guild.id,
                        server: true
                    },
                    {
                        sent: true
                    }
                )
            }
            return message.guild.leave();
        }
    }
}

module.exports = Helpers;

function validateUser(user) {
    if (user === undefined) return undefined;

    if (
        !user instanceof Discord.User &&
        !user instanceof Discord.GuildMember &&
        (typeof user === 'string' ? (user.length > 17 && user.length < 19) : true)
    ) return false;

    else return true;
}