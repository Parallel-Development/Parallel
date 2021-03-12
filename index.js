const config = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();
const moment = require('moment');
const mongo = require('./mongo');

const fs = require('fs')
const commandFolders = fs.readdirSync('./commands')
client.commands = new Discord.Collection()
client.aliases = new Discord.Collection()
client.categories = fs.readdirSync('./commands')

const { connect } = require('mongoose');
const blacklistSchema = require('./schemas/blacklist-schema');
const settingsSchema = require('./schemas/settings-schema');
const punishmentSchema = require('./schemas/punishment-schema');
const warningSchema = require('./schemas/warning-schema');
let talkedRecently = new Set();

const active = new Map()

console.log('Attempting to start the bot...')

let startUp = 0;
const connectToMongoDB = async () => {
    await mongo().then(async(mongoose) => {
        startUp++
        if(startUp == 1) {
            console.log('Connected to mongoDB! (1/2) | Waiting for bot...')
        } else {
            console.log('Connected to MongoDB! (2/2) | Bot is now ready')
        }
    })
}

connectToMongoDB();

client.once('ready', () => {
    startUp++
    if(startUp == 1) {
        console.log('Bot started (1/2) | Waiting for MongoDB...');
    } else {
        console.log('Bot started (2/2) | Bot is now ready');
    }
})

setInterval(async() => {

    // Check for expired punishments

    var currentDate = new Date().getTime()
    const expiredDate = await punishmentSchema.find({
        expires: { $lte: currentDate },
    })
   .catch(e => false)
   
   if(expiredDate.length < 1) return;
   
   expiredDate.forEach(async(expiredDate) => {
       let {type, userID, guildid, _id} = expiredDate
       
       if(type === 'mute') {
            await punishmentSchema.deleteOne({
                _id: _id,
            })

            var server = client.guilds.cache.get(guildid)

            var role = server.roles.cache.find(r => r.name === 'Muted')
            if(!role) return;

            var member = await server.members.fetch(userID).catch(() =>  member = null)

            member.roles.remove(role).catch(() =>  { return })

            const unmutedm = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setAuthor('You were unmuted', client.user.displayAvatarURL())
                .setTitle(`You were unmuted in ${server.name}`)
                .addField('Reason', '[AUTO] Mute expired')

            member.send(unmutedm)

        }

        if(type === 'ban') {
            await punishmentSchema.deleteOne({
                _id: _id
            })

            const { userID } = expiredDate

            var server = await client.guilds.fetch(guildid)

            server.members.unban(userID).catch(() =>  { return })
        }

    })

}, 5000)

client.on('voiceStateUpdate', (oldState, newState) => {
    if(oldState.member.id !== client.user.id) return
    if(newState.channel == null) {
        active.delete(oldState.guild.id)
        return;
    }
    if(!newState.member.selfDeaf) {
        if(newState.channel == null) return;
        newState.guild.me.voice.setDeaf(true).catch(() => { return })
        return;
    }

})  

client.on('guildMemberAdd', async(member) => {

    const joinCheck = await punishmentSchema.findOne({
        userID: member.id,
        type: 'mute'
    })

    if(joinCheck) {
        let role = member.guild.roles.cache.find(r => r.name === 'Muted')
        if(!role) return;
        member.roles.add(role).catch(() => { return })
    }

}) 

client.on('guildDelete', async(guild) => {
    await settingsSchema.deleteMany({
        guildid: guild.id
    })
    await warningSchema.deleteMany({
        guildid: guild.id
    })
    await punishmentSchema.deleteMany({
        guildid: guild.id
    })
})

////////////////////////////////////
////////////// Main ////////////////
////////////////////////////////////

for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'))
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        client.commands.set(command.name, command);
        if (command.aliases) command.aliases.forEach(alias => {
            client.aliases.set(alias, command.name);
        })
    }
}

