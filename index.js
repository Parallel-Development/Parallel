const config = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();
const mongo = require('./mongo');

const fs = require('fs')
const commandFolders = fs.readdirSync('./commands')
client.commands = new Discord.Collection()
client.aliases = new Discord.Collection()
client.categories = fs.readdirSync('./commands')

const Statcord = require("statcord.js");
const blacklistSchema = require('./schemas/blacklist-schema');
const settingsSchema = require('./schemas/settings-schema');
const punishmentSchema = require('./schemas/punishment-schema');
const warningSchema = require('./schemas/warning-schema');
const automodSchema = require('./schemas/automod-schema');
const muteSchema = require('./schemas/mute-schema');
let talkedRecently = new Set();
let hardTalkedRecently = new Set();
const userMap = new Map()
const active = new Map()
let devOnly = false

const terminalArguments = process.argv.slice(2)
let startupMessage = 'Attempting to start the bot...'
if(terminalArguments[0] == '-d') {
    devOnly = true
    startupMessage += ' | Developer Only mode is enabled'
}


console.log(startupMessage)

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

// Create statcord client
const statcord = new Statcord.Client({
    client,
    key: config.statcordkey,
    postCpuStatistics: true, /* Whether to post memory statistics or not, defaults to true */
    postMemStatistics: true, /* Whether to post memory statistics or not, defaults to true */
    postNetworkStatistics: true, /* Whether to post memory statistics or not, defaults to true */
  });

client.once('ready', async() => {
    startUp++
    if(startUp == 1) {
        console.log('Bot started (1/2) | Waiting for MongoDB...');
    } else {
        console.log('Bot started (2/2) | Bot is now ready');
    }
  // Start statcord auto posting
  statcord.autopost();
})

setInterval(async() => {

    // Check for expired punishments

    let currentDate = new Date().getTime()
    const expiredDate = await punishmentSchema.find({
        expires: { $lte: currentDate },
    })
   .catch(e => false)

   expiredDate.forEach(async(expiredDate) => {
       let {type, userID, guildid, _id} = expiredDate

       if(type === 'mute') {
            await punishmentSchema.deleteOne({
                _id: _id,
            })

            var server = client.guilds.cache.get(guildid)

            var role = server.roles.cache.find(r => r.name === 'Muted')
            if(!role) return;

            var member = await server.members.fetch(userID).catch(() => member = null)

            if(member) member.roles.remove(role).catch(() => { return })

            let rmrolesonmute = await settingsSchema.findOne({
                guildid: server.id,
                rmrolesonmute: true
            })
            if(rmrolesonmute && member) {
                let getMemberRoles = await muteSchema.findOne({
                    guildid: server.id
                })
                if(getMemberRoles) {
                    let { roles } = getMemberRoles;
                    roles.forEach(r => {
                        member.roles.add(server.roles.cache.get(r)).catch(() => { return })
                    })
                }
            } 

            await muteSchema.deleteMany({
                guildid: server.id,
                userid: userID
            })

            const unmutedm = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setAuthor('You were unmuted', client.user.displayAvatarURL())
                .setTitle(`You were unmuted in ${server.name}`)
                .addField('Reason', '[AUTO] Mute expired')

            if(member) member.send(unmutedm)

            var file = require('./structures/expiredLogging');
            file.run(client, 'Unmuted', server, await client.users.fetch(userID), '[AUTO] Mute Expired')

        }

        if(type === 'ban') {
            await punishmentSchema.deleteOne({
                _id: _id
            })

            const { userID } = expiredDate

            var server = await client.guilds.fetch(guildid)

            server.members.unban(userID).catch(() =>  { return })

            var file = require('./structures/expiredLogging');
            file.run(client, 'Unbannned', server, await client.users.fetch(userID), '[AUTO] Ban Expired')
        }

    })

    // Check for expired warnings

    const expiredWarningDate = await warningSchema.find({
        warnings: {
            $elemMatch: {
                expires: { $lte: currentDate },
                type: 'Warn'
            }
        }
    }).catch(e => false)

    expiredWarningDate.forEach(async(expiredWarningDate) => {
        let { _id} = expiredWarningDate

        await warningSchema.updateOne({
            _id: _id
        },
        {
            $pull: {
                warnings: { 
                    expires: {
                        $lte: currentDate
                    }
                }
            }
        })
    })

    // Check for if a user reached X warnings and should be punished

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
        guildid: member.guild.id,
        type: 'mute'
    })

    if(joinCheck) {
        let role = member.guild.roles.cache.find(r => r.name === 'Muted')
        if(!role) return;
        member.roles.add(role).catch(() => { return })
    }

    const blacklistCheck = await blacklistSchema.findOne({
        user: member.id
    })
    if(blacklistCheck) {
        if (member.guild.id == '747624284008218787') {
            const blacklistRole = member.guild.roles.cache.find(r => r.name == 'Blacklisted')
            member.roles.add(blacklistRole)
        }
    }

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

