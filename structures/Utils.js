const Discord = require('discord.js');
const req = require('petitio');
const FlakeIdGen = require('flake-idgen'),
    generator = new FlakeIdGen(),
    intformat = require('biguint-format');
const settingsSchema = require('../schemas/settings-schema');

class Utils {
    /**
     * create a new hastebin URL with the given content
     * @param {string} data the data to be parsed into the bin
     * @returns {Promise<string>} the returned hastebin URL
     */
    async createBin(data) {
        if (!data) throw new Error("required argument 'text' is missing");

        const res = await req('https://hst.sh/documents', 'POST')
            .body(typeof data === 'object' ? JSON.stringify(data, null, 2) : data)
            .timeout(15000)
            .send();

        if (res.statusCode === 200) return `https://hst.sh/${res.json().key}`;
        return `Error uploading content to hst.sh, status code ${res.statusCode} | This issue is most likely because of hastebin, however if you believe it is not, report this bug with the status code`;
    }

    /**
     * convert milliseconds into a human readable format
     * @param {number} ms the time in milliseconds 
     * @returns {string} the time in a human readable format
     */
    duration(ms) {
        if (!ms && ms != 0) throw new Error("required argument 'ms' is missing");

        if (ms == 0) return '0 seconds';
        if (ms < 0) return 'Less than 0 seconds';
        if (ms < 0.001) return 'A very small number';
        if (ms <= 1) {
            if (ms == 1) return `${ms} ${ms == 1 ? 'millisecond' : 'milliseconds'}`;
            else {
                const microseconds = parseFloat(ms.toString().replace(/^0+/, ''))
                    .toFixed(3)
                    .replace('.', '')
                    .replace(/^0+/, '');
                return `${microseconds} ${microseconds < 2 ? 'microsecond' : 'microseconds'}`;
            }
        }

        if (ms < 1000) return `${Math.floor(ms)} ${ms < 2 ? 'millisecond' : 'milliseconds'}`;

        let weeks = 0;
        let days = 0;
        let hours = 0;
        let minutes = 0;
        let seconds = ms / 1000;

        while (seconds >= 60) {
            seconds -= 60;
            ++minutes;
        }

        while (minutes >= 60) {
            minutes -= 60;
            ++hours;
        }

        while (hours >= 24) {
            hours -= 24;
            ++days;
        }

        while (days >= 7) {
            days -= 7;
            ++weeks;
        }

        const product = [];
        if (weeks > 0) product.push(`${Math.floor(weeks)} ${weeks < 2 ? 'week' : 'weeks'}`);
        if (days > 0) product.push(`${Math.floor(days)} ${days < 2 ? 'day' : 'days'}`);
        if (hours > 0) product.push(`${Math.floor(hours)} ${hours < 2 ? 'hour' : 'hours'}`);
        if (minutes > 0) product.push(`${Math.floor(minutes)} ${minutes < 2 ? 'minute' : 'minutes'}`);
        if (seconds > 0) product.push(`${Math.floor(seconds)} ${seconds < 2 ? 'second' : 'seconds'}`);

        if (product.length > 1) product.splice(-1, 1, `and ${product[product.length - 1]}`);
        return product.length > 2 ? product.join(', ') : product.join(' ');
    }

    /**
     * create a new Discord timestamp format
     * @param {number} time the elapsed time in milliseconds since the JS epoch
     * @param {boolean} relative whether or not to use a relateive timestamp
     * @returns {string} the Discord timestamp
     */
    timestamp(time = Date.now(), { relative = false } = {}) {
        return `<t:${Math.floor(time / 1000)}${relative ? ':R' : ''}>`;
    }

    /**
     * create a new snowflake
     * @returns {string} a new snowflake
     */
    createSnowflake() {
        return intformat(generator.next());
    }

