const Discord = require('discord.js')
const lockSchema = require('../../schemas/lock-schema')

module.exports = {
    name: 'unlock',
    description: 'Grants the permission for members to speak in the specified channel',
    usage: 'unlock <channel>',
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    async execute(client, message, args) {

        const sleep = async (ms) => {
            return new Promise(resolve => {
                setTimeout(resolve, ms)
            })
        }

        let channel = client.util.getChannel(message.guild, args[0])

        let reason = args.slice(1).join(' ') || 'Unspecified';

        if (!channel) {
            channel = message.channel;
            reason = args.join(' ') || 'Unspecified';
        }

        if (channel.type !== 'GUILD_TEXT') return await client.util.throwError(message, client.config.errors.not_type_text_channel);
        if (!channel.permissionsFor(message.guild.me).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) return await client.util.throwError(message, client.config.errors.my_channel_access_denied);

        const getLockSchema = await lockSchema.findOne({
            guildID: message.guild.id,
            channels: {
                $elemMatch: { ID: channel.id }
            }
        })

        if (!getLockSchema) return message.reply('This channel is already unlocked! (If you manually locked, just run the lock command to register this channel as locked)')

        const enabledOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).enabledOverwrites;
        const neutralOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).neutralOverwrites;

        const unlocking = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Now attempting to unlock ${channel}...`)

        const msg = await message.reply({ embeds: [unlocking] })

        try {
            for (let i = 0; i !== enabledOverwrites.length; i++) {
                await channel.permissionOverwrites.edit(message.guild.roles.cache.get(enabledOverwrites[i]), {
                    SEND_MESSAGES: true
                }, `Channel Unlock | Moderator: ${message.author.tag}`).catch(e => false)

                await sleep(200)
            }

            for (let i = 0; i < neutralOverwrites.length; i++) {
                await channel.permissionOverwrites.edit(message.guild.roles.cache.get(neutralOverwrites[i]), {
                    SEND_MESSAGES: null
                }, `Channel Unlock | Moderator: ${message.author.tag}`).catch(e => false)

                await sleep(200)
            }

            await lockSchema.updateOne({
                guildID: message.guild.id,
                channels: {
                    $elemMatch: { ID: channel.id }
                }
            },
            {
                $pull: { 
                    channels: { 
                        ID: channel.id
                    }
                }
            })

        } finally {
            const unlocked = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setAuthor('Channel Unlocked', client.user.displayAvatarURL())
                .setDescription('This channel has been unlocked')
                .addField('Unlock Reason', reason.length >= 1024 ? await client.util.createBin(reason) : reason)
            if (channel === message.channel) msg.edit({ embeds: [unlocked] })
            else {
                msg.edit({ embeds: [
                    new Discord.MessageEmbed()
                        .setColor(client.config.colors.main)
                        .setDescription(`Successfully unlocked ${channel}`)
                ]})

                channel.send({ embeds: [unlocked] }).catch(() => { return });
            }
        }

    }
}