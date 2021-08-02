const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');
const hastebin = require('hastebin');
const NewInfraction = require('./NewInfraction')
const DMUserInfraction = require('./DMUserInfraction');
const NewPunishment = require('./NewPunishment');
const ModerationLogger = require('./ModerationLogger');

module.exports = {

    /**
     * 
     * @param {String} text | Text posted to hastebin
     * @returns Hastebin URL
     */
    
    async createBin(text, javaScriptForm = false) {
        
        if(!text) throw new Error('required argument \'text\' is missing');
        if(typeof text !== 'string') throw new TypeError('argument \'text\' must be a string');

        const bin = await hastebin.createPaste(text, {
            raw: javaScriptForm ? false : true,
            contentType: javaScriptForm ? 'text/js' : 'text/plain',
            server: 'https://hastebin.com'
        })
        return bin;
    },

    /**
     * 
     * @param {Number} ms milliseconds
     * @returns duration format
     */

    convertMillisecondsToDuration(ms) {

        if(!ms) throw new Error('required argument \'ms\' is missing');

        let weeks = 0;
        let days = 0;
        let hours = 0;
        let minutes = 0;
        let seconds = ms / 1000;

        while (seconds >= 60) {
            seconds -= 60;
            ++minutes
        }

        while (minutes >= 60) {
            minutes -= 60;
            ++hours
        }

        while (hours >= 24) {
            hours -= 24;
            days++
        }

        while (days >= 7) {
            days -= 7;
            ++weeks
        }

        let product = [];
        if (weeks > 0) product.push(`${Math.round(weeks)} weeks`)
        if (days > 0) product.push(`${Math.round(days)} days`)
        if (hours > 0) product.push(`${Math.round(hours)} hours`)
        if (minutes > 0) product.push(`${Math.round(minutes)} minutes`)
        if (seconds > 0) product.push(`${Math.round(seconds)} seconds`)

        if(ms < 1000) return '0 seconds'

        return product.join(', ')
    },

    /**
     * 
     * @param {Boolean} twentyFourHourFormat return the code in 24 hour clock format
     * @returns Date in UTC time
     */

    timestamp(time = Date.now()) {
        return `<t:${time}>`;
    },

    generateRandomBase62String(length = 15) {
        let code = '';
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
        for (var i = 0; i !== length; ++i) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        return code;
    },

    /**
     * 
     * @param {Discord.Message} message Discord message where the command was ran
     * @returns Muted role
     */

    async createMuteRole(message) {

        const role = await message.guild.roles.crete({
            data: {
                name: 'Muted',
                color: '#546e7a'
            }
        })

        const sleep = async(ms) => {
            return new Promise(resolve => {
                setTimeout(resolve, ms)
            })
        }

        const channels = [...message.guild.channels.cache.values()];
        for(var i = 0; i !== channels.length; ++i) {
            const channel = channels[i];
            if(!channel.permissionsFor(message.guild.me).has('MANAGE_CHANNEL')) return;
            channel.updateOverwrite(role, { SEND_MESSAGES: false, ADD_REACTIONS: false, CONNECT: false });

            await sleep(0); // ????
        }

        return role;
    },

    /**
     * 
     * @param {Discord.Client} client The discord client
     * @param {Discord.Message} message The discord message the command was ran in
     * @param {Discord.GuildMember} member The target
     * @param {Discord.Role} muteRole The muted role
     * @param {String} reason The punishment reason
     * @param {String} punishmentID The ID of the punishment
     * @param {Number} time The punishment duration in convertMillisecondsToDuration
     * @param {Boolean} createInfractionInFunction The option to create the infraction schema inside of the muteMember function
     * @param {Boolean} createPunishmentInFunction The option to create the punishment schema inside of the muteMember function
     * @param {Boolean} logPunishmentInFunction The option to log the punishment
     * @param {Boolean} DMUserPunishmentInFunction The option to DM the user the infraction inside of the muteMember function
     * @returns The Discord roles the user had
     */

    async muteMember(message, member, muteRole) {

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        })
        const { rmrolesonmute } = settings;

        const memberRoles = [];

        const muteSchema = require('../schemas/mute-schema');
        await new muteSchema({
            guildname: message.guild.name,
            guildID: message.guild.id,
            userID: member.id,
            roles: memberRoles
        }).save();

        return memberRoles;
    }
}