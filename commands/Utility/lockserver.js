const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const lockSchema = require('../../schemas/lock-schema');

module.exports = {
    name: 'lockserver',
    description: 'Lock all server channels. The bot will ignore channels in which non-moderators cannot talk in or view',
    usage: 'lockserver\nlockserver --include-staff-channels',
    permissions: Discord.Permissions.FLAGS.ADMINISTRATOR,
    requiredBotPermission: Discord.Permissions.FLAGS.ADMINISTRATOR,
    developing: true,
    async execute(client, message, args) {

        if(global.lockdownCooldown.has(message.guild.id)) return client.util.throwError(message, 'this server is currently under a lock or unlock process, please wait for it to complete before running this command')

        const includeStaffChannels = args[0] === '--include-staff-channels';

        const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
        const { modRoles } = guildSettings;
        const guildLocked = await lockSchema.findOne({ guildID: message.guild.id });
        const allChannels = message.guild.channels.cache.filter(channel => channel.type === 'GUILD_TEXT');

        let channels;

        // We check if the channel is not locked now, however we also check in the loop in case a channel is locked while channels are being locked

        if(includeStaffChannels) channels = [...allChannels.values()].filter(channel => 
            channel.permissionOverwrites.cache.filter(overwrite => overwrite.type === 'role').some(overwrite => 
                channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.SEND_MESSAGES) && 
                channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.VIEW_CHANNEL)
            )
        );
        else channels = [...allChannels.values()].filter(channel => 
            channel.permissionOverwrites.cache.filter(overwrite => overwrite.type === 'role').some(overwrite => 
                !message.guild.roles.cache.get(overwrite.id).permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) &&
                !modRoles.includes(overwrite.id) && 
                channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.SEND_MESSAGES) && 
                channel.permissionsFor(overwrite.id).has(Discord.Permissions.FLAGS.VIEW_CHANNEL)
            )
        );

        const guildLockedChannelIds = guildLocked.channels.map(info => info.ID);
        if(channels.every(channel => guildLockedChannelIds.includes(channel.id))) return client.util.throwError(message, 'all the target channels are already locked, there are none to lock!');
        if(!channels.length) return client.util.throwError(message, 'none of the target channels will change after locked');

        const done = async() => new Promise((resolve) => setTimeout(resolve, 1000));

        let lockedChannelsCount = 0;
        let displayChannelsToLock = channels.length;

        global.lockdownCooldown.add(message.guild.id);

        const msg = await message.channel.send(`Locking the server...\n\n**${lockedChannelsCount}/${displayChannelsToLock}** channels completed - ${Math.round(((lockedChannelsCount / displayChannelsToLock) || 0) * 100)}%\n\nExpected time left: \`${client.util.duration((displayChannelsToLock - lockedChannelsCount) * 1000)}\``);

        await done();

        for (let i = 0; i !== channels.length; ++i) {
            const channel = channels[i];
            const checkIfLocked = await lockSchema.findOne({ guildID: message.guild.id, channels: { $elemMatch: { ID: channel.id}} });
            const me = client.guilds.cache.get(message.guild.id).me;

            if(!me.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
                msg.edit('The locking process has been automatically halted! I require Administrator to ensure I can update channel overrides. Please give me the administrator permission and run the command again').catch(() => 
                    message.channel.send('The locking process has been automatically halted! I require Administrator to ensure I can update channel overrides. Please give me the administrator permission and run the command again').catch(() => {})
                );
                global.lockdownCooldown.delete(message.guild.id)
                return;
            } 

            if(!checkIfLocked && client.guilds.cache.get(message.guild.id).channels.cache.get(channel.id)) {
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
                const everyoneRoleOverwrite = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
                
                if(!allOverwrites.length && everyoneRoleOverwrite); 
                    else {
                        newPermissionOverwrites = permissionOverwrites.filter(overwrite => 
                        !enabledOverwrites.some(enabledOverwrite => enabledOverwrite.id === overwrite.id) && 
                        !neutralOverwrites.some(neutralOverwrite => neutralOverwrite.id === overwrite.id) &&
                        overwrite.id !== message.guild.roles.everyone.id
                    );
                        
                    if(!everyoneRoleOverwrite) {
                        newPermissionOverwrites.set(message.guild.roles.everyone.id, {
                            id: message.guild.roles.everyone.id,
                            type: 'role',
                            deny: everyoneRoleOverwrite.deny + Discord.Permissions.FLAGS.SEND_MESSAGES,
                            allow: everyoneRoleOverwrite.allow
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
                
                    await channel.permissionOverwrites.set(newPermissionOverwrites);

                    await lockSchema.updateOne({
                        guildID: message.guild.id
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
                

                    ++lockedChannelsCount;
                    await msg.edit(`Locking the server...\n\n**${lockedChannelsCount}/${displayChannelsToLock}** channels completed - ${Math.round(((lockedChannelsCount / displayChannelsToLock) || 0) * 100)}%\n\nExpected time left: \`${client.util.duration((displayChannelsToLock - lockedChannelsCount) * 1000)}\``).catch(() => {})
                    await done();
                }
            } else --displayChannelsToLock;
        }

        global.lockdownCooldown.delete(message.guild.id)
        return msg.edit(`Successfully locked **${displayChannelsToLock}** channels`).catch(() => { message.channel.send(`Successfully locked **${displayChannelsToLock}** channels`).catch(() => {}) })

    }
}