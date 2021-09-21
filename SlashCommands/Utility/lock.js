const Discord = require('discord.js')
const lockSchema = require('../../schemas/lock-schema');
const settingsSchema = require('../../schemas/settings-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'lock',
    description: 'Denies the permission for members to speak in the specified channel',
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    data: new SlashCommandBuilder().setName('lock').setDescription('Denies the permission for members to speak in the specified channel')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to lock'))
    .addStringOption(option => option.setName('reason').setDescription('The shown reason for locking the channel')),
    async execute(client, interaction, args) {

        let channel = client.util.getChannel(interaction.guild, args['channel']) || interaction.channel
        let reason = args['reason'] || 'Unspecified';

        if (channel.type !== 'GUILD_TEXT') return client.util.throwError(interaction, client.config.errors.not_type_text_channel);
        if (!channel.permissionsFor(interaction.guild.me).has(Discord.Permissions.FLAGS.MANAGE_CHANNELS)) return client.util.throwError(interaction, client.config.errors.my_channel_access_denied);
        if(!channel.permissionsFor(interaction.member).has(Discord.Permissions.FLAGS.MANAGE_CHANNELS) || !channel.permissionsFor(interaction.member).has(Discord.Permissions.FLAGS.SEND_MESSAGES)) return client.util.throwError(interaction, client.config.errors.your_channel_access_denied);
        if(!interaction.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR) && !interaction.member.roles.cache.some(role => channel.permissionOverwrites.cache.some(overwrite => overwrite.id === role.id && overwrite.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES)))) {
            return client.util.throwError(interaction, 'the action was refused because after the channel had been locked, you would have not had permission to send messages in the channel. Please have an administrator add an permission override in the channel for one of the moderation roles you have and set the Send Messages permission to true')
        }

        const alreadyLocked = await lockSchema.findOne({
            guildID: interaction.guild.id,
            channels: {
                $elemMatch: { ID: channel.id }
            }
        })

        if (alreadyLocked) return interaction.reply('This channel is already locked! (If you manually unlocked, just run the unlock command to register this channel as unlocked)');

        const guildSettings = await settingsSchema.findOne({ guildID: interaction.guild.id })
        const { modRoles } = guildSettings;

        await interaction.deferReply({ ephemeral: interaction.channel === channel });

        const permissionOverwrites = [...channel.permissionOverwrites.cache.values()]

        try {

            const foundEveryoneOverwrite = permissionOverwrites.some(overwrite => overwrite.id === interaction.guild.roles.everyone.id);
            const enabledOverwrites = permissionOverwrites.filter(overwrite => 
                overwrite.type === 'role' &&
                !channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
                !(neutralOverwrites.includes(role.id) || enabledOverwrites.includes(role.id)) && 
                !role.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
                !modRoles.includes(role.id) &&
                role.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES)
            );
            const neutralOverwrites = permissionOverwrites.filter(overwrite => 
                overwrite.type === 'role' &&
                !channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
                !(neutralOverwrites.includes(role.id) || enabledOverwrites.includes(role.id)) && 
                !role.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
                !modRoles.includes(role.id) &&
                !role.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) && !role.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES)
            );

            if (!foundEveryoneOverwrite) neutralOverwrites.push(interaction.guild.id);

            await channel.edit({ permissionOverwrites: [] })
            
            /*
  
            for (let i = 0; i !== permissionOverwrites.length; ++i) {
                const role = permissionOverwrites[i];
                if (
                    role.type === 'role' && 
                    !channel.permissionsFor(interaction.guild.roles.cache.get(role.id)).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
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
                guildID: interaction.guild.id,
            },
            {
                $push: {
                    channels: {
                        ID: channel.id, enabledOverwrites: enabledOverwrites, neutralOverwrites: neutralOverwrites 
                    }
                }
            })

            */;

        } finally {
            const locked = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setAuthor('Channel Locked', client.user.displayAvatarURL())
                .setDescription('This channel is currently locked')
                .addField('Lock Reason', reason.length >= 1024 ? await client.util.createBin(reason) : reason);

            await channel.send( { embeds: [locked] }).catch(() => {});
            await interaction.editReply(`Successfully locked ${channel}`)
        }

    }
}
