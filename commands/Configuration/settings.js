const Discord = require('discord.js')

module.exports = {
    name: 'settings',
    description: 'Allows you to change server settings',
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    usage: 'settings <option>',
    async execute(client, message, args) {
        const setting = args[0];
        if (!setting) {
            const settingsPannel = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setDescription('These are the settings you can manage on the server. Run `settings (setting)` to get more information on a setting | There are more configuration commands that you can find from the `help` menu')
                .setAuthor(`Server Settings - ${message.guild.name}`, client.user.displayAvatarURL())
                .addField('Prefix', 'prefix', true)
                .addField('Allow Commands', 'allowcmds', true)
                .addField('Additional Ban Information', 'additional-baninfo', true)
                .addField('Delete Moderation Commands', 'del-mod-cmd-triggers', true)
                .addField('Automod Warning Expiration', 'automod-warning-expiration', true)
                .addField('Manual Warning Expiration', 'manual-warning-expiration', true)
                .addField('Message Log Channel', 'message-log-channel', true)
                .addField('Moderation Logging Channel', 'moderation-log-channel', true)
                .addField('Auto-Moderation Log Channel', 'automod-log-channel', true)
                .addField('Moderation Roles', 'modroles', true)
                .addField('Allow Tenor Links', 'allowtenor', true)
                .addField('Mute Role', 'muterole', true)
                .addField('Remove Roles On Mute', 'remove-roles-on-mute', true)
            return message.reply({ embeds: [settingsPannel] });
        }

        switch (setting) {
            case 'allowcmds':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Allow Commands',
                    'allowcmds <enable, enablecategory, disable, disablecategory, enableall, viewdisabled> [channel, category name]',
                    'Enable or disable commands in the specified channel. Moderation commands will still work in disabled channels')]})
                require('../../settings/allowcmds').run(client, message, args)
                break;
            case 'additional-baninfo':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Ban Information',
                    'additional-baninfo <message, current: gets the current ban info message>',
                    'Adds an additional embed field to the DM sent to a user when banned of whatever you like. Input `none` to disable the module\nTip: you can make a hyperlink by formatting your text as the following: `[text](link)`')]})
                require('../../settings/baninfo').run(client, message, args)
                break;
            case 'del-mod-cmd-triggers':
                if (!args[1]) if (!args[1]) return message.reply({ embeds: [settingsHelp('Delete Moderation Command Triggers',
                    'del-mod-cmd-triggers <enable, disable, current>',
                    'Deletes the trigger of all moderation commands that punish a user')]})
                require('../../settings/delmodcmds').run(client, message, args)
                break;
            case 'automod-warning-expiration':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Automod Warning Expiration',
                    'automod-warning-expiration <duration, current>',
                    'Sets an expiration date for all automod warnings')]})
                require('../../settings/autowarnexpire').run(client, message, args)
                break;
            case 'manual-warning-expiration':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Manual Warning Expiration',
                    'manual-warning-expiration <duration, current>',
                    'Sets a default expiration date for manual warnings')]})
                require('../../settings/manualwarnexpire').run(client, message, args);
                break;
            case 'prefix':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Prefix',
                    'prefix <prefix>',
                    'Changes the prefix for the server')]})
                require('../../settings/prefix').run(client, message, args)
                break;
            case 'message-log-channel':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Message Log Channel',
                    'message-log-channel <channel, none, current>',
                    'Sets the channel for which message updates will be logged')]})
                require('../../settings/msglogchannel').run(client, message, args)
                break;
            case 'moderation-log-channel':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Moderation Log Channel',
                    'moderation-log-channel <channel, none, current>',
                    'Sets the channel for which moderator actions with Parallel will be logged')]})
                require('../../settings/modlogchannel').run(client, message, args)
                break;
            case 'automod-log-channel':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Auto-Moderation Log Channel',
                    'automod-log-channel <channel, none, current>',
                    'Sets the channel for which automod instances will be logged')]});
                require('../../settings/automodlog').run(client, message, args)
                break;
            case 'modroles':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Mod Roles',
                    'modroles <option: add, remove, removeall, view> [role]',
                    'Gives users with a moderator role the permission to run moderation commands')]})
                require('../../settings/modroles').run(client, message, args)
                break;
            case 'allowtenor':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Allow Tenor Links',
                'allowtenor <option: enable, disable, current> <only for users with attachment perms boolean: true, false>',
                'If the link automod is enabled, it will allow tenor links to go by')]})
                require('../../settings/allowtenor').run(client, message, args);
                break;
            case 'muterole':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Mute Role',
                'muterole <mute role, current>',
                'Sets the role the bot mutes user\'s with')] })
                require('../../settings/muterole').run(client, message, args)
                break;
            case 'remove-roles-on-mute':
                if (!args[1]) return message.reply({ embeds: [settingsHelp('Remove Roles On Mute',
                'remove-roles-on-mute <enable, disable, current>',
                'An option whether to remove all roles from a user when they are muted and add the muted role, or just add the muted role')]})
                require('../../settings/removerolesonmute').run(client, message, args);
                break;
            default:
                return await client.util.throwError(message, client.config.errors.invalid_option);
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