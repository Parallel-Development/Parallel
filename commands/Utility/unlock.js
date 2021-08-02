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

        if (channel.type !== 'text') return message.channel.send(client.config.errorMessages.not_type_text_channel);
        if (!channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES')) return message.channel.send(client.config.errorMessages.channel_access_denied);
        if (!channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES')) return message.channel.send(client.config.errorMessages.my_channel_access_denied);

        const getLockSchema = await lockSchema.findOne({
            guildID: message.guild.id,
            channels: {
                $elemMatch: { ID: channel.id }
            }
        })

        console.log(getLockSchema);
        console.log(getLockSchema.channels);
        // and I just can't seem to get enabledOverwrites and neutralOverwrites out of this! But it did? Do you mean in the unlockserver part? Cause it got it here in this one I believe.
        // [{"ID":"800716799754502184","enabledOverwrites":[],"neutralOverwrites":["790760107365498880"]}] is what it said

        if (!getLockSchema) return message.channel.send('This channel is already unlocked! (If you manually locked, just run the lock command to register this channel as locked)')

        const enabledOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).enabledOverwrites;
        const neutralOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).neutralOverwrites;

        const unlocking = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Now attempting to unlock ${channel}...`)

        const msg = await message.channel.send(unlocking)

        try {
            for (var i = 0; i !== enabledOverwrites.length; i++) {
                channel.updateOverwrite(message.guild.roles.cache.get(enabledOverwrites[i]), {
                    SEND_MESSAGES: true
                }, `Channel Unlock | Moderator: ${message.author.tag}`).catch(e => false)

                await sleep(200)
            }

            for (var i = 0; i < neutralOverwrites.length; i++) {
                channel.updateOverwrite(message.guild.roles.cache.get(neutralOverwrites[i]), {
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
                .addField('Unlock Reason', reason)

            if (channel === message.channel) {
                msg.edit(unlocked)
            } else {
                msg.edit(new Discord.MessageEmbed()
                    .setColor(client.config.colors.main)
                    .setDescription(`Successfully unlocked ${channel}`))

                channel.send(unlocked).catch(() => { return });
            }
        }

    }
}