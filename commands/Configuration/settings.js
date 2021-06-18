const Discord = require('discord.js')

module.exports = {
    name: 'settings',
    description: 'Allows you to change server settings',
    permissions: 'MANAGE_GUILD',
    moderationCommand: true,
    usage: 'settings <option>',
    async execute(client, message, args) {
        const setting = args[0];
        if(!setting) {
            const settingsPannel = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription('These are the settings you can manage on the server. Run `settings (setting)` to get more information on a setting | There are more configuration commands that you can find from the `help` menu')
            .setAuthor(`Server Settings - ${message.guild.name}`, client.user.displayAvatarURL())
            .addField('Prefix', '__prefix__\n\nChanges the required prefix to trigger commands')
            .addField('Allow Commands', '__allowcmds__\n\nEnable or disable commands in certain channels')
            .addField('Ban Information', '__baninfo__\n\nAdd a field to the DM sent to a banned user of whatever you like')
            .addField('Delete Moderation Commands', '__del-mod-cmd-triggers__\n\nDeletes all triggers moderation commands that punishes a user')
            .addField('Remove Roles on Mute', '__remove-roles-on-mute__\n\nRemoves all roles from the muted user, and adds them back when unmuted')
            .addField('Automod Warning Expiration', '__automod-warning-expiration__\n\nSet an expiration date for all automod warnings')
            .addField('Manual Warning Expiration', '__manual-warning-expiration__\n\nSets a default warning expiration date for manual warnings if no duration is specified')
            .addField('Message Log Channel', '__message-log-channel__\n\nSets the channel in which message updates will be logged')
            .addField('Moderation Logging Channel', '__moderation-log-channel__\n\nSets the channel in which moderator actions with Razor will be logged')
            .addField('Moderation Role', '__modrole__', 'Gives users with the moderator permissions to run moderation commands')
            return message.channel.send(settingsPannel);
        }

        switch (setting) {
            case 'allowcmds':
                if (!args[1]) return message.channel.send(settingsHelp('Allow Commands', 
                'allowcmds <enable, enablecategory, disable, disablecategory, enableall, viewdisabled> [channel, category name]',
                'Enable or disable commands in the specified channel. Moderation commands will still work in disabled channels'))
                var file = require('../../settings/allowcmds')
                file.run(client, message, args)
                break;
            case 'baninfo':
                if (!args[1]) return message.channel.send(settingsHelp('Ban Info', 
                'baninfo <message, current: gets the current ban info message>',
                'Adds an additional embed to the DM sent to a user when banned of whatever you like. Input `none` to disable the module\nTip: you can make a hyperlink by formatting your text as the following: `[text](link)`'))
                var file = require('../../settings/baninfo')
                file.run(client, message, args)
                break;
            case 'del-mod-cmd-triggers':
                if (!args[1]) if (!args[1]) return message.channel.send(settingsHelp('Delete Moderation Command Triggers', 
                'del-mod-cmd-triggers <enable, disable>',
                'Deletes the trigger of all moderation commands that punish a user'))
                var file = require('../../settings/delmodcmds')
                file.run(client, message, args)
                break;
            case 'remove-roles-on-mute':
                if (!args[1]) return message.channel.send(settingsHelp('Remove Roles on Mute', 
                'remove-roles-on-mute <enable, disable>',
                'Removes all roles from a member when muted, and adds them back when unmuted'))
                var file = require('../../settings/rmrolesonmute');
                file.run(client, message, args)
                break;
            case 'automod-warning-expiration':
                if (!args[1]) return message.channel.send(settingsHelp('Automod Warning Expiration', 
                'automod-warning-expiration <duration>',
                'Sets an expiration date for all automod warnings'))
                var file = require('../../settings/autowarnexpire');
                file.run(client, message, args)
                break;
            case 'manual-warning-expiration':
                if(!args[1]) return message.channel.send(settingsHelp('Manual Warning Expiration', 
                'manual-warning-expiration <duration>',
                'Sets a default expiration date for manual warnings'))
                var file = require('../../settings/manualwarnexpire')
                file.run(client, message, args);
                break;
            case 'prefix':
                if(!args[1]) return message.channel.send(settingsHelp('Prefix',
                'prefix <prefix>',
                'Changes the prefix for the server'))
                var file = require('../../settings/prefix')
                file.run(client, message, args)
                break;
            case 'message-log-channel':
                if(!args[1]) return message.channel.send(settingsHelp('Message Log Channel',
                'message-log-channel <channel | none>',
                'Sets the channel for which message updates will be logged'))
                var file = require('../../settings/msglogchannel')
                file.run(client, message, args)
                break;
            case 'moderation-log-channel':
                if(!args[1]) return message.channel.send(settingsHelp('Moderation Log Channel',
                'moderation-log-channel <channel | none>',
                'Sets the channel for which moderator actions with Razor will be logged'));
                var file = require('../../settings/modlogchannel');
                file.run(client, message, args)
                break;
            case 'modrole':
                if(!args[1]) return message.channel.send(settingsHelp('Mod Role',
                'modrole <option: add, remove, removeall, view> [role]',
                'Gives users with the moderator permissions to run moderation commands'))
                var file = require('../../settings/modrole');
                file.run(client, message, args)
                break;
            default:
                return message.channel.send('Invalid option | Run `settings` to get the list of settings')
        }

    }
}

function settingsHelp(title, usage, description) {
    let embed = new Discord.MessageEmbed()
    .setColor('#09ff2')
    .addField('Description', description)
    .addField('Usage', `settings ${usage}`)
    .setTitle(`Settings - ${title}`)

    return embed;
}

