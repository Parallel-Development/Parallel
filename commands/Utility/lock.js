const Discord = require('discord.js')
const lockSchema = require('../../schemas/lock-schema')

module.exports = {
    name: 'lock',
    description: 'Denies the permission for members to speak in the specified channel',
    usage: 'lock <channel>',
    requiredBotPermission: 'MANAGE_CHANNELS',
    permissions: 'MANAGE_CHANNELS',
    async execute(client, message, args) {

        const sleep = async (ms) => {
            return new Promise(resolve => {
                setTimeout(resolve, ms)
            })
        }

        let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        let reason = args.slice(1).join(' ') || 'Unspecified';
        if (!channel) {
            channel = message.channel;
            reason = args.join(' ') || 'Unspecified';
        }

        if (channel.type !== 'GUILD_TEXT') return message.reply(client.config.errorMessages.not_type_text_channel);
        if (!channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES')) return message.reply(client.config.errorMessages.channel_access_denied);
        if (!channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES')) return message.reply(client.config.errorMessages.my_channel_access_denied);

        if (!channel) {
            channel = message.channel;
            reason = args.join(' ') || 'Unspecified';
        }

        const alreadyLocked = await lockSchema.findOne({
            guildID: message.guild.id,
            channels: {
                $elemMatch: { ID: message.channel.id }
            }
        })

        if (alreadyLocked) return message.reply('This channel is already locked! (If you manually unlocked, just run the unlock command to register this channel as unlocked)')

        const locking = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Now attempting to lock ${channel}...`)

        const msg = await message.reply({ embeds: [locking] })
        const permissionOverwrites = [...channel.permissionOverwrites.values()]

        try {

            const enabledOverwrites = [];
            const neutralOverwrites = [];

            let foundEveryoneOverwrite = false;
            try {
                for (var i = 0; i !== permissionOverwrites.length; ++i) {
                    const r = permissionOverwrites[i];
                    if (r.type === 'role' && !channel.permissionsFor(message.guild.roles.cache.get(r.id)).has('MANAGE_MESSAGES')) {
                        if (r.name === '@everyone') foundEveryoneOverwrite = true;
                        if (!r.allow.has('MANAGE_MESSAGES')
                            || !channel.permissionsFor(message.guild.roles.cache.get(r.id)).has('MANAGE_MESSAGES')
                            || !channel.permissionsFor(message.guild.roles.cache.get(r.id)).has('ADMINISTRATOR')) {

                            channel.permissionOverwrites.edit(message.guild.roles.cache.get(r.id), {
                                SEND_MESSAGES: false,
                            }, `Channel Lock | Moderator: ${message.author.tag}`).catch(e => false)

                            if (r.allow.has('SEND_MESSAGES')) {
                                enabledOverwrites.push(r.id)
                            } else if (!r.deny.has('SEND_MESSAGES')) {
                                neutralOverwrites.push(r.id)
                            }

                            await sleep(200);
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
            if(guildLockSchema) {
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
        } finally {
            if (channel === message.channel) {

                const locked = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setAuthor('Channel Locked', client.user.displayAvatarURL())
                .setDescription('This channel is currently locked')
                .addField('Lock Reason', reason)

                await msg.edit( { embeds: [locked] })
            } else {
                msg.edit(new Discord.MessageEmbed()
                    .setColor(client.config.colors.main)
                    .setDescription(`Successfully locked ${channel}`))

                channel.send({ embeds: [locked] }).catch(() => { return });
            }
        }

    }
}