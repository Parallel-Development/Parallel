const Discord = require('discord.js')
const ms = require('ms')

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
            .addField('Allow Commands', '__allowcmds__\n\nEnable or disable commands in certain channels')
            .addField('Ban Information', '__baninfo__\n\nAdd a field to the DM sent to a banned user of whatever you like')
            .addField('Delete Moderation Commands', '__del-mod-cmd-triggers__\n\nDeletes all triggers moderation commands that punishes a user')
            .addField('Remove Roles on Mute', '__remove-roles-on-mute__\n\nRemoves all roles from the muted user, and adds them back when unmuted')
            .addField('Automod Warning Expiration', '__automod-warning-expiration__\n\nSet an expiration date for all automod warnings')
            return message.channel.send(settingsPannel);
        }

        switch (setting) {
            case 'allowcmds':
                var file = require('../../settings/allowcmds')
                file.run(client, message, args)
                break;
            case 'baninfo':
                var file = require('../../settings/baninfo')
                file.run(client, message, args)
                break;
            case 'del-mod-cmd-triggers':
                var file = require('../../settings/delmodcmds')
                file.run(client, message, args)
                break;
            case 'remove-roles-on-mute':
                var file = require('../../settings/rmrolesonmute');
                file.run(client, message, args)
                break;
            case 'automod-warning-expiration':
                var file = require('../../settings/autowarnexpire');
                file.run(client, message, args)
                break;
            default:
                return message.channel.send('Invalid option | Run `settings` to get the list of settings')
        }

    }
}

