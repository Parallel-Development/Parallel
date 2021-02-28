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
       let {type, userID, guildid, _id, code} = expiredDate
       
       if(type === 'mute') {
            await punishmentSchema.deleteOne({
                _id: _id,
            })

            var server = client.guilds.cache.get(guildid)

            var role = server.roles.cache.find(r => r.name === 'Muted')
            if(!role) return;

            var member = await server.members.fetch(userID).catch(() =>  member = null)

            member.roles.remove(role).catch(() =>  { return })

            const autounmuteCheck = await settingsSchema.findOne({
                guildid: guildid,
                logs: 'none'
            })

            let date = new Date();
            date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

            if(!autounmuteCheck) {
                const unmuteLog = new Discord.MessageEmbed()
                .setColor('#000066')
                .addField('User', member, true)
                .addField('User ID', member.id, true)
                .addField('Moderator', client.user, true)
                .addField('Date', date, true)
                .setAuthor('User Unmuted', client.user.displayAvatarURL())

                let webhooks = await member.guild.fetchWebhooks();
                let webhook = await webhooks.first();

                webhook.send({
                    username: 'Razor',
                    avatar: client.user.displayAvatarURL(),
                    embeds: [unmuteLog]
                })
            }
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
    }
})  

client.on('guildMemberAdd', async(member) => {

    const joinCheck = await punishmentSchema.findOne({
        userID: member.id,
        type: 'mute'
    })

    const logCheckJoin = await settingsSchema.findOne({
        guildid: member.guild.id,
        logs: 'none'
    }) 

    if(joinCheck) {
        let role = member.guild.roles.cache.find(r => r.name === 'Muted')
        if(!role) return;
        member.roles.add(role).catch(() => { return })
    }

    if(!logCheckJoin) {

        const joinLog = new Discord.MessageEmbed()
        .setColor('#000066')
        .addField('User', member, true)
        .addField('User ID', member.id, true)
        .addField('Joined on', moment(member.joinedAt).format('dddd, MMMM Do YYYY, h:mm:ss a'), true)
        .addField('Account Creation', moment(member.user.createdAt).format('dddd, MMMM Do YYYY, h:mm:ss a'), true)
        .setFooter(`There are now ${member.guild.memberCount} members`)
        .setAuthor('User Joined', client.user.displayAvatarURL())

        let webhooks = await member.guild.fetchWebhooks();
        let webhook = await webhooks.first();

        await webhook.send({
            username: 'Razor',
            avatar: client.user.displayAvatarURL(),
            embeds: [joinLog]
        }).catch(() => { return })
    }

    const joinCheckDate = Date.parse(member.joinedAt);
    const createdCheckDate = Date.parse(member.user.createdAt);
    const endResult = joinCheckDate - createdCheckDate;

    if(endResult / 1000 <= 86400) {
        if (member.guild.id != '664581298123440129') return
        const bannedForJoiningTooEarly = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('Unfortunately, your account has been automatically banned because your account has been deemed an alt. If you believe this ban was unjustified, please contact <@!633776442366361601>')
        .setAuthor(`You have been banned from ${member.guild}!`)
        await member.send(bannedForJoiningTooEarly).catch(() => { return })
        member.ban({ reason: 'Unfortunately, your account has been automatically banned because your account has been deemed an alt. If you believe this ban was unjustified, please contact <@!633776442366361601>'})

        const altBanLog = new Discord.MessageEmbed()
            .setColor('#000066')
            .setDescription(`${member} has been automatically banned from the server because their account is less than or equal to a day`)
            .addField('User', member, true)
            .addField('User ID', member.id, true)
            .setFooter(`There are now ${member.guild.memberCount} members`)
            .setAuthor('User Banned', client.user.displayAvatarURL())

        let webhooks = await member.guild.fetchWebhooks();
        let webhook = await webhooks.first();

        await webhook.send({
            username: 'Razor',
            avatar: client.user.displayAvatarURL(),
            embeds: [altBanLog]
        }).catch(() => { return })
    }

}) 

