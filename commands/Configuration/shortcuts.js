const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');
const ms = require('ms');

module.exports = {
    name: 'shortcuts',
    description: 'Add custom punishment shortcut commands in which have can have a default reason and duration',
    usage: 'sshortcuts create [shortcut name]\nshortcuts remove [shortcut name]',
    permissions: 'MANAGE_GUILD',
    aliases: ['shortcut', 'short'],
    async execute(client, message, args) {
        const option = args[0];

        const guildSettings = await settingsSchema.findOne({
            guildID: message.guild.id
        })
        const { shortcutCommands } = guildSettings

        if(!(option === 'view' || option === 'create' || option === 'remove')) return message.channel.send(client.config.errorMessages.invalid_option);
        const shortcutName = args[1];
        if(!shortcutName) return message.channel.send('A shortcut name is requied');
        if(client.commands.has(shortcutName)) return message.channel.send('Illegal shortcut name')
        if(!shortcutName) return message.channel.send(client.config.errorMessages.missing_argument_text);

        if(option === 'create') {

            if (shortcutCommands.some(command => command.name === shortcutName)) return message.channel.send('A shortcut with this name already exists!')

            const filter = m => m.author.id === message.author.id;
            const collector = new Discord.MessageCollector(message.channel, filter, { time: 1000000 })
            let page = 0;
            let type;
            let reason;
            let duration;

            message.channel.send('Please provide a reason | If at any time you wish to cancel, send `cancel`')
            collector.on('collect', async(message) => {

                if (message.content.toLowerCase() === 'cancel') {
                    collector.stop();
                    return message.channel.send('Cancelled')
                }

                if(page === 0) {
                    if(!(
                        message.content.toLowerCase() === 'warn' || 
                        message.content.toLowerCase() === 'kick' ||
                        message.content.toLowerCase() === 'mute' ||
                        message.content.toLowerCase() === 'tempmute' ||
                        message.content.toLowerCase() === 'tempban'
                    )) return message.channel.send('An invalid punishment name was provided, please try again. Send `cancel` to cancel')
                    type = message.content.toLowerCase();
                    ++page;
                    message.channel.send('Please provide a punishment reason. Send `skip` to make the reason "Unspecified", send `cancel` to cancel')
                } else if(page === 1) {
                    if(message.content.toLowerCase() === 'skip') reason = 'Unspecified';
                    ++page;
                    if(type === 'tempban' || type === 'tempmute') {
                        message.channel.send('Please provide a duration')
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
                        message.channel.send(`Successfully created shortcut \`${shortcutName}\``)
                        collector.stop();
                        return;
                    }
                } else if(page === 2) {
                    if(!ms(message.content)) message.channel.send(client.config.errorMessages.bad_duration);
                    else if (ms(message.content) > 315576000000) return message.channel.send(client.config.errorMessages.time_too_long);
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
                        message.channel.send(`Successfully created shortcut \`${shortcutName}\``)
                        collector.stop();
                        return;
                    }
                }
            })
        } else if(option === 'remove') {

            if (!shortcutCommands.some(command => command.name === shortcutName)) return message.channel.send('Could not find a shortcut with this name');

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

            return message.channel.send('Successfully removed shortcut \`${shortcutName}\'')

        }
    }
}