/*
'id' => {
    msgCount: 0,
    lastMessage: 'message',
    timer: fn()
}
*/

client.on('messageUpdate', async(oldMessage, message) => {

    if (devOnly) {
        if (!config.developers.includes(message.author.id)) return
    }

    if(!message.guild) return
    if (message.author.bot) return;

    let getModerators = await settingsSchema.findOne({
        guildid: message.guild.id
    })
    let isModerator = false;
    message.member.roles.cache.forEach(role => {
        if (getModerators.modRoles.includes(role.id)) isModerator = true;
    })

    let channelBypassed = await automodSchema.findOne({
        guildid: message.guild.id,
        bypassChannels: message.channel.id
    })

    // Automod //

    if (!channelBypassed || channelBypassed.length == 0) {
        // Filter

        let filterCheck = await automodSchema.findOne({
            guildid: message.guild.id,
        })

        let foundInText = false
        let { filterList } = filterCheck

        for (const i in filterList) {
            let filterRegex = new RegExp(`\\b${filterList[i]}\\b`)
            if (filterRegex.test(message.content.toLowerCase())) {
                foundInText = true
            }
        }
        if (foundInText) {
            if(!message.member.hasPermission('MANAGE_MESSAGES')) {
                if(!isModerator) {
                    var file = require('./automod/filter')
                    file.run(client, message)
                    return;
                }
            }
        }

        // Walltext

        let walltextCheck = message.content.split('\n')
        if (walltextCheck.length >= 6) {
            if (!message.member.hasPermission('MANAGE_MESSAGES')) {
                if (!isModerator) {
                    var file = require('./automod/walltext')
                    file.run(client, message)
                    return;
                }
            }
        }

        // Invites

        let inviteCheck = new RegExp('(discord|d|dis|discordapp)(.gg|.com\/invite)/[a-zA-Z0-9]+$')
        if (inviteCheck.test(message.content)) {
            if (!message.member.hasPermission('MANAGE_MESSAGES')) {
                if (!isModerator) {
                    var file = require('./automod/invite')
                    file.run(client, message)
                    return;
                }
            }
        }

        // Links

        let linkRegex = new RegExp('[a-zA-Z0-9]\\.(com|net|co|org|io|me|xyz|wtf|tv|edu|eu|us|codes|shop|info|gov|gg|gif)\\b')

        if (linkRegex.test(message.content)) {
            if (!message.member.hasPermission('MANAGE_MESSAGES')) {
                if (!isModerator) {
                    var file = require('./automod/link')
                    file.run(client, message)
                    return;
                }
            }
        }

        let isMessageLogChannel = await settingsSchema.findOne({
            guildid: message.guild.id,
        })

        let { messageLogging } = isMessageLogChannel

        if(messageLogging !== 'none') {

            if (!message.guild.channels.cache.get(messageLogging)) {

                await settingsSchema.updateOne({
                    guildid: message.guild.id
                },
                {
                    messageLogging: 'none'
                })

                return;
            }

            let messageLogChannel = message.guild.channels.cache.get(messageLogging);

            let messageLogEmbed = new Discord.MessageEmbed()
            .setColor('#FFFF00')
            .setAuthor('Parallel Logging', client.user.displayAvatarURL())
            .setTitle('Message Update')
            .setDescription(`__[Jump to Message](${message.url})__`)  
            .addField('User', `**${oldMessage.author.tag}** - \`${oldMessage.author.id}\``) 
            .addField('Old Message', `\`\`\`${oldMessage.content}\`\`\``)
            .addField('New Message', `\`\`\`${message.content}\`\`\``)
            .addField('Edited in', message.channel)
            .setFooter(`ID: ${message.id}`)
            messageLogChannel.send(messageLogEmbed).catch(() => { return })
        }
    }

});

