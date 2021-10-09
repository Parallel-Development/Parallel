const Discord = require('discord.js')
const lockSchema = require('../../schemas/lock-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'unlock',
    description: 'Grants the permission for members to speak in the specified channel',
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    data: new SlashCommandBuilder().setName('unlock').setDescription('Grants the permission for members to speak in the specified channel')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to unlock'))
    .addStringOption(option => option.setName('reason').setDescription('The shown reason for unlocking the channel')),
    async execute(client, interaction, args) {

        const channel = client.util.getChannel(interaction.guild, args['channel']) || interaction.channel
        const reason = args['reason'] || 'Unspecified';

        if (channel.type !== 'GUILD_TEXT') return client.util.throwError(interaction, client.config.errors.not_type_text_channel);
        if (!channel.permissionsFor(interaction.guild.me).has([Discord.Permissions.FLAGS.MANAGE_MESSAGES, Discord.Permissions.FLAGS.SEND_MESSAGES])) return client.util.throwError(interaction, client.config.errors.my_channel_access_denied);
        if(!channel.permissionsFor(interaction.member).has([Discord.Permissions.FLAGS.MANAGE_CHANNELS, Discord.Permissions.FLAGS.SEND_MESSAGES]) && !interaction.member.roles.cache.some(role => modRoles.includes(role.id))) return client.util.throwError(interaction, client.config.errors.your_channel_access_denied);

        if (channel.type !== 'GUILD_TEXT') return client.util.throwError(interaction, client.config.errors.not_type_text_channel);
        if (!channel.permissionsFor(interaction.guild.me).has([Discord.Permissions.FLAGS.MANAGE_MESSAGES, Discord.Permissions.FLAGS.SEND_MESSAGES])) return client.util.throwError(interaction, client.config.errors.my_channel_access_denied);
        if(!channel.permissionsFor(interaction.member).has([Discord.Permissions.FLAGS.MANAGE_CHANNELS, Discord.Permissions.FLAGS.SEND_MESSAGES]) || !channel.permissionsFor(interaction.member).has(Discord.Permissions.FLAGS.SEND_MESSAGES)) return client.util.throwError(interaction, client.config.errors.your_channel_access_denied);

        const getLockSchema = await lockSchema.findOne({
            guildID: interaction.guild.id,
            channels: {
                $elemMatch: { ID: channel.id }
            }
        })

        if (!getLockSchema) return client.util.throwError(interaction, 'This channel is already unlocked! (If you manually locked, just run the lock command to register this channel as locked)')

        const enabledOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).enabledOverwrites;
        const neutralOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).neutralOverwrites;

        await interaction.deferReply({ ephemeral: interaction.channel === channel });

        const permissionOverwrites = channel.permissionOverwrites.cache;

        let newPermissionOverwrites = permissionOverwrites.filter(overwrite => 
            !enabledOverwrites.some(enabledOverwrite => enabledOverwrite.id === overwrite.id) && 
            !neutralOverwrites.some(neutralOverwrite => neutralOverwrite.id === overwrite.id) &&
            overwrite.id !== interaction.guild.roles.everyone.id
        );

        for (let i = 0; i !== enabledOverwrites.length; ++i) {
            const overwriteID = enabledOverwrites[i];
            const initialPermissionOverwrite = channel.permissionOverwrites.cache.get(overwriteID);
            const newPermissionOverwrite = {
                id: initialPermissionOverwrite.id,
                type: initialPermissionOverwrite.type,
                deny: initialPermissionOverwrite.deny - Discord.Permissions.FLAGS.SEND_MESSAGES,
                allow: initialPermissionOverwrite.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES) ?
                    initialPermissionOverwrite.allow : 
                    initialPermissionOverwrite.allow + Discord.Permissions.FLAGS.SEND_MESSAGES
            };

            newPermissionOverwrites.set(newPermissionOverwrite.id, newPermissionOverwrite);

        }

        for (let i = 0; i !== neutralOverwrites.length; ++i) {
            const overwriteID = neutralOverwrites[i];
            const initialPermissionOverwrite = channel.permissionOverwrites.cache.get(overwriteID);
            const newPermissionOverwrite = {
                id: initialPermissionOverwrite.id,
                type: initialPermissionOverwrite.type,
                deny: initialPermissionOverwrite.deny - Discord.Permissions.FLAGS.SEND_MESSAGES,
                allow: initialPermissionOverwrite.allow
            };

            newPermissionOverwrites.set(newPermissionOverwrite.id, newPermissionOverwrite);

        }

        await channel.permissionOverwrites.set(newPermissionOverwrites);
        
        await lockSchema.updateOne({
            guildID: interaction.guild.id
        },
        {
            $pull: {
                channels: {
                    ID: channel.id,
                }
            }
        })

        await interaction.editReply({ content: `Successfully unlocked ${channel}`});

        const lockedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor('Channel Unlock', client.user.displayAvatarURL())
        .setTitle('This channel has been unlocked')
        .setDescription('This action undoes the action the initial channel lock did to this channel')
        if (args['reason']) lockedEmbed.addField('Reason', reason.length >= 1024 ? await client.util.createBin(reason) : reason)
        await channel.send({ embeds: [lockedEmbed] });

    }
}