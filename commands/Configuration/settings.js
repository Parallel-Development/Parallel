const Discord = require('discord.js')

module.exports = {
    name: 'settings',
    description: 'Allows you to change server settings',
    permissions: 'MANAGE_GUILD',
    moderationCommand: true,
    usage: 'settings <option>',
    async execute(client, message, args) {
        const setting = args[0];
        if (!setting) {
            const settingsPannel = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setDescription('These are the settings you can manage on the server. Run `settings (setting)` to get more information on a setting | There are more configuration commands that you can find from the `help` menu')
                .setAuthor(`Server Settings - ${message.guild.name}`, client.user.displayAvatarURL())
                .addField('Prefix', '__prefix__', true)
                .addField('Allow Commands', '__allowcmds__', true)
                .addField('Ban Information', '__baninfo__', true)
                .addField('Delete Moderation Commands', '__del-mod-cmd-triggers__', true)
                .addField('Remove Roles on Mute', '__remove-roles-on-mute__', true)
                .addField('Automod Warning Expiration', '__automod-warning-expiration__', true)
                .addField('Manual Warning Expiration', '__manual-warning-expiration__', true)
                .addField('Message Log Channel', '__message-log-channel__', true)
                .addField('Moderation Logging Channel', '__moderation-log-channel__', true)
                .addField('Auto-Moderation Log Channel', '__automod-log-channel__', true)
                .addField('Moderation Roles', '__modroles__', 'Gives users with a moderatoe role the permission to run moderation commands', true)
            return message.channel.send(settingsPannel);
        }

        switch (setting) {
            case 'allowcmds':
                if (!args[1]) return message.channel.send(settingsHelp('Allow Commands',
                    'allowcmds <enable, enablecategory, disable, disablecategory, enableall, viewdisabled> [channel, category name]',
                    'Enable or disable commands in the specified channel. Moderation commands will still work in disabled channels'))
                require('../../settings/allowcmds').run(client, message, args)
                break;
            case 'baninfo':
                if (!args[1]) return message.channel.send(settingsHelp('Ban Information',
                    'baninfo <message, current: gets the current ban info message>',
                    'Adds an additional embed field to the DM sent to a user when banned of whatever you like. Input `none` to disable the module\nTip: you can make a hyperlink by formatting your text as the following: `[text](link)`'))
                require('../../settings/baninfo').run(client, message, args)
                break;
            case 'del-mod-cmd-triggers':
                if (!args[1]) if (!args[1]) return message.channel.send(settingsHelp('Delete Moderation Command Triggers',
                    'del-mod-cmd-triggers <enable, disable>',
                    'Deletes the trigger of all moderation commands that punish a user'))
                require('../../settings/delmodcmds').run(client, message, args)
                break;
            case 'remove-roles-on-mute':
                if (!args[1]) return message.channel.send(settingsHelp('Remove Roles on Mute',
                    'remove-roles-on-mute <enable, disable>',
                    'Removes all roles from a member when muted, and adds them back when unmuted'))
                require('../../settings/rmrolesonmute').run(client, message, args)
                break;
            case 'automod-warning-expiration':
                if (!args[1]) return message.channel.send(settingsHelp('Automod Warning Expiration',
                    'automod-warning-expiration <duration>',
                    'Sets an expiration date for all automod warnings'))
                require('../../settings/autowarnexpire').run(client, message, args)
                break;
            case 'manual-warning-expiration':
                if (!args[1]) return message.channel.send(settingsHelp('Manual Warning Expiration',
                    'manual-warning-expiration <duration>',
                    'Sets a default expiration date for manual warnings'))
                require('../../settings/manualwarnexpire').run(client, message, args);
                break;
            case 'prefix':
                if (!args[1]) return message.channel.send(settingsHelp('Prefix',
                    'prefix <prefix>',
                    'Changes the prefix for the server'))
                require('../../settings/prefix').run(client, message, args)
                break;
            case 'message-log-channel':
                if (!args[1]) return message.channel.send(settingsHelp('Message Log Channel',
                    'message-log-channel <channel | none>',
                    'Sets the channel for which message updates will be logged'))
                require('../../settings/msglogchannel').run(client, message, args)
                break;
            case 'moderation-log-channel':
                if (!args[1]) return message.channel.send(settingsHelp('Moderation Log Channel',
                    'moderation-log-channel <channel | none>',
                    'Sets the channel for which moderator actions with Parallel will be logged'));
                require('../../settings/modlogchannel').run(client, message, args)
                break;
            case 'automod-log-channel':
                if (!args[1]) return message.channel.send(settingsHelp('Auto-Moderation Log Channel',
                    'automod-log-channel <channel | none>',
                    'Sets the channel for which automod instances will be logged'))
                require('../../settings/automodlog').run(client, message, args)
                break;
            case 'modroles':
                if (!args[1]) return message.channel.send(settingsHelp('Mod Roles',
                    'modroles <option: add, remove, removeall, view> [role]',
                    'Gives users with a moderator role the permission to run moderation commands'))
                require('../../settings/modroles').run(client, message, args)
                break;
            case 'allowtenor':
                if(!args[1]) return message.channel.send(settingsHelp('Allow Tenor Links',
                'allowtenor <option: enable, disable> <only for users with attachment perms boolean: true, false>',
                'If the link automod is enabled, it will allow tenor links to go by'))
                require('../../settings/allowtenor').run(client, message, args);
                break
            default:
                return message.channel.send(client.config.errorMessages.invalid_option);
        }

    }
}

function settingsHelp(title, usage, description) {
    const embed = new Discord.MessageEmbed()
    .setColor('#09ff2')
    .addField('Description', description)
    .addField('Usage', `settings ${usage}`)
    .setTitle(`Settings - ${title}`)

    return embed;
}