client.on('messageDelete', async(message) => {

    if(!message.guild) return;
    
    if(devOnly) {
        if(!config.developers.includes(message.author.id)) return;
    }

    if(message.bot) return;
    if (!message.content && message.embeds.length > 0) return;
    let attachments = [];
    if(message.attachments.size > 0) {
        message.attachments.forEach(attachment => {
            attachments.push(attachment.url)
        })
    }
    let isMessageLogChannel = await settingsSchema.findOne({
        guildid: message.guild.id
    })

    let { messageLogging } = isMessageLogChannel

    if(messageLogging !== 'none') {

        if (!message.guild.channels.cache.get(messageLogging)) {

            await settingsSchema.updateOne({
                guildid: message.guild.id
            },
                {
                    messageLogging: 'none'
                })

            return;
        }

        let messageLogChannel = message.guild.channels.cache.get(messageLogging);
        
        let messageLogEmbed = new Discord.MessageEmbed()
        .setColor('#FFFF00')
        .setAuthor('Parallel Logging', client.user.displayAvatarURL())
        .setTitle('Message Deleted')
        .addField('User', `**${message.author.tag}** - \`${message.author.id}\``)
        if(message.content) messageLogEmbed.addField('Message', `\`\`\`${message.content}\`\`\``)
        if(attachments.length > 0) messageLogEmbed.addField('Attachments', attachments.join('\n'))
        messageLogEmbed.addField('Deleted in', message.channel)
        messageLogEmbed.setFooter(`ID: ${message.id}`)
        messageLogChannel.send(messageLogEmbed).catch(() => { return })
        
    }
})

