const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const ms = require('ms');

module.exports = {
    name: 'shortcuts',
    description: 'Add custom punishment shortcut commands in which have can have a default reason and duration',
    usage: 'shortcuts create [shortcut name]\nshortcuts remove [shortcut name]',
    permissions: 'MANAGE_GUILD',
    aliases: ['shortcut', 'short'],
    async execute(client, message, args) {
        if(!args[0]) return message.reply(client.config.errorMessages.missing_argument_option);
        const option = args[0];

        const guildSettings = await settingsSchema.findOne({
            guildID: message.guild.id
        })
        const { shortcutCommands } = guildSettings

        if (!(option === 'view' || option === 'create' || option === 'remove' || option === 'removeall')) return message.reply(client.config.errorMessages.invalid_option);
        const shortcutName = args[1];
        if(!shortcutName && option !== 'removeall') return message.reply('A shortcut name is requied');
        if(client.commands.has(shortcutName) || client.aliases.has(shortcutName)) return message.reply('Illegal shortcut name')

        if(option === 'create') {

            if (shortcutCommands.some(command => command.name === shortcutName)) return message.reply('A shortcut with this name already exists!')

            const filter = m => m.author.id === message.author.id;
            const collector = new Discord.MessageCollector(message.channel, filter, { time: 1000000 })
            let page = 0;
            let reason;
            let duration;
            let type;

            message.reply('Please provide a punishment type | If at any time you wish to cancel, send `cancel`')
            collector.on('collect', async(message) => {

                if (message.content.toLowerCase() === 'cancel') {
                    collector.stop();
                    return message.reply('Cancelled')
                }

                if(page === 0) {
                    if(!(
                        message.content.toLowerCase() === 'warn' || 
                        message.content.toLowerCase() === 'kick' ||
                        message.content.toLowerCase() === 'mute' ||
                        message.content.toLowerCase() === 'ban' ||
                        message.content.toLowerCase() === 'tempmute' ||
                        message.content.toLowerCase() === 'tempban'
                    )) return message.reply('An invalid punishment name was provided, please try again. Send `cancel` to cancel')
                    type = message.content.toLowerCase();
                    ++page;
                    message.reply('Please provide a punishment reason. Send `skip` to make the reason "Unspecified", send `cancel` to cancel')
                } else if(page === 1) {
                    reason = message.content.toLowerCase() !== 'skip' ? message.content : 'Unspecified';
                    ++page;
                    if(type === 'tempban' || type === 'tempmute' || type === 'warn') {
                        if(type === 'warn') message.reply('Would you like to provide a duration? If not, send `permanent`, else wise provide a duration')
                        else message.reply('Please provide a duration')
                    } else {
                        await settingsSchema.updateOne({
                            guildID: message.guild.id
                        },
                        {
                            $push: {
                                shortcutCommands: {
                                    name: shortcutName,
                                    type: type,
                                    reason: reason,
                                    duration: 'Permanent'
                                }
                            }
                        })
                        message.reply(`Successfully created shortcut \`${shortcutName}\``)
                        collector.stop();
                        return;
                    }
                } else if(page === 2) {
                    if(message.content.toLowerCase() === 'permanent') {
                        await settingsSchema.updateOne({
                            guildID: message.guild.id
                        },
                            {
                                $push: {
                                    shortcutCommands: {
                                        name: shortcutName,
                                        type: type,
                                        reason: reason,
                                        duration: null
                                    }
                                }
                            })
                    } else {
                        if (!ms(message.content)) message.reply(client.config.errorMessages.bad_duration);
                        else if (ms(message.content) > 315576000000) return message.reply(client.config.errorMessages.time_too_long);
                        else {
                            duration = ms(message.content);
                            await settingsSchema.updateOne({
                                guildID: message.guild.id
                            },
                                {
                                    $push: {
                                        shortcutCommands: {
                                            name: shortcutName,
                                            type: type,
                                            reason: reason,
                                            duration: duration
                                        }
                                    }
                                })
                        }
                    }

                    message.reply(`Successfully created shortcut \`${shortcutName}\``)
                    collector.stop();
                    return;
                }
            })
        } else if(option === 'remove') {

            if (!shortcutCommands.some(command => command.name === shortcutName)) return message.reply('Could not find a shortcut with this name');

            await settingsSchema.updateOne({
                guildID: message.guild.id
            },
            {
                $pull: {
                    shortcutCommands: {
                        name: shortcutName
                    }
                }
            })

            return message.reply(`Successfully removed shortcut \`${shortcutName}\'`)

        } else if(option === 'removeall') {
            if (!shortcutCommands.length) return message.reply('There are no shortcuts');

            await settingsSchema.updateOne({
                guildID: message.guild.id
            },
                {
                    shortcutCommands: []
                })

            return message.reply(`Successfully removed all shortcuts`)
        }
    }
}