const Discord = require('discord.js')
const lockSchema = require('../../schemas/lock-schema');
const settingsSchema = require('../../schemas/settings-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'lock',
    description: 'Denies the permission for members to speak in the specified channel',
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    userPermissions: [
        {
            id: '633776442366361601',
            type: 'USER',
            permission: true
        },
        {
            id: '483375587176480768',
            type: 'USER',
            permission: true
        }
    ],
    data: new SlashCommandBuilder().setName('lock').setDescription('Denies the permission for members to speak in the specified channel')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to lock'))
    .addStringOption(option => option.setName('reason').setDescription('The shown reason for locking the channel')),
    async execute(client, interaction, args) {

        const channel = client.util.getChannel(interaction.guild, args['channel']) || interaction.channel
        const reason = args['reason'] || 'Unspecified';

        const guildSettings = await settingsSchema.findOne({ guildID: interaction.guild.id })
        const { modRoles } = guildSettings;

        if (channel.type !== 'GUILD_TEXT') return client.util.throwError(interaction, client.config.errors.not_type_text_channel);
        if (!channel.permissionsFor(interaction.guild.me).has([Discord.Permissions.FLAGS.MANAGE_CHANNELS, Discord.Permissions.FLAGS.SEND_MESSAGES])) return client.util.throwError(interaction, client.config.errors.my_channel_access_denied);
        if(!channel.permissionsFor(interaction.member).has([Discord.Permissions.FLAGS.MANAGE_CHANNELS, Discord.Permissions.FLAGS.SEND_MESSAGES]) && !interaction.member.roles.cache.some(role => modRoles.includes(role.id))) return client.util.throwError(interaction, client.config.errors.your_channel_access_denied);
        if(!interaction.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR) && !interaction.member.roles.cache.some(role => channel.permissionOverwrites.cache.some(overwrite => overwrite.id === role.id && overwrite.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES)))) {
            return interaction.reply('Error: the action was refused because after the channel had been locked, you would have not had permission to send messages in the channel. Please have an administrator add a permission override in the channel for one of the moderation roles you have and set the Send Messages permission to true')
        }

        const alreadyLocked = await lockSchema.findOne({
            guildID: interaction.guild.id,
            channels: {
                $elemMatch: { ID: channel.id }
            }
        })

        if (alreadyLocked) return interaction.reply('This channel is already locked! (If you manually unlocked, just run the unlock command to register this channel as unlocked)');

        await interaction.deferReply({ ephemeral: interaction.channel === channel });

        const permissionOverwrites = channel.permissionOverwrites.cache;

        // The permissions that the channel will be set to in the end;
        let newPermissionOverwrites = permissionOverwrites;

        const enabledOverwrites = [...permissionOverwrites.values()].filter(overwrite => 
            overwrite.type === 'role' &&
            !channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            !overwrite.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
            !modRoles.includes(overwrite.id) &&
            overwrite.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES)
        );

        let neutralOverwrites = [...permissionOverwrites.values()].filter(overwrite => 
            overwrite.type === 'role' &&
            !channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
            !overwrite.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) &&
            !modRoles.includes(overwrite.id) &&
            !overwrite.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) && !overwrite.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES)
        );

        const allOverwrites = neutralOverwrites.concat(enabledOverwrites);

        // It is not unexpected that this returns undefined!
        const everyoneRoleOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);

        if(!allOverwrites.length && everyoneRoleOverwrite) return client.util.throwError(interaction, 'this channel will end up with the same after the lock! No non-moderator can currently send messages in this channel')

        /* Momentarily removing the permission overwrites we are affecting. We also remove the everyone role overwrite
        because there are instances where the everyone role overwrite isn't even a marked overwrite until a permission has been udpated;
        So the everyone role override will be added at the end
        */

        newPermissionOverwrites = permissionOverwrites.filter(overwrite => 
            !enabledOverwrites.some(enabledOverwrite => enabledOverwrite.id === overwrite.id) && 
            !neutralOverwrites.some(neutralOverwrite => neutralOverwrite.id === overwrite.id) &&
            overwrite.id !== interaction.guild.roles.everyone.id
        );

        if(!everyoneRoleOverwrite) {
            newPermissionOverwrites.set(interaction.guild.roles.everyone.id, {
                id: interaction.guild.roles.everyone.id,
                type: 'role',
                deny: Discord.Permissions.FLAGS.SEND_MESSAGES,
                allow: 0n
            })

            neutralOverwrites.push(everyoneRoleOverwrite.id);
        }

        for (let i = 0; i !== allOverwrites.length; ++i) {
            const overwrite = allOverwrites[i];
            const initialPermissionOverwrite = channel.permissionOverwrites.cache.get(overwrite.id);
            const newPermissionOverwrite = {
                id: initialPermissionOverwrite.id,
                type: initialPermissionOverwrite.type,
                deny: initialPermissionOverwrite.deny + Discord.Permissions.FLAGS.SEND_MESSAGES,
                allow: initialPermissionOverwrite.allow.has(Discord.Permissions.FLAGS.SEND_MESSAGES) ?
                    initialPermissionOverwrite.allow - Discord.Permissions.FLAGS.SEND_MESSAGES : 
                    initialPermissionOverwrite.allow
            };

            newPermissionOverwrites.set(newPermissionOverwrite.id, newPermissionOverwrite);

        }

        await channel.permissionOverwrites.set(newPermissionOverwrites, `Command /lock ran by ${interaction.author.tag} (${interaction.author.id})`);
        
        await lockSchema.updateOne({
            guildID: interaction.guild.id
        },
        {
            $push: {
                channels: {
                    ID: channel.id,
                    enabledOverwrites: enabledOverwrites,
                    neutralOverwrites: neutralOverwrites
                }
            }
        })

        await interaction.editReply({ content: `Successfully locked ${channel}`});

        const lockedEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor('Channel Lock', client.user.displayAvatarURL())
        .setTitle('This channel has been locked')
        .setDescription('A channel lock serves the purpose of denying the permission for users to speak in the channel')
        if (args['reason']) lockedEmbed.addField('Reason', reason.length >= 1024 ? await client.util.createBin(reason) : reason)
        await channel.send({ embeds: [lockedEmbed] });

    }
}