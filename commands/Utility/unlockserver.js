const Discord = require('discord.js');
const lockSchema = require('../../schemas/lock-schema')
const serverCooldown = new Set();

module.exports = {
    name: 'unlockserver',
    description: 'Unlocks all channels in the server',
    usage: 'unlockserver <announcement channel> [reason]',
    permissions: 'MANAGE_GUILD',
    aliases: ['unlockall'],
    async execute(client, message, args) {
        if (serverCooldown.has(message.guild.id)) return message.channel.send('This server is on cooldown')
        message.channel.send('You are about to unlock every channel in this server. If you are **positive** you want to continue, respond with the server name')
        let filter = m => m.author.id == message.author.id;
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 30000 })
        collector.on('collect', async (message) => {
            if (message.content == message.guild.name) {
                serverCooldown.add(message.guild.id)
                setTimeout(() => {
                    serverCooldown.delete(message.guild.id)
                }, 60000)
                const msg = await message.channel.send('🔓 Unlocking all server channels... <a:loading:834973811735658548> | This may take a while')
                message.guild.channels.cache.forEach(async(channel) => {

                    let getLockSchema = await lockSchema.findOne({
                        guildid: message.guild.id,
                        channelid: channel.id
                    })
                    if(getLockSchema) {
                        let { enabledOverwrites, neutralOverwrites } = getLockSchema;

                        enabledOverwrites.forEach(overwrite => {
                            channel.updateOverwrite(message.guild.roles.cache.get(overwrite), {
                                SEND_MESSAGES: true
                            }).catch(e => false)
                        })

                        neutralOverwrites.forEach(overwrite => {
                            channel.updateOverwrite(message.guild.roles.cache.get(overwrite), {
                                SEND_MESSAGES: null
                            }).catch(e => false)
                        })

                        await lockSchema.deleteOne({
                            guildid: message.guild.id,
                            channelid: channel.id
                        })
                    }
                })

                await msg.edit('🔓 All server channels have been unlocked')
                collector.stop();
                return
            } else {
                message.channel.send('Action Cancelled')
                collector.stop();
                return;
            }
        })


        collector.on('end', (col, reason) => {
            if (reason == 'time') {
                return message.channel.send('No response in 30 seconds; cancelled')
            }
        })
    }
}