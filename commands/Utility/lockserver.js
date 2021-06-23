const Discord = require('discord.js');
const lockSchema = require('../../schemas/lock-schema')
const serverCooldown = new Set();

module.exports = {
    name: 'lockserver',
    description: 'Locks all channels in the server',
    usage: 'lockserver',
    permissions: 'MANAGE_GUILD',
    aliases: ['lockall', 'shutdown'],
    async execute(client, message, args) {
        if(!message.guild.me.hasPermission('ADMINISTRATOR')) return message.channel.send('To prevent further issues, I require the Administrator permission to lockdown the server')
        if(serverCooldown.has(message.guild.id)) return message.channel.send('This server is on cooldown')
        message.channel.send('You are about to lock every channel in this server. If you are **positive** you want to continue, respond with the server name')
        let filter = m => m.author.id == message.author.id;
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 30000 })
        collector.on('collect', async(message) => {
            if(message.content == message.guild.name) {
                serverCooldown.add(message.guild.id)
                setTimeout(() => {
                    serverCooldown.delete(message.guild.id)
                }, 60000)
                const msg = await message.channel.send('🔒 Locking all server channels... <a:loading:834973811735658548> | This may take a while')
                message.guild.channels.cache.forEach(async(channel) => {

                    let alreadyLocked = await lockSchema.findOne({
                        guildid: message.guild.id,
                        channelid: channel.id
                    })

                    if(!alreadyLocked) {
                        let enabledOverwrites = new Array();
                        let neutralOverwrites = new Array();

                        channel.permissionOverwrites.forEach(async (r) => {
                            if (r.type == 'role' && !channel.permissionsFor(message.guild.roles.cache.get(r.id)).toArray().includes('MANAGE_MESSAGES')) {
                                if (!r.allow.toArray().includes('MANAGE_MESSAGES')
                                    || !channel.permissionsFor(message.guild.roles.cache.get(r.id)).toArray().includes('MANAGE_MESSAGES')
                                    || !channel.permissionsFor(message.guild.roles.cache.get(r.id)).toArray().includes('ADMINISTRATOR')) {
                                    channel.updateOverwrite(message.guild.roles.cache.get(r.id), {
                                        SEND_MESSAGES: false,
                                    }).catch(e => false)

                                    if (r.allow.toArray().includes('SEND_MESSAGES')) {
                                        enabledOverwrites.push(r.id)
                                    } else if (!r.deny.toArray().includes('SEND_MESSAGES')) {
                                        neutralOverwrites.push(r.id)
                                    }
                                }
                            }
                        })

                        await new lockSchema({
                            guildid: message.guild.id,
                            guildname: message.guild.name,
                            channelid: channel.id,
                            enabledOverwrites: enabledOverwrites,
                            neutralOverwrites: neutralOverwrites
                        }).save()
                    }
                    
                })

                await msg.edit('🔒 All server channels have been locked')
                collector.stop();
                return;
            } else {
                message.channel.send('Action Cancelled')
                collector.stop();
                return;
            }
        })


        collector.on('end', (col, reason) => {
            if(reason == 'time') {
                return message.channel.send('No response in 30 seconds; cancelled')
            }
        })
    }
}
