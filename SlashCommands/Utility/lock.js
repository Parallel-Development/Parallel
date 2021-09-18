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

        const sleep = async (ms) => {
            return new Promise(resolve => {
                setTimeout(resolve, ms)
            })
        }

        let channel = client.util.getChannel(interaction.guild, args['channel']) || interaction.channel
        let reason = args['reason'] || 'Unspecified';

        if (!channel.isText()) return client.util.throwError(interaction, client.config.errors.not_type_text_channel);
        if (!channel.permissionsFor(interaction.guild.me).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) return client.util.throwError(interaction, client.config.errors.my_channel_access_denied);

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

            const enabledOverwrites = [];
            const neutralOverwrites = [];

            let foundEveryoneOverwrite = false;

            for (let i = 0; i !== permissionOverwrites.length; ++i) {
                const r = permissionOverwrites[i];
                if (r.id === interaction.guild.roles.everyone.id) foundEveryoneOverwrite = true;
            }

            if (!foundEveryoneOverwrite) {
                if (!foundEveryoneOverwrite) {
                    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
                        SEND_MESSAGES: false,
                    }, `Responsible Moderator: ${interaction.user.tag}`).catch(e => false)
                    neutralOverwrites.push(interaction.guild.id)
                }
            } else if (
                !channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id).allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
                !channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id).deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES)
            ) {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
                    SEND_MESSAGES: false,
                }, `Channel Lock | Moderator: ${interaction.user.tag}`).catch(() => {})
                neutralOverwrites.push(interaction.guild.id)
            } else if (!channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id).deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES)) {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
                    SEND_MESSAGES: false,
                }, `Channel Lock | Moderator: ${interaction.user.tag}`).catch(e => false)
                enabledOverwrites.push(interaction.guild.id)
            }

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
