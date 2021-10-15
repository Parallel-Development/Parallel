const Discord = require('discord.js')
const lockSchema = require('../../schemas/lock-schema');
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'unlock',
    description: 'Grants the permission for members to speak in the specified channel',
    usage: 'unlock <channel>',
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    async execute(client, message, args) {

        let channel = client.util.getChannel(message.guild, args[0])
        let reason = args.slice(1).join(' ') || 'Unspecified';
        if (!channel) {
            channel = message.channel;
            reason = args.join(' ') || 'Unspecified';
        }

        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id })
        const { modRoles } = guildSettings;

        if (channel.type !== 'GUILD_TEXT') return client.util.throwError(message, client.config.errors.not_type_text_channel);
        if (!channel.permissionsFor(message.guild.me).has([Discord.Permissions.FLAGS.MANAGE_MESSAGES, Discord.Permissions.FLAGS.SEND_MESSAGES])) return client.util.throwError(message, client.config.errors.my_channel_access_denied);
        if(!channel.permissionsFor(message.member).has([Discord.Permissions.FLAGS.MANAGE_CHANNELS, Discord.Permissions.FLAGS.SEND_MESSAGES]) && !message.member.roles.cache.some(role => modRoles.includes(role.id))) return client.util.throwError(message, client.config.errors.your_channel_access_denied);

        const getLockSchema = await lockSchema.findOne({
            guildID: message.guild.id,
            channels: {
                $elemMatch: { ID: channel.id }
            }
        })

        if (!getLockSchema) return client.util.throwError(message, 'This channel is already unlocked! (If you manually locked, just run the lock command to register this channel as locked)')

        const enabledOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).enabledOverwrites;
        const neutralOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).neutralOverwrites;

        const permissionOverwrites = channel.permissionOverwrites.cache;

        let newPermissionOverwrites = permissionOverwrites.filter(overwrite => 
            !enabledOverwrites.some(enabledOverwrite => enabledOverwrite.id === overwrite.id) && 
            !neutralOverwrites.some(neutralOverwrite => neutralOverwrite.id === overwrite.id) &&
            overwrite.id !== message.guild.roles.everyone.id
        );

        for (let i = 0; i !== enabledOverwrites.length; ++i) {
            const overwriteID = enabledOverwrites[i];
            const initialPermissionOverwrite = channel.permissionOverwrites.cache.get(overwriteID);

            if(initialPermissionOverwrite) {
            const newPermissionOverwrite = {
                id: initialPermissionOverwrite.id,
                type: initialPermissionOverwrite.type,
                deny: initialPermissionOverwrite.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) ? initialPermissionOverwrite.deny - Discord.Permissions.FLAGS.SEND_MESSAGES : initialPermissionOverwrite.deny,
                allow: initialPermissionOverwrite.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES) ?
                    initialPermissionOverwrite.allow : 
                    initialPermissionOverwrite.allow + Discord.Permissions.FLAGS.SEND_MESSAGES
            };

            newPermissionOverwrites.set(newPermissionOverwrite.id, newPermissionOverwrite);

            }

        }

        for (let i = 0; i !== neutralOverwrites.length; ++i) {
            const overwriteID = neutralOverwrites[i];
            const initialPermissionOverwrite = channel.permissionOverwrites.cache.get(overwriteID);

            if(initialPermissionOverwrite) {
            const newPermissionOverwrite = {
                id: initialPermissionOverwrite.id,
                type: initialPermissionOverwrite.type,
                deny: initialPermissionOverwrite.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) ? initialPermissionOverwrite.deny - Discord.Permissions.FLAGS.SEND_MESSAGES : initialPermissionOverwrite.deny,
                allow: initialPermissionOverwrite.allow
            };

            newPermissionOverwrites.set(newPermissionOverwrite.id, newPermissionOverwrite);

            }

        }

        await channel.permissionOverwrites.set(newPermissionOverwrites);
        
        await lockSchema.updateOne({
            guildID: message.guild.id
        },
        {
            $pull: {
                channels: {
                    ID: channel.id,
                }
            }
        })

        if(channel !== message.channel) message.reply({ content: `Successfully unlocked ${channel}`});

        const lockedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor('Channel Unlock', client.user.displayAvatarURL())
        .setTitle('This channel has been unlocked')
        .setDescription('This action undoes the action the initial channel lock did to this channel')
        if (!client.util.getChannel(message.guild, args[0]) && args.join(' ') || client.util.getChannel(message.guild, args[0]) && args.slice(1).join(' ')) lockedEmbed.addField('Reason', reason.length >= 1024 ? await client.util.createBin(reason) : reason)
        await channel.send({ embeds: [lockedEmbed] });

    }
}
