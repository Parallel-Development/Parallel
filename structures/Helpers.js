const Discord = require('discord.js');
const cooldown = new Map();
const blacklistSchema = require('../schemas/blacklist-schema');

class Helpers {
    cooldown = {
        /**
         * check if a user is still in cooldown, and if @param {boolean} keep is set to false, remove the user from the cooldown
         * @param {Discord.User} user the user to check
         * @param {boolean} keep to keep the user in the cooldown if their cooldown time is already over
         * @returns {object} the cooldown information including the cooldown status
         */
        check(user, keep = false) {
            const isValidMember = validateUser(user);
            if (isValidMember === undefined) return Promise.reject('expected 1 argument `user`, found undefined');
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
                (keep === false && Date.now() - cooldownInformation.at >= 1500 && cooldownInformation.hard === false) ||
                (Date.now() - cooldownInformation.at >= 3000 && cooldownInformation.hard === true)
            ) {
                this.remove(ID);
                return { inCooldown: false };
            }
            return cooldownInformation;
        },

        /**
         * add a user to the cooldown
         * @param {Discord.User} user the user to add to the cooldown
         * @param {boolean} hard to add the user to the hard cooldown, making the bot ignore them and not inform them that they are on cooldown
         * @param {boolean} force force a developer into the cooldown, as by default they are rejected
         * @returns the new cooldown map
         */
        add(user, hard = false, force = false) {
            const isValidMember = validateUser(user);
            if (isValidMember === undefined) return Promise.reject('expected 1 argument `user`, found undefined');
            else if (isValidMember === false) return Promise.reject('invalid user/member object or snowflake provided');

            const ID = user?.id || user;
            if (['633776442366361601', '671882127041626143'].includes(ID) && force === false) return false;
            return cooldown.set(ID, { at: Date.now(), hard: hard });
        },

        /**
         * remove a user from the cooldown
         * @param {Discord.User} user the user to remove from the cooldown
         * @returns the new cooldown map
         */
        remove(user) {
            const isValidMember = validateUser(user);
            if (isValidMember === undefined) return Promise.reject('expected 1 argument `user`, found undefined');
            else if (isValidMember === false) return Promise.reject('invalid user/member object or snowflake provided');

            const ID = user?.id || user;
            return cooldown.delete(ID);
        },

        /**
         * make a user's cooldown status hard, making the bot not inform them they are on cooldown when running a command
         * @param {Discord.User} user the user to make hard in the cooldown
         * @returns the new cooldown map
         */
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

        /**
         * make a user's cooldown status show that they have been informed that they are on cooldown,
         * so if they run a command again on cooldown, they don't need to be reinformed
         * @param {Discord.User} user the user to set the cooldown status to triggered
         * @returns the new cooldown map
         */
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
    };

    blacklist = {
        /**
         * check if a user is blacklisted
         * @param {string} ID the ID of the user or server
         * @param {boolean} server if it is a server or a user ID
         * @returns {object} the blacklist information including the blacklist reason, date, sent boolean, and status
         */
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

        /**
         * DM the user informing them that they are blacklisted
         * @param {Discord.Client} client the client
         * @param {Discord.User} user the user to DM the blacklist
         * @param {string} reason the reason of the blacklist
         * @param {string} date the string date
         * @returns {Promise<Discord.Message> | boolean} the DM message resolvable or false if the DM failed
         */
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

            try {
                await user.send({ embeds: [blacklistEmbed] });
                await blacklistSchema.updateOne(
                    {
                        ID: user.id,
                        server: false
                    },
                    {
                        sent: true
                    }
                );
            } catch {
                return false;
            }
        },

        /**
         * send a message to a channel regarding the server blacklist, then leave the server
         * @param {Discord.Client} client the client
         * @param {message} message the message object including the channel and guild to send the notice
         * @param {string} reason the reason for the blacklist
         * @param {string} date the string date
         * @returns {Promise<Discord.Message> | boolean} the message resolvable or false if sending failed
         */
        async sendServerBlacklist(client, message, reason, date) {
            try {
                await message.channel.send(
                    `**[IMPORTANT NOTICE]**\nPlease do not delete this message until it has been regarded!\n\nUnfortunately, this server has been blacklisted. This means the server may not use Parallel anymore. Further information is listed below:\n\n**Reason:** ${reason}\n**Date:** ${date}\n\nIf you wish to appeal this server blacklist, appeal at https://docs.google.com/forms/d/1xedhPPJONP3tGmL58xQAiTd-XVQ1V8tCkEqUu9q1LWM/edit?usp=drive_web`
                );
                await message.guild.leave();
                await blacklistSchema.updateOne(
                    {
                        ID: message.guild.id,
                        server: true
                    },
                    {
                        sent: true
                    }
                );
            } catch {
                await message.guild.leave();
                return false;
            }
        }
    };
}

module.exports = Helpers;

function validateUser(user) {
    if (user === undefined) return undefined;

    if (
        !user instanceof Discord.User &&
        !user instanceof Discord.GuildMember &&
        (typeof user === 'string' ? user.length > 17 && user.length < 19 : true)
    )
        return false;
    else return true;
}
