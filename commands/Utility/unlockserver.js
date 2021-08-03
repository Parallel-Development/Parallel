const Discord = require('discord.js');
const lockSchema = require('../../schemas/lock-schema')
const currentlyInProcess = new Set();

module.exports = {
    name: 'unlockserver',
    description: 'Unlocks all channels in the server',
    usage: 'unlockserver',
    requiredBotPermission: 'ADMINISTRATOR',
    permissions: 'ADMINISTRATOR',
    aliases: ['unlockall'],
    async execute(client, message, args) {

        const sleep = async (ms) => {
            return new Promise(resolve => {
                setTimeout(resolve, ms)
            })
        }

        const areAnyLocked = await lockSchema.findOne({
            guildID: message.guild.id
        })

        if (!areAnyLocked) return message.reply('No channels are currently locked!')

        if (currentlyInProcess.has(message.guild.id)) return message.reply('This server is on cooldown')
        message.reply('You are about to unlock every channel in this server. If you are **positive** you want to continue, respond with the server name')
        const filter = m => m.author.id === message.author.id;
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 30000 })
        collector.on('collect', async (message) => {
            if (message.content === message.guild.name) {
                collector.stop();
                currentlyInProcess.add(message.guild.id);
                const msg = await message.reply('🔓 Unlocking all server channels... <a:loading:834973811735658548> | This may take a range from a few seconds up to a few minutes depending on your server size\n\nPlease do not remove any permissions from me while this is running or it may cause further issues')

                const channels = [...message.guild.channels.cache.values()]

                try {
                    for (var i = 0; i !== channels.length; ++i) {

                        const channel = channels[i]

                        const getLockSchema = await lockSchema.findOne({
                            guildID: message.guild.id,
                            channels: {
                                $elemMatch: {
                                    ID: channel.id
                                }
                            }
                        })

                        if (getLockSchema && message.guild.me.permissions.has('ADMINISTRATOR')) {

                            const enabledOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).enabledOverwrites;
                            const neutralOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).neutralOverwrites;

                            const a = async () => {
                                for (var i = 0; i !== enabledOverwrites.length; ++i) {
                                    channel.permissionOverwrites.edit(message.guild.roles.cache.get(enabledOverwrites[i]), {
                                        SEND_MESSAGES: true
                                    }, `Server Unlock | Administrator: ${message.author.tag}`).catch(e => false)

                                    await sleep(100)
                                }
                            }
                            const b = async () => {

                                for (var i = 0; i !== neutralOverwrites.length; ++i) {
                                    channel.permissionOverwrites.edit(message.guild.roles.cache.get(neutralOverwrites[i]), {
                                        SEND_MESSAGES: null
                                    }, `Server Unlock | Administrator: ${message.author.tag}`).catch(e => false)

                                    await sleep(100)
                                }
                            }

                            await a().then(await b())
                        }
                    }
                } finally {
                    currentlyInProcess.delete(message.guild.id);
                    await msg.edit(`🔓 All server channels have been unlocked`);
                    message.reply(`Process complete! ${msg.url}`)
                    await lockSchema.deleteOne({
                        guildID: message.guild.id
                    })
                    return;
                }

            } else {
                message.reply('Action Cancelled')
                return collector.stop();
            }
        })


        collector.on('end', (col, reason) => {
            if (reason === 'time') {
                return message.reply('No response in 30 seconds; cancelled')
            }
        })
    }
}
