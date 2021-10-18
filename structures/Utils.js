const Discord = require('discord.js');
const req = require('petitio')
const FlakeIdGen = require('flake-idgen'),
    generator = new FlakeIdGen(),
    intformat = require('biguint-format');
const settingsSchema = require('../schemas/settings-schema');
const ms_ = require('ms');

class Utils {
    
    async createBin(data) {
        
        if (!data) throw new Error('required argument \'text\' is missing');

        const res = await req('https://hst.sh/documents', 'POST')
        .body(JSON.stringify(data, null, 2))
        .timeout(15000)
        .send();

        if (res.statusCode === 200)
            return `https://hst.sh/${res.json().key}`;
        return `Error uploading content to hst.sh, status code ${res.statusCode} | This issue is most likely because of hastebin, however if you believe it is not, report this bug with the status code`;
    }

    duration(ms) {

        if (!ms && ms != 0) throw new Error('required argument \'ms\' is missing');

        if (ms == 0) return '0 seconds';
        if (ms < 0) return 'Less than 0 seconds';
        if (ms < 0.001) return 'A very small number';
        if (ms <= 1) {
            if (ms == 1) return `${ms} ${ms == 1 ? 'millisecond' : 'milliseconds'}`;
            else {
                const microseconds = parseFloat(ms.toString().replace(/^0+/, '')).toFixed(3).replace('.', '').replace(/^0+/, '');
                return `${microseconds} ${microseconds < 2 ? 'microsecond' : 'microseconds'}`;
            }
        } 

        if (ms < 1000) return `${Math.floor(ms)} ${ms < 2 ? 'millisecond' : 'milliseconds'}`

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
            ++days
        }

        while (days >= 7) {
            days -= 7;
            ++weeks
        }

        const product = [];
        if (weeks > 0) product.push(`${Math.floor(weeks)} ${weeks < 2 ? 'week' : 'weeks'}`)
        if (days > 0) product.push(`${Math.floor(days)} ${days < 2 ? 'day' : 'days'}`)
        if (hours > 0) product.push(`${Math.floor(hours)} ${hours < 2 ? 'hour' : 'hours'}`)
        if (minutes > 0) product.push(`${Math.floor(minutes)} ${minutes < 2 ? 'minute' : 'minutes'}`)
        if (seconds > 0) product.push(`${Math.floor(seconds)} ${seconds < 2 ? 'second' : 'seconds'}`)

        if (product.length > 1) product.splice(-1, 1, `and ${product[product.length - 1]}`)
        return product.length > 2 ? product.join(', ') : product.join(' ');
    }

    timestamp(time = Date.now()) {
        return `<t:${Math.floor(time / 1000)}>`;
    }

    generateID() {
        return intformat(generator.next());
    }

    async createMuteRole(message) {

        const role = await message.guild.roles.create({
            name: 'Muted',
            color: '#546e7a',
        })

        const sleep = async(ms) => {
            return new Promise(resolve => {
                setTimeout(resolve, ms)
            })
        }

        const channels = [...message.guild.channels.cache.values()];
        for (let i = 0; i !== channels.length; ++i) {
            const channel = channels[i];
            if (!channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.MANAGE_CHANNELS)) return;
            channel.permissionOverwrites.edit(role, { SEND_MESSAGES: false, ADD_REACTIONS: false, CONNECT: false, SEND_MESSAGES_IN_THREADS: false, CREATE_PUBLIC_THREADS: false, CREATE_PRIVATE_THREADS: false });

            await sleep(0);
        }

        await settingsSchema.updateOne({
            guildID: message.guild.id
        },
        {
            muterole: role.id
        })

        return role;
    }

    async muteMember(message, member, muteRole) {
        await member.roles.add(muteRole).catch(() => {});
        if (member.voice.channel) await member.voice.disconnect().catch(() => {});
    }

    async getMember(guild, mention) {
        if (!mention) return;
        if (mention.startsWith('<@') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);
            if (mention.startsWith('!')) mention = mention.slice(1);
        }
        const member = await guild.members.fetch({ user: mention, force: true }).catch(() => {});
        if (!member) return undefined;
        return guild.members.cache.get(mention);
    }

    async getUser(client, mention) {
        if (!mention) return;
        if (mention.startsWith('<@') && mention.endsWith('>')) {
            mention = mention.slice(2, -1);
            if (mention.startsWith('!')) mention = mention.slice(1);
        }
        return client.users.fetch(mention).catch(() => {})
    }

    getRole(guild, mention) {
        if (!mention) return;
        if (mention.startsWith('<@&') && mention.endsWith('>')) mention = mention.slice(3, -1);
        return guild.roles.cache.get(mention);
    }

    getChannel(guild, mention) {
        if (!mention) return;
        if (mention.startsWith('<#') && mention.endsWith('>')) mention = mention.slice(2, -1);
        return guild.channels.cache.get(mention);
    }

    addMemberToCollectionPrevention(guildID, memberID) {
        return global.collectionPrevention.push({ guildID: guildID, member: memberID })
    }

    removeMemberFromCollectionPrevention(guildID, memberID) {
        return global.collectionPrevention.pop({ guildID: guildID, memberID: memberID })
    }

    async throwError(message, errorName) {
        if (message.type === 'APPLICATION_COMMAND' || message.type === 'MESSAGE_COMPONENT') {
            await message.reply({ content: `Error: ${errorName}`, ephemeral: true }).catch(async() => { await message.editReply({ content: `Error: ${errorName}`, ephemeral: true }).catch(() => {})})
            return;
        }
        const msg = await message.reply(`Error: ${errorName}`)
        setTimeout(() => { msg.delete().catch(() => {}); message.delete().catch(() => {}) }, 5000);
    }
}

module.exports = Utils;