const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const settingsSchema = require('../../schemas/settings-schema');
const lockSchema = require('../../schemas/lock-schema');

module.exports = {
    name: 'unlockserver',
    description: 'Unlock all locked channels',
    data: new SlashCommandBuilder().setName('unlockserver').setDescription('Unlock all locked channels'),
    permissions: Discord.Permissions.FLAGS.ADMINISTRATOR,
    requiredBotPermission: Discord.Permissions.FLAGS.ADMINISTRATOR,
    async execute(client, interaction, args) {

        if(global.lockdownCooldown.has(interaction.guild.id)) return client.util.throwError(interaction, 'this server is currently under a lock or unlock process, please wait for it to complete before running this command')

        const guildLocked = await lockSchema.findOne({ guildID: interaction.guild.id });
        const channels = guildLocked.channels.map(locked => interaction.guild.channels.cache.get(locked.ID) || locked.ID);
        if(!channels.length) return client.util.throwError(interaction, 'there are no locked channels')
        const done = async() => new Promise((resolve) => setTimeout(resolve, 1000));

        let lockedChannelsCount = 0;
        let displayChannelsToLock = channels.length;

        global.lockdownCooldown.add(interaction.guild.id);

        await interaction.deferReply();
        await interaction.editReply(`Unlocking the server...\n\n**${lockedChannelsCount}/${displayChannelsToLock}** channels completed - ${Math.round(((lockedChannelsCount / displayChannelsToLock) || 0) * 100)}%\n\nExpected time left: \`${client.util.duration((displayChannelsToLock - lockedChannelsCount) * 1000)}\``);

        await done();

        for(let i = 0; i !== channels.length; ++i) {
            const channel = channels[i];

            if(!client.guilds.cache.get(interaction.guild.id).me.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
                interaction.editReply('The unlocking process has been automatically halted! I require Administrator to ensure I can update channel overrides. Please give me the administrator permission and run the command again').catch(() => 
                    interaction.channel.send('The unlocking process has been automatically halted! I require Administrator to ensure I can update channel overrides. Please give me the administrator permission and run the command again').catch(() => {})
                );
                global.lockdownCooldown.delete(interaction.guild.id)
                return;
            }

            const getLockSchema = await lockSchema.findOne({
            guildID: interaction.guild.id,
                channels: {
                    $elemMatch: { ID: channel.id }
                }
            })

            if(channel.type === 'number' || !getLockSchema) {
                --displayChannelsToLock
                await lockSchema.updateOne({
                    guildID: interaction.guild.id
                },
                {
                    $pull: {
                        channels: {
                            ID: channel
                        }
                    }
                })
            } else {
                const enabledOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).enabledOverwrites;
                const neutralOverwrites = getLockSchema.channels.find(key => key.ID === channel.id).neutralOverwrites;

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
                        deny: initialPermissionOverwrite.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) ? 
                            initialPermissionOverwrite.deny - Discord.Permissions.FLAGS.SEND_MESSAGES :
                            Discord.Permissions.FLAGS.SEND_MESSAGES,
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
                        deny: initialPermissionOverwrite.deny.has(Discord.Permissions.FLAGS.SEND_MESSAGES) ? 
                            initialPermissionOverwrite.deny - Discord.Permissions.FLAGS.SEND_MESSAGES :
                            Discord.Permissions.FLAGS.SEND_MESSAGES,
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

                ++lockedChannelsCount;
                await interaction.editReply(`Unlocking the server...\n\n**${lockedChannelsCount}/${displayChannelsToLock}** channels completed - ${Math.round(((lockedChannelsCount / displayChannelsToLock) || 0) * 100)}%\n\nExpected time left: \`${client.util.duration((displayChannelsToLock - lockedChannelsCount) * 1000)}\``).catch(() => {})

                await done();
            }
        }

        global.lockdownCooldown.delete(interaction.guild.id);
        return interaction.editReply(`Successfully unlocked **${displayChannelsToLock}** channels`).catch(() => { interaction.channel.send(`Successfully locked **${displayChannelsToLock}** channels`).catch(() => {}) })
    }
}