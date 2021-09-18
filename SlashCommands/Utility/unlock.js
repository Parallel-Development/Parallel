const Discord = require('discord.js')
const lockSchema = require('../../schemas/lock-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'unlock',
    description: 'Grants the permission for members to speak in the specified channel',
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    permissions: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    data: new SlashCommandBuilder().setName('unlock').setDescription('Grants the permission for members to speak in the specified channel')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to unlock'))
    .addStringOption(option => option.setName('reason').setDescription('The shown reason for unlocking the channel')),
    async execute(client, interaction, args) {

        const sleep = async (ms) => {
            return new Promise(resolve => {
                setTimeout(resolve, ms)
            })
        }

        let channel = client.util.getChannel(interaction.guild, args['channel'])

        let reason = args['reason'] || 'Unspecified';

        if (!channel) channel = interaction.channel;

        if (!channel.isText()) return client.util.throwError(interaction, client.config.errors.not_type_text_channel);
        if (!channel.permissionsFor(interaction.guild.me).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) return client.util.throwError(interaction, client.config.errors.my_channel_access_denied);

        const getLockSchema = await lockSchema.findOne({
            guildID: interaction.guild.id,
            channels: {
                $elemMatch: { ID: channel.id }
            }
        })

        if (!getLockSchema) return interaction.reply('This channel is already unlocked! (If you manually locked, just run the lock command to register this channel as locked)')

        const enabledOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).enabledOverwrites;
        const neutralOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).neutralOverwrites;

        await interaction.deferReply({ ephemeral: interaction.channel === channel });

        try {
            for (let i = 0; i !== enabledOverwrites.length; i++) {
                await channel.permissionOverwrites.edit(interaction.guild.roles.cache.get(enabledOverwrites[i]), {
                    SEND_MESSAGES: true
                }, `Channel Unlock | Moderator: ${interaction.user.tag}`).catch(e => false)

                await sleep(200)
            }

            for (let i = 0; i < neutralOverwrites.length; i++) {
                await channel.permissionOverwrites.edit(interaction.guild.roles.cache.get(neutralOverwrites[i]), {
                    SEND_MESSAGES: null
                }, `Channel Unlock | Moderator: ${interaction.user.tag}`).catch(e => false)

                await sleep(200)
            }

            await lockSchema.updateOne({
                guildID: interaction.guild.id,
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
            await channel.send({ embeds: [unlocked] });
            await interaction.editReply(`Successfully unlocked ${channel}`)
        }

    }
}