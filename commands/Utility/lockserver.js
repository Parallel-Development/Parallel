const Discord = require('discord.js');
const lockSchema = require('../../schemas/lock-schema');
const currentlyInProcess = new Set();


module.exports = {
    name: 'lockserver',
    description: 'Locks all channels in the server',
    usage: 'lockserver',
    requiredBotPermission: 'ADMINISTRATOR',
    permissions: 'ADMINISTRATOR',
    aliases: ['lockall', 'shutdown'],
    async execute(client, message, args) {

        const sleep = async (ms) => {
            return new Promise(resolve => {
                setTimeout(resolve, ms)
            })
        }

        if (currentlyInProcess.has(message.guild.id)) return message.reply('This server is currently undergoing a unlock or a lock. Please wait for it to finish before attempting to lock again')
        message.reply('You are about to lock every channel in this server. If you are **positive** you want to continue, respond with the server name')
        const filter = m => m.author.id === message.author.id;
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 30000 })
        collector.on('collect', async (message) => {
            if (message.content === message.guild.name) {
                collector.stop()
                currentlyInProcess.add(message.guild.id);
                const msg = await message.reply('🔒 Locking all server channels... <a:loading:834973811735658548> | This may take a range from a few seconds up to a few minutes depending on your server size\n\nPlease do not remove any permissions from me while this is running or it may cause further issues')

                const channels = [...message.guild.channels.cache.values()]

                try {
                    for (var i = 0; i !== channels.length; ++i) {

                        const channel = channels[i];

                        const alreadyLocked = await lockSchema.findOne({
                            guildID: message.guild.id,
                            channels: {
                                $elemMatch: { ID: channel.id }
                            }
                        })

                        const neutralOverwrites = [];
                        const enabledOverwrites = [];
                        const permissionOverwrites = [...channel.permissionOverwrites.values()]

                        if (!alreadyLocked && !channel.permissionsLocked && message.guild.me.permissions.has('ADMINISTRATOR') && channel.type !== 'voice') {
                            let foundEveryoneOverwrite = false;
                            try {
                                for (var i = 0; i !== permissionOverwrites.length; ++i) {
                                    let r = permissionOverwrites[i];
                                    if (r.type === 'role' && !channel.permissionsFor(message.guild.roles.cache.get(r.id)).has('MANAGE_MESSAGES')) {
                                        if (r.id === message.guild.roles.everyone.id) foundEveryoneOverwrite = true;
                                        if (!r.allow.has('MANAGE_MESSAGES')
                                            || !channel.permissionsFor(message.guild.roles.cache.get(r.id)).has('MANAGE_MESSAGES')
                                            || !channel.permissionsFor(message.guild.roles.cache.get(r.id)).has('ADMINISTRATOR')) {

                                            channel.permissionOverwrites.edit(message.guild.roles.cache.get(r.id), {
                                                SEND_MESSAGES: false,
                                            }, `Server Lockdown | Trusted Moderator: ${message.author.tag}`).catch(e => false)

                                            if (r.allow.has('SEND_MESSAGES')) {
                                                enabledOverwrites.push(r.id)
                                            } else if (!r.deny.has('SEND_MESSAGES')) {
                                                neutralOverwrites.push(r.id)
                                            }

                                            await sleep(100);
                                        }
                                    }
                                }
                            } finally {
                                if (!foundEveryoneOverwrite) {
                                    channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                                        SEND_MESSAGES: false,
                                    }).catch(e => false)
                                    neutralOverwrites.push(message.guild.id)
                                }
                            }

                            const guildLockSchema = await lockSchema.findOne({
                                guildID: message.guild.id
                            })
                            if (guildLockSchema) {
                                await lockSchema.updateOne({
                                    guildID: message.guild.id,
                                },
                                    {
                                        $push: {
                                            channels: {
                                                ID: channel.id, enabledOverwrites: enabledOverwrites, neutralOverwrites: neutralOverwrites
                                            }
                                        }
                                    })
                            } else {
                                await new lockSchema({
                                    guildname: message.guild.name,
                                    guildID: message.guild.id,
                                    channels: [{ ID: channel.id, enabledOverwrites: enabledOverwrites, neutralOverwrites: neutralOverwrites }]
                                }).save()
                            }
                        }

                    }
                } finally {
                    currentlyInProcess.delete(message.guild.id)
                    await msg.edit(`🔒 All server channels have been locked!`)
                    return message.reply(`Process complete! ${msg.url}`)
                }

            } else {
                message.reply('Action Cancelled')
                collector.stop();
                return;
            }
        })


        collector.on('end', (col, reason) => {
            if (reason === 'time') {
                return message.reply('No response in 30 seconds; cancelled')
            }
        })
    }
}