client.on('message', async(message) => {

    if(message.author.bot) return;
    if(!message.guild) return;
    if(!message.guild.me.hasPermission('SEND_MESSAGES', 'READ_MESSAGES')) return;

    const check = await blacklistSchema.findOne({
        user: message.author.id
    }).catch(e => false)
    
    const prefixSetting = await settingsSchema.findOne({
        guildid: message.guild.id
    }).catch(e => false)

    if(message.content.startsWith(`<@!${client.user.id}>`)) {
        
        if (check) {
            let { reason, date, sent } = check;

            if (sent == 'true') return;

            const blacklistEmbed = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setDescription(`Unfortunately, you are blacklisted from this bot. These means you may no longer use this bot\n\n> Blacklist reason: ${reason}\n> Blacklisted on: ${date}\n\nYou can submit an appeal [here](https://docs.google.com/document/d/15EwKPOPvlIO5iSZj-qQyBjmQ5X7yKHlijW9wCiDfffM/edit)`)
                .setAuthor('You were blacklisted!', client.user.displayAvatarURL());
            message.author.send(blacklistEmbed).catch(() => { return message.react('🛑') }).catch(() => { return })
            await blacklistSchema.updateMany({
                user: message.author.id,
                sent: 'true'
            })
            return;
        }

        try {
            var { prefix } = prefixSetting
        } catch (err) {
            var prefix = 'r!'
        }
        message.channel.send(`Hello! My current prefix is \`${prefix}\`. For a list of commands, run ${prefix}help`)
    }

    // RazorDev

    if(message.guild.id == '747624284008218787') {
        let razorDevBlacklisted = ['nigg', 'niger', 'fagg', 'horny', 'cumming', 'ejaculat', 'penis', 'vagina', 'suck my dick', 'slut', 'pussy', 'blowjob', 'sexslave', 'sex slave']
        let razorDevFoundInText = false;
        for(i in razorDevBlacklisted) {
            if(message.content.toLowerCase().includes(razorDevBlacklisted[i])) razorDevFoundInText = true;
        }
        if(razorDevFoundInText) {
            message.delete();
            message.reply('you are not allowed to use this language on this server! You have been timed out for 10 seconds')
            let mutedRole = message.guild.roles.cache.find(r => r.name == 'Muted')
            if(!mutedRole) return;
            message.member.roles.add(mutedRole)
            setTimeout(async => {
                message.member.roles.remove(mutedRole)
            }, 10000)
        }
    }

    // Automatic setup if there are no settings for the server found
    
    if(!prefixSetting) {
        await new settingsSchema({
            guildname: message.guild.name,
            guildid: message.guild.id,
            prefix: 'r!',
            logs: 'none'
        }).save()

        if(!message.content.startsWith('r!')) return;

    }  else {
        let { prefix } = prefixSetting
        if(!message.content.startsWith(prefix) ) return;
    }

    // Run

    let ops = {
        active: active
    }
 
    var args = message.content.split(' ')
    if(prefixSetting) {
        var { prefix } = prefixSetting
        var cmd = args.shift().slice(prefix.length).toLowerCase();
    } else {
        var prefix = 'r!'
        var cmd = args.shift().slice(prefix.length).toLowerCase();
    }

    const command = client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd));
    if(!command) return;

    // Blacklist Check

    if (check) {
        let { reason, date, sent } = check;

        if (sent == 'true') return;

        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription(`Unfortunately, you are blacklisted from this bot. These means you may no longer use this bot\n\n> Blacklist reason: ${reason}\n> Blacklisted on: ${date}\n\nYou can submit an appeal [here](https://docs.google.com/document/d/15EwKPOPvlIO5iSZj-qQyBjmQ5X7yKHlijW9wCiDfffM/edit)`)
            .setAuthor('You were blacklisted!', client.user.displayAvatarURL());
        message.author.send(blacklistEmbed).catch(() => { return message.react('🛑') }).catch(() => { return })
        await blacklistSchema.updateMany({
            user: message.author.id,
            sent: 'true'
        })
        return;
    }

    if(commandsLockedInChannel) {
        const whitelistedCommandFolders = ['Moderation', 'Configuration', 'Developer']
        if(!whitelistedCommandFolders.includes(command.categories.name)) {
            return message.reply('that command is disabled in this channel!')
        }
    }

    // Cooldown Check

    if (talkedRecently.has(message.author.id)) return message.react('🕑')
    else {
        const cooldownWhitelist = config.developers
        if (!cooldownWhitelist.includes(message.author.id)) {
            talkedRecently.add(message.author.id);
            setTimeout(() => {
                talkedRecently.delete(message.author.id)
            }, 1500)
        }
    }
    
    try {
        command.execute(client, message, args, ops)
    } catch {
        return
    }

});

client.login(config.token)