    /**
     * create the muted role in the guild if one is lacking
     * @param {Discord.Message} message the message that triggered the bot to create the muted role
     * @returns {Promise<Discord.Role> | boolean} the muted role, or false if the muted role was not created
     */
    async createMuteRole(message) {
        if (!message.guild.me.permissions.has(Discord.Permissions.FLAGS.MANAGE_ROLES)) return false;

        const role = await message.guild.roles.create({
            name: 'Muted',
            color: '#546e7a'
        });

        const sleep = async ms => {
            return new Promise(resolve => {
                setTimeout(resolve, ms);
            });
        };

        const channels = [...message.guild.channels.cache.values()];
        for (let i = 0; i !== channels.length; ++i) {
            const channel = channels[i];
            if (
                channel &&
                channel.permissionOverwrites &&
                channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.MANAGE_CHANNELS) &&
                channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.SEND_MESSAGES)
            ) {

                const overwriteOptions = { SEND_MESSAGES: false };
                if (channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.ADD_REACTIONS))
                    overwriteOptions.ADD_REACTIONS = false;
                if (channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.CONNECT))
                    overwriteOptions.CONNECT = false;
                if (channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.SEND_MESSAGES_IN_THREADS))
                    overwriteOptions.SEND_MESSAGES_IN_THREADS = false;
                if (channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.CREATE_PUBLIC_THREADS))
                    overwriteOptions.CREATE_PUBLIC_THREADS = false;
                if (channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.CREATE_PRIVATE_THREADS))
                    overwriteOptions.CREATE_PRIVATE_THREADS = false;

                await channel.permissionOverwrites.edit(role, overwriteOptions).catch(() => {});
            }

            await sleep(0);
        }

        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                muterole: role.id
            }
        );

        return role;
    }

    /**
     * add the muted role to the member
     * @param {Discord.Message} message the message that triggered the bot to mute the member
     * @param {Discord.GuildMember} member the member to mute
     * @param {Discord.Role} muteRole the role to mute the user with
     * @returns {Promise<Discord.GuildMember> | boolean} the member that was muted, or false if the member was not muted
     */
    async muteMember(message, member, muteRole) {
        try {
            await member.roles.add(muteRole)
        } catch {
            return false;
        }

        if (member.voice.channel) await member.voice.disconnect().catch(() => {});

        return member;
    }

    /**
     * fetch a guild member
     * @param {Discord.Guild} guild the guild to fetch the member in
     * @param {string} mention the mention or ID of the member to fetch
     * @returns {Promise<Discord.GuildMember> | undefined} the member that was fetched
     */
    async getMember(guild, mention) {
        if (!mention) return;
        if (mention.startsWith('<@') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);
            if (mention.startsWith('!')) mention = mention.slice(1);
        }
        return guild.members.fetch(mention).catch(() => undefined);
    }

    /**
     * fetch a user
     * @param {Discord.Client} client the client to fetch the user with
     * @param {string} mention the mention or ID of the user to fetch
     * @returns {Promise<Discord.User> | undefined} the user that was fetched
     */
    async getUser(client, mention) {
        if (!mention) return;
        if (mention.startsWith('<@') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);
            if (mention.startsWith('!')) mention = mention.slice(1);
        }
        return client.users.fetch(mention).catch(() => undefined);
    }

    /**
     * get a guild role from the cache
     * @param {Discord.Guild} guild the guild to find the role in
     * @param {string} mention the mention or the ID of the role to get
     * @returns {Discord.Role | undefined} the role that was found
     */
    getRole(guild, mention) {
        if (!mention) return;
        if (mention.startsWith('<@&') && mention.endsWith('>')) mention = mention.slice(3, -1);
        return guild.roles.cache.get(mention);
    }

    /**
     * get a guild channel from the cache
     * @param {Discord.Guild} guild the guild to find the channel in
     * @param {string} mention the mention or the ID of the channel to get
     * @returns {Discord.Role | undefined} the channel that was found
     */
    getChannel(guild, mention) {
        if (!mention) return;
        if (mention.startsWith('<#') && mention.endsWith('>')) mention = mention.slice(2, -1);
        return guild.channels.cache.get(mention);
    }

    addMemberToCollectionPrevention(guildID, memberID) {
        return global.collectionPrevention.push({ guildID: guildID, memberID: memberID });
    }

    removeMemberFromCollectionPrevention(guildID, memberID) {
        return global.collectionPrevention.pop({ guildID: guildID, memberID: memberID });
    }

    /**
     * reply to a message with an error
     * @param {Discord.Message} message the message to reply to
     * @param {string} errorName the error content
     * @returns {boolean} true
     */
    async throwError(message, errorName) {
        if (message.type === 'APPLICATION_COMMAND' || message.type === 'MESSAGE_COMPONENT') {
            await message.reply({ content: `Error: ${errorName}`, ephemeral: true }).catch(async () => {
                await message.editReply({ content: `Error: ${errorName}`, ephemeral: true }).catch(() => {});
            });
            return;
        }
        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { errorConfig } = guildSettings;
        const msg = await message.reply(`Error: ${errorName}`);

        if (errorConfig.deleteDelay !== 'never') {
            setTimeout(() => {
                msg.delete().catch(() => {});
                message.delete().catch(() => {});
            }, errorConfig.deleteDelay);
        }

        return true;
    }

    /**
     * get the default color for the bot from the guild
     * @param {Discord.Guild} guild the guild
     * @returns {string} the default color in hex code
     */
    getMainColor(guild) {
        if (!guild) return client.config.colors.main; // guild is supposed to always not be undefined, but in the bugged case that it is, something will actually be returned lol
        const botRole = guild.me.roles.cache.find(role => role.managed) || guild.me.roles.highest;
        return botRole.hexColor !== '#000000' ? botRole.hexColor : '#09ff2';
    }
}

module.exports = Utils;
