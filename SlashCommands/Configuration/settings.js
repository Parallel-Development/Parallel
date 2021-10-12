const Discord = require('discord.js');
const { SlashCommandBuilder }= require('@discordjs/builders');

module.exports = {
    name: 'settings',
    description: 'Manage the server settings',
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    data: new SlashCommandBuilder().setName('settings').setDescription('Manage the server settings')
    .addSubcommand(command => command.setName('allow-commands').setDescription('Manage channels or categories where commands are allowed')
        .addStringOption(option => option.setName('method').setDescription('To enable, disable, view disabled, or enable all!').setRequired(true)
            .addChoice('Enable', 'enable')
            .addChoice('Disable', 'disable')
            .addChoice('View Disabled', 'viewdisabled')
            .addChoice('Enable All', 'enableall'))
        .addChannelOption(option => option.setName('channel').setDescription('The channel to manage'))),
    async execute(client, interaction, args) {

        return interaction.reply({ content: 'Please use the message command version of this command!', ephemeral: true });

        const subArgs = interaction.options.data.reduce((map, arg) => (map[arg.name] = arg, map), {})
        const _subArgs = Object.keys(subArgs).toString()

        switch (_subArgs) {
            case 'allowcmds':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Allow Commands',
                    'allowcmds <enable, enablecategory, disable, disablecategory, enableall, viewdisabled> [channel, category name]',
                    'Enable or disable commands in the specified channel. Moderation commands will still work in disabled channels')]})
                require('../../settings/allowcmds').run(client, interaction, args)
                break;
            case 'additional-baninfo':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Ban Information',
                    'additional-baninfo <interaction, current: gets the current ban info interaction>',
                    'Adds an additional embed field to the DM sent to a user when banned of whatever you like. Input `none` to disable the module\nTip: you can make a hyperlink by formatting your text as the following: `[text](link)`')]})
                require('../../settings/baninfo').run(client, interaction, args)
                break;
            case 'del-mod-cmd-triggers':
                if (!args[1]) if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Delete Moderation Command Triggers',
                    'del-mod-cmd-triggers <enable, disable, current>',
                    'Deletes the trigger of all moderation commands that punish a user. If using an interaction, send the punished embed seperately and reply to the interaction privately')]})
                require('../../settings/delmodcmds').run(client, interaction, args)
                break;
            case 'automod-warning-expiration':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Automod Warning Expiration',
                    'automod-warning-expiration <duration, current>',
                    'Sets an expiration date for all automod warnings')]})
                require('../../settings/autowarnexpire').run(client, interaction, args)
                break;
            case 'manual-warning-expiration':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Manual Warning Expiration',
                    'manual-warning-expiration <duration, current>',
                    'Sets a default expiration date for manual warnings')]})
                require('../../settings/manualwarnexpire').run(client, interaction, args);
                break;
            case 'prefix':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Prefix',
                    'prefix <prefix>',
                    'Changes the prefix for the server')]})
                require('../../settings/prefix').run(client, interaction, args)
                break;
            case 'interaction-log-channel':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Message Log Channel',
                    'interaction-log-channel <channel, none, current>',
                    'Sets the channel for which interaction updates will be logged')]})
                require('../../settings/msglogchannel').run(client, interaction, args)
                break;
            case 'moderation-log-channel':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Moderation Log Channel',
                    'moderation-log-channel <channel, none, current>',
                    'Sets the channel for which moderator actions with Parallel will be logged')]})
                require('../../settings/modlogchannel').run(client, interaction, args)
                break;
            case 'automod-log-channel':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Auto-Moderation Log Channel',
                    'automod-log-channel <channel, none, current>',
                    'Sets the channel for which automod instances will be logged')]});
                require('../../settings/automodlog').run(client, interaction, args)
                break;
            case 'modroles':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Mod Roles',
                    'modroles <option: add, remove, removeall, view> [role]',
                    'Gives users with a moderator role the permission to run moderation commands')]})
                require('../../settings/modroles').run(client, interaction, args)
                break;
            case 'allowtenor':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Allow Tenor Links',
                'allowtenor <option: enable, disable, current> <only for users with attachment perms boolean: true, false>',
                'If the link automod is enabled, it will allow tenor links to go by')]})
                require('../../settings/allowtenor').run(client, interaction, args);
                break;
            case 'muterole':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Mute Role',
                'muterole <mute role, current>',
                'Sets the role the bot mutes user\'s with')] })
                require('../../settings/muterole').run(client, interaction, args)
                break;
            case 'remove-roles-on-mute':
                if (!args[1]) return interaction.reply({ embeds: [settingsHelp('Remove Roles On Mute',
                'remove-roles-on-mute <enable, disable, current>',
                'An option whether to remove all roles from a user when they are muted and add the muted role, or just add the muted role')]})
                require('../../settings/removerolesonmute').run(client, interaction, args);
                break;
            default:
                return await client.util.throwError(interaction, client.config.errors.invalid_option);
        }

    }
}