client.on('guildMemberRemove', async(member) => {
    const logCheckLeave = await settingsSchema.findOne({
        guildid: member.guild.id,
        logs: 'none'
    })

    if(!logCheckLeave) {

        const leaveLog = new Discord.MessageEmbed()
        .setColor('#000066')
        .addField('User', member, true)
        .addField('User ID', member.id, true)
        .setFooter(`There are now ${member.guild.memberCount} members`)
        .setAuthor('User Left', client.user.displayAvatarURL())

        let webhooks = await member.guild.fetchWebhooks();
        let webhook = await webhooks.first();

        await webhook.send({
            username: 'Razor',
            avatar: client.user.displayAvatarURL(),
            embeds: [leaveLog]
        }).catch(() => { return })
    }
})

client.on('messageDelete', async(message) => {
    const logCheckMessageDelete = await settingsSchema.findOne({
        guildid: message.guild.id,
        logs: 'none'
    })

    if(!logCheckMessageDelete) {

        const messageDeleteLog = new Discord.MessageEmbed()
        .setColor('#000066')
        .addField('User', message.member, true)
        .addField('User ID', message.member.id, true)
        .addField('Channel', message.channel, true)
        .addField('Channel ID', message.channel.id, true)
        .addField('Message Content', message.content)
        .setAuthor('Message Deleted', client.user.displayAvatarURL())

        let webhooks = await message.guild.fetchWebhooks();
        let webhook = await webhooks.first();

        await webhook.send({
            username: 'Razor',
            avatar: client.user.displayAvatarURL(),
            embeds: [messageDeleteLog]
        }).catch(() => { return })
    }
})

client.on('messageUpdate', async(message, newMessage) => {

    if(message.author.bot) return;

    const logCheckMessageUpdate = await settingsSchema.findOne({
        guildid: message.guild.id,
        logs: 'none'
    })

    if(!logCheckMessageUpdate) {
        const messageUpdateLog = new Discord.MessageEmbed()
        .setColor('#000066')
        .addField('User', message.member, true)
        .addField('User ID', message.member.id, true)
        .addField('Channel', message.channel, true)
        .addField('Channel ID', message.channel.id, true)
        .addField('Old Message', message.content)
        .addField('Original Message', newMessage.content)
        .setAuthor('Message Edited', client.user.displayAvatarURL())

        let webhooks = await message.guild.fetchWebhooks();
        let webhook = await webhooks.first();

        webhook.send({
            username: 'Razor',
            avatar: client.user.displayAvatarURL(),
            embeds: [messageUpdateLog]
        }).catch(() => { return })
    }
})

client.on('channelDelete', async(channel) => {
    const checkChannel = await settingsSchema.findOne({
        guildid: channel.guild.id
    })

    if(checkChannel) {
        let { logs } = checkChannel
        if(logs === channel.id) {
            await settingsSchema.updateMany({
                guildname: channel.guild.name,
                logs: 'none'
            })
        }
    }
})

client.on('guildMemberUpdate', async(oldMember, newMember) => {
    const logCheckMemberUpdate = await settingsSchema.findOne({
        guildid: oldMember.id,
        logs: 'none'
    })

    if(!logCheckMemberUpdate) {
        if(newMember.displayName != oldMember.displayName) {
        
            const guildMemberUpdateLog = new Discord.MessageEmbed()
            .setColor('#000066')
            .addField('User', oldMember, true)
            .addField('User ID', oldMember.id, true)
            .addField('Old Nickname', oldMember.displayName)
            .addField('New Nickname', newMember.displayName)
            .setAuthor('Nickname Change', client.user.displayAvatarURL())
    
            let webhooks = await oldMember.guild.fetchWebhooks();
            let webhook = await webhooks.first();
    
            await webhook.send({
                username: 'Razor',
                avatar: client.user.displayAvatarURL(),
                embeds: [guildMemberUpdateLog]
            }).catch(() => { return })
    
        }

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

    if(message.content.startsWith(`<@!${client.user.id}>`)) {
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
    

    const prefixSetting = await settingsSchema.findOne({
        guildid: message.guild.id
    }).catch(e => false) 
    
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


    // Blacklist Check
 
    const check = await blacklistSchema.findOne({
        user: message.author.id
    }).catch(e => false)

    if(check) {
        const { reason, date, sent } = check;

        if(sent == 'true') return;

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
    if (talkedRecently.has(message.author.id)) return message.react('🕑')
    else {
        const cooldownWhitelist = ['633776442366361601', '483375587176480768']
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