client.on('message', async(message) => {

    if (devOnly) {
        if (!config.developers.includes(message.author.id)) return
    }

    if(message.author.bot) return;
    if(!message.guild) return;

    if(!message.guild.me.hasPermission('SEND_MESSAGES', 'READ_MESSAGES')) return;

    let channelBypassed = await automodSchema.findOne({
        guildid: message.guild.id,
        bypassChannels: message.channel.id
    })

    const check = await blacklistSchema.findOne({
        user: message.author.id,
        server: false
    }).catch(e => false)

    const check2 = await blacklistSchema.findOne({
        user: message.guild.id,
        server: true
    })

    const prefixSetting = await settingsSchema.findOne({
        guildid: message.guild.id
    }).catch(e => false)

    if(!prefixSetting) {
        await new settingsSchema({
            guildname: message.guild.name,
            guildid: message.guild.id,
            prefix: '>',
            baninfo: 'none',
            delModCmds: false,
            locked: [],
            rmrolesonmute: false,
            autowarnexpire: 'disabled',
            manualwarnexpire: 'disabled',
            messageLogging: 'none',
            moderationLogging: 'none',
            automodLogging: 'none',
            modRoles: [],
        }).save()

    }

    const getPrefix = await settingsSchema.findOne({
        guildid: message.guild.id
    })

    const { prefix } = getPrefix;

    const automodCheck = await automodSchema.findOne({
        guildid: message.guild.id
    }).catch(e => false)

    // Automod //

    if (!channelBypassed || channelBypassed.length == 0) {

        let getModerators = await settingsSchema.findOne({
            guildid: message.guild.id
        })
        let isModerator = false;
        message.member.roles.cache.forEach(role => {
            if(getModerators.modRoles.includes(role.id)) isModerator = true;
        })
        // Filter

        let filterCheck = await automodSchema.findOne({
            guildid: message.guild.id,
        })

        let foundInText = false
        if (filterCheck) {
            let { filterList } = filterCheck
            for (const i in filterList) {
                let filterRegex = new RegExp(`\\b${filterList[i]}\\b`)
                if (filterRegex.test(message.content.toLowerCase())) {
                    foundInText = true
                }
            }
            if (foundInText) {
                if (!message.member.hasPermission('MANAGE_MESSAGES')) {
                    if(!isModerator) {
                        var file = require('./automod/filter')
                        file.run(client, message)
                        return;
                    }
                }
            }
        }

         // Mass Mention

        if (message.mentions.users.filter(u => u.bot == false).size >= 5) {
            if (!message.member.hasPermission('MANAGE_MESSAGES')) {
                if (!isModerator) {
                    var file = require('./automod/massmention')
                    file.run(client, message)
                    return;
                }
            }
        }

        // Walltext

        let walltextCheck = message.content.split('\n')
        if (walltextCheck.length >= 9 || message.content.length >= 700) {
            if (!message.member.hasPermission('MANAGE_MESSAGES')) {
                if (!isModerator) {
                    var file = require('./automod/walltext')
                    file.run(client, message)
                    return;
                }
            }
        }

        // Spam

        if (userMap.has(message.author.id)) {
            const userData = userMap.get(message.author.id)
            let msgCount = userData.msgCount
            if (parseInt(msgCount) === 5) {
                if (!message.member.hasPermission('MANAGE_MESSAGES')) {
                    if (!isModerator) {
                        var file = require('./automod/fast')
                        file.run(client, message)
                        return;
                    }
                }
                userMap.delete(message.author.id)
            } else {
                msgCount++
                userData.msgCount = msgCount;
                userMap.set(message.author.id, userData)
            }
        } else {
            userMap.set(message.author.id, {
                msgCount: 1,
                lastMessage: message,
                timer: null
            })
            setTimeout(() => {
                userMap.delete(message.author.id)
            }, 4000)
        }

        // Invites

        let inviteCheck = new RegExp('(discord|d|dis|discordapp)(.gg|.com\/invite)/[a-zA-Z0-9]+$')
        if (inviteCheck.test(message.content)) {
            if (!message.member.hasPermission('MANAGE_MESSAGES')) {
                if (!isModerator) {
                    var file = require('./automod/invite')
                    file.run(client, message)
                    return;
                }
            }
        }

        // Links

        let linkRegex = new RegExp('[a-zA-Z0-9]\\.(com|net|co|org|io|me|xyz|wtf|tv|edu|eu|us|codes|shop|info|gov|gg|gif)\\b')

        if (linkRegex.test(message.content)) {
            if (!message.member.hasPermission('MANAGE_MESSAGES')) {
                if (!isModerator) {
                    var file = require('./automod/link')
                    file.run(client, message)
                    return;
                }
            }
        }
    }

    // Automatic setup if there are no automod settings for the server found

    if(!automodCheck) {
        await new automodSchema({
            guildname: message.guild.name,
            guildid: message.guild.id,
            filter: 'disabled',
            filterList: [],
            fast: 'disabled',
            walltext: 'disabled',
            flood: 'disabled',
            links: 'disabled',
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

    // Check for if the message starts with pinging Parallel, if it does, give the prefix;

    if (message.content.startsWith('<@!745401642664460319>') || message.content.startsWith('<@745401642664460319>')) {

        if(check) return;

        if (talkedRecently.has(message.author.id)) {
            if (hardTalkedRecently.has(message.author.id)) return;
            hardTalkedRecently.add(message.author.id)
            setTimeout(() => {
                hardTalkedRecently.delete(message.author.id)
            }, 2000)
            return message.react('🕑')
        } else {
            const cooldownWhitelist = config.developers;
            if (!cooldownWhitelist.includes(message.author.id)) {
                talkedRecently.add(message.author.id);
                setTimeout(() => {
                    talkedRecently.delete(message.author.id)
                }, 1500)
            }
        }

        message.channel.send(`Hello! My prefix is \`${prefix}\` | Run \`${prefix}help\` for a list of commands`)
    }
    
    if(!message.content.startsWith(prefix)) return;

    // Run

    let ops = {
        active: active
    }

    var args = message.content.split(' ')
    var cmd = args.shift().slice(prefix.length).toLowerCase();

    const command = client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd));
    if(!command) return;

    // Blacklist Check

    if (check) {
        let { reason, date, sent } = check;

        if (sent) return;
        message.channel.send('Your command request was denied: your account ID has been added to the command blacklist')

        const blacklistEmbed = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription(`Unfortunately, you were blacklisted from this bot. This means the bot will ignore you completely, although you will still be affected by automod and such. If you believe this ban is unjustified, you can submit an appeal [here](https://docs.google.com/document/d/15EwKPOPvlIO5iSZj-qQyBjmQ5X7yKHlijW9wCiDfffM/edit)`)
            .setAuthor('You are blacklisted from this bot!', client.user.displayAvatarURL())
            .addField('Reason', reason)
            .addField('Date', date)
            .setFooter('You cannot appeal your ban if it is not unjustified!');
        message.author.send(blacklistEmbed).catch(() => { return message.react('🛑') }).catch(() => { return })
        await blacklistSchema.updateMany({
            user: message.author.id,
            server: false
        },
        {
            sent: true
        })
        return;
    }

    if(check2) {
        let { reason, date, sent } = check2;

        if(sent) return message.guild.leave();
        message.channel.send(`Your command request was denied: the server in which you ran this command has been added to the command blacklist.\n\nReason: ${reason}\nDate: ${date}\nAppeal: <https://docs.google.com/document/d/15EwKPOPvlIO5iSZj-qQyBjmQ5X7yKHlijW9wCiDfffM/edit>\n\n\nGoodbye now ;)`)

        await blacklistSchema.updateMany({
            user: message.guild.id,
            server: true
        },
        {
            sent: true
        })

        message.guild.leave();
        return 
    }



    if (!message.channel.permissionsFor(message.guild.me).toArray().includes('SEND_MESSAGES')) return;

    // Cooldown Check

    if (talkedRecently.has(message.author.id)) {

        if(hardTalkedRecently.has(message.author.id)) return;
        hardTalkedRecently.add(message.author.id)
        setTimeout(() => {
            hardTalkedRecently.delete(message.author.id)
        }, 2000)
        let msg = await message.channel.send('Your command request was cancelled: you are currently on command cooldown')
        setTimeout(() => { 
             msg.delete();
             message.delete().catch(() => { return } )
        }, 3000)
        return;
    } else {
        const cooldownWhitelist = config.developers;
        if (!cooldownWhitelist.includes(message.author.id)) {
            talkedRecently.add(message.author.id);
            setTimeout(() => {
                talkedRecently.delete(message.author.id)
            }, 1500)
        } 
    }

    if (command.developing) {
        if (!config.developers.includes(message.author.id)) return message.channel.send('This command is currently under development and not open to the public!')
    }

    if(command.permissions) {

        function denyAccess() {
            const missingPermissionsError = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setDescription(`You do not have the required permission to execute the \`${command.name}\` command\nMissing Permission: \`${command.permissions
                    .replace('_', ' ')
                    .toUpperCase()}\``)
            return message.channel.send(missingPermissionsError)
        }

        let userHasModRole = await settingsSchema.findOne({
            guildid: message.guild.id
        })
        let isModerator = false;
        if(userHasModRole.modRoles.length > 0) {
            message.member.roles.cache.forEach(role => {
                if(userHasModRole.modRoles.includes(role.id)) isModerator = true;
            })
        }
        if(!message.member.hasPermission(command.permissions)) {
            if(command.permissions == 'MANAGE_MESSAGES'
            || command.permissions == 'BAN_MEMBERS'
            || command.permissions == 'KICK_MEMBERS'
            || command.permissions == 'MANAGE_NICKNAMES'
            || command.permissions == 'MANAGE_ROLES'
            || command.permissions == 'MANAGE_CHANNELS') {
                if(!isModerator) {
                    return denyAccess();
                }
            } else {
                return denyAccess();
            }
        }
    }

    const commandsDisabledInChannel = await settingsSchema.findOne({
        guildid: message.guild.id,
        locked: message.channel.id
    })

    let commandsDisabledInCategory;

    if(message.channel.parent) commandsDisabledInCategory = await settingsSchema.findOne({
        guildid: message.guild.id,
        locked: message.channel.parent.id
    })

    if(commandsDisabledInChannel && commandsDisabledInChannel.length !== 0 || commandsDisabledInCategory && commandsDisabledInCategory.length !== 0) {
        let userHasModRole = await settingsSchema.findOne({
            guildid: message.guild.id
        })
        let isModerator = false;
        if(userHasModRole.modRoles.length > 0) {
            message.member.roles.cache.forEach(role => {
                if(userHasModRole.modRoles.includes(role.id)) isModerator = true;
            })
        }

        if(!command.moderationCommand) {
            if(!message.member.hasPermission('MANAGE_MESSAGES') && !isModerator) {
                let msg = await message.channel.send('Your command request was cancelled: commands are currently restricted in this channel or channel category')
                setTimeout(() => { 
                    msg.delete();
                    message.delete().catch(() => { return } );
                }, 3000)
                return;
            } 
        }
    }

    try {
        command.execute(client, message, args, ops)
        // Post Statcord command
        statcord.postCommand(command.name, message.author.id);
    } catch {
        return
    }
});

statcord.on("autopost-start", () => {
    // Emitted when statcord autopost starts
    console.log("Started autopost");
  });
  
  statcord.on("post", status => {
    // status = false if the post was successful
    // status = "Error message" or status = Error if there was an error
    if (!status) return;
    else console.error(status);
  });

client.login(config.token);
