const Discord = require('discord.js')
const lockSchema = require('../../schemas/lock-schema');
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'lock',
    description: 'Denies the permission for members to speak in the specified channel',
    usage: 'lock <channel>',
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    async execute(client, message, args, { lockserver = false } = {}) {

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

        const alreadyLocked = await lockSchema.findOne({
            guildID: message.guild.id,
            channels: {
                $elemMatch: { ID: channel.id }
            }
        })

        if (alreadyLocked) return message.reply('This channel is already locked! (If you manually unlocked, just run the unlock command to register this channel as unlocked)');

        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id })
        const { modRoles } = guildSettings;

        const locking = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(`Now attempting to lock ${channel}...`)

        const msg = lockserver ? await message.reply({ embeds: [locking] }) : null;
        const permissionOverwrites = [...channel.permissionOverwrites.cache.values()]

        try {

            const enabledOverwrites = [];
            const neutralOverwrites = [];

            let foundEveryoneOverwrite = false;

            for (let i = 0; i !== permissionOverwrites.length; ++i) {
                const r = permissionOverwrites[i];
                if (r.id === message.guild.roles.everyone.id) foundEveryoneOverwrite = true;
            }

            if (!foundEveryoneOverwrite) {
                if (!foundEveryoneOverwrite) {
                    await channel.permissionOverwrites.edit(message.guild.roles.everyone.id, {
                        SEND_MESSAGES: false,
                    }, `Responsible Moderator: ${message.author.tag}`).catch(e => false)
                    neutralOverwrites.push(message.guild.id)
                }
            } else if (
                !channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id).allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
                !channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id).deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES)
            ) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone.id, {
                    SEND_MESSAGES: false,
                }, `Channel Lock | Moderator: ${message.author.tag}`).catch(() => {})
                neutralOverwrites.push(message.guild.id)
            } else if (!channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id).deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES)) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone.id, {
                    SEND_MESSAGES: false,
                }, `Channel Lock | Moderator: ${message.author.tag}`).catch(e => false)
                enabledOverwrites.push(message.guild.id)
            }

            for (let i = 0; i !== permissionOverwrites.length; ++i) {
                const role = permissionOverwrites[i];
                if (
                    role.type === 'role' && 
                    !channel.permissionsFor(message.guild.roles.cache.get(role.id)).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
                    !(neutralOverwrites.includes(role.id) || enabledOverwrites.includes(role.id))
                    && !role.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
                    !modRoles.includes(role.id)
                ) {

                    if (role.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES)) {
                        enabledOverwrites.push(role.id)
                    } else if (!role.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES)) {
                        neutralOverwrites.push(role.id)
                    }
                    
                    await sleep(200);   
                    await channel.permissionOverwrites.edit(role.id, {
                        SEND_MESSAGES: false,
                    })
                }
            }

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

        } finally {
            if(lockserver) return;
            const locked = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setAuthor('Channel Locked', client.user.displayAvatarURL())
                .setDescription('This channel is currently locked')
                .addField('Lock Reason', reason.length >= 1024 ? await client.util.createBin(reason) : reason)
            if (channel === message.channel) await msg.edit( { embeds: [locked] })
            else {
                msg.edit({ embeds: [
                    new Discord.MessageEmbed()
                    .setColor(client.config.colors.main)
                    .setDescription(`Successfully locked ${channel}`)
                ]})

                channel.send({ embeds: [locked] }).catch(() => { return });
            }
        }

    }
}
