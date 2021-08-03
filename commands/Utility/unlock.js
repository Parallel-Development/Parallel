const Discord = require('discord.js')
const lockSchema = require('../../schemas/lock-schema')

module.exports = {
    name: 'unlock',
    description: 'Grants the permission for members to speak in the specified channel',
    usage: 'unlock <channel>',
    requiredBotPermission: 'MANAGE_CHANNELS',
    permissions: 'MANAGE_CHANNELS',
    async execute(client, message, args) {

        const sleep = async (ms) => {
            return new Promise(resolve => {
                setTimeout(resolve, ms)
            })
        }

        let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0])

        let reason = args.slice(1).join(' ') || 'Unspecified';

        if (!channel) {
            channel = message.channel;
            reason = args.join(' ') || 'Unspecified';
        }

        if (channel.type !== 'GUILD_TEXT') return message.reply(client.config.errorMessages.not_type_text_channel);
        if (!channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES')) return message.reply(client.config.errorMessages.channel_access_denied);
        if (!channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES')) return message.reply(client.config.errorMessages.my_channel_access_denied);

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

        const msg = await message.reply(unlocking)

        try {
            for (var i = 0; i !== enabledOverwrites.length; i++) {
                channel.permissionOverwrites.edit(message.guild.roles.cache.get(enabledOverwrites[i]), {
                    SEND_MESSAGES: true
                }, `Channel Unlock | Moderator: ${message.author.tag}`).catch(e => false)

                await sleep(200)
            }

            for (var i = 0; i < neutralOverwrites.length; i++) {
                channel.permissionOverwrites.edit(message.guild.roles.cache.get(neutralOverwrites[i]), {
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

            if (channel === message.channel) {

                const unlocked = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setAuthor('Channel Unlocked', client.user.displayAvatarURL())
                .setDescription('This channel has been unlocked')
                .addField('Unlock Reason', reason)

                msg.edit({ embeds: [unlocked] })
            } else {
                msg.edit(new Discord.MessageEmbed()
                    .setColor(client.config.colors.main)
                    .setDescription(`Successfully unlocked ${channel}`))

                channel.send({ embeds: [unlocked] }).catch(() => { return });
            }
        }

    }
}