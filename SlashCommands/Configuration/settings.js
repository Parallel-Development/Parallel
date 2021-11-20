const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'settings',
    description: 'Manage the server settings',
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Manage the server settings')
        .addStringOption(option => option.setName('arguments').setDescription('The setting arguments')),
    async execute(client, interaction, args) {
        args = args['arguments']?.split(' ');

        if (!args) {
            const settingsPannel = new Discord.MessageEmbed()
                .setColor(client.util.mainColor(interaction.guild))
                .setDescription(
                    'These are the settings you can manage on the server. Run `settings (setting)` to get more information on a setting | There are more configuration commands that you can find from the `help` menu'
                )
                .setAuthor(`Server Settings - ${interaction.guild.name}`, client.user.displayAvatarURL())
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
                .addField('Moderation Role Permissions', 'mod-role-permissions', true)
                .addField('Allow Tenor Links', 'allowtenor', true)
                .addField('Mute Role', 'muterole', true)
                .addField('Remove Roles On Mute', 'remove-roles-on-mute', true)
                .addField('AFK Role Whitelist', 'afk-role-whitelist', true)
                .addField('Errors', 'errors', true)
                .addField('Message Logging Ignored', 'message-logging-ignored', true);
            return interaction.reply({ embeds: [settingsPannel] });
        }

        client.cache.settings.delete(interaction.guild.id);

        switch (args[0]) {
            case 'allowcmds':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Allow Commands',
                                'allowcmds <enable, enablecategory, disable, disablecategory, enableall, viewdisabled> [channel, category name]',
                                'Enable or disable commands in the specified channel. Moderation commands will still work in disabled channels'
                            )
                        ]
                    });
                require('../../settings/allowcmds').run(client, interaction, args);
                break;
            case 'additional-baninfo':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Ban Information',
                                'additional-baninfo <message, current: gets the current ban info message, disable>',
                                'Adds an additional embed field to the DM sent to a user when banned of whatever you like. Input `none` to disable the module\nTip: you can make a hyperlink by formatting your text as the following: `[text](link)`'
                            )
                        ]
                    });
                require('../../settings/baninfo').run(client, interaction, args);
                break;
            case 'del-mod-cmd-triggers':
                if (!args[1])
                    if (!args[1])
                        return interaction.reply({
                            embeds: [
                                settingsHelp(
                                    'Delete Moderation Command Triggers',
                                    'del-mod-cmd-triggers <enable, disable, current>',
                                    'Deletes the trigger of all moderation commands that punish a user. If using an interaction, send the punished embed seperately and reply to the interaction privately'
                                )
                            ]
                        });
                require('../../settings/delmodcmds').run(client, interaction, args);
                break;
            case 'automod-warning-expiration':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Automod Warning Expiration',
                                'automod-warning-expiration <duration, current, disable>',
                                'Sets an expiration date for all automod warnings'
                            )
                        ]
                    });
                require('../../settings/autowarnexpire').run(client, interaction, args);
                break;
            case 'manual-warning-expiration':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Manual Warning Expiration',
                                'manual-warning-expiration <duration, current, disable>',
                                'Sets a default expiration date for manual warnings'
                            )
                        ]
                    });
                require('../../settings/manualwarnexpire').run(client, interaction, args);
                break;
            case 'prefix':
                if (!args[1])
                    return interaction.reply({
                        embeds: [settingsHelp('Prefix', 'prefix <prefix>', 'Changes the prefix for the server')]
                    });
                require('../../settings/prefix').run(client, interaction, args);
                break;
            case 'message-log-channel':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Message Log Channel',
                                'message-log-channel <channel, none, current>',
                                'Sets the channel for which message updates will be logged'
                            )
                        ]
                    });
                require('../../settings/msglogchannel').run(client, interaction, args);
                break;
            case 'message-logging-ignored':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Message Logging Ignored',
                                'message-logging-ignored <add, remove, view>',
                                'Manage the channels where message updates and deletes will not be logged'
                            )
                        ]
                    });
                require('../../settings/msgloggingignored').run(client, interaction, args);
                break;
            case 'moderation-log-channel':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Moderation Log Channel',
                                'moderation-log-channel <channel, none, current>',
                                'Sets the channel for which moderator actions with Parallel will be logged'
                            )
                        ]
                    });
                require('../../settings/modlogchannel').run(client, interaction, args);
                break;
            case 'automod-log-channel':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Auto-Moderation Log Channel',
                                'automod-log-channel <channel, none, current>',
                                'Sets the channel for which automod instances will be logged'
                            )
                        ]
                    });
                require('../../settings/automodlog').run(client, interaction, args);
                break;
            case 'modroles':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Mod Roles',
                                'modroles <option: add, remove, removeall, view> [role]',
                                'Gives users with a moderator role the permission to run moderation commands'
                            )
                        ]
                    });
                require('../../settings/modroles').run(client, interaction, args);
                break;
            case 'mod-role-permissions':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Mod Role Permissions',
                                'mod-role-permissions add <permission name>\nmod-role-permissions remove <permission name>\nmod-role-permissions set <[permission int](https://discordapi.com/permissions.html#0)>\n mod-role-permissions view',
                                'Change the permissions the bot treats members with a moderator role to have'
                            )
                        ]
                    });
                require('../../settings/mod-role-permissions').run(client, interaction, args);
                break;
            case 'allowtenor':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Allow Tenor Links',
                                'allowtenor <option: enable, disable, current> <only for users with attachment perms: true, false>',
                                'If the link automod is enabled, it will allow tenor links to go by'
                            )
                        ]
                    });
                require('../../settings/allowtenor').run(client, interaction, args);
                break;
            case 'muterole':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Mute Role',
                                'muterole <mute role, current>',
                                "Sets the role the bot mutes user's with"
                            )
                        ]
                    });
                require('../../settings/muterole').run(client, interaction, args);
                break;
            case 'remove-roles-on-mute':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Remove Roles On Mute',
                                'remove-roles-on-mute <enable, disable, current>',
                                'An option whether to remove all roles from a user when they are muted and add the muted role, or just add the muted role'
                            )
                        ]
                    });
                require('../../settings/removerolesonmute').run(client, interaction, args);
                break;
            case 'afk-role-whitelist':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'AFK Role Whitelist',
                                'afk-role-whitelist add <role>\nafk-role-whitelist remove <role>\nafk-role-whitelist removeall\nafk-role-whitelist view',
                                'Manage the roles that are allowed to use the afk command'
                            )
                        ]
                    });
                require('../../settings/afk-role-whitelist').run(client, interaction, args);
                break;
            case 'errors':
                if (!args[1])
                    return interaction.reply({
                        embeds: [
                            settingsHelp(
                                'Errors',
                                'errors missing-permission [respond, ignore, delete]\nerrors disabled-command-channel [respond, ignore, delete]\nerrors delete-delay [time, never]',
                                'Change the way errors work with the bot'
                            )
                        ]
                    });
                require('../../settings/errors').run(client, interaction, args);
                break;
            default:
                return client.util.throwError(interaction, client.config.errors.invalid_option);
        }
    }
};
