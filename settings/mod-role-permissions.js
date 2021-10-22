const settingsSchema = require('../schemas/settings-schema');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
    const option = args[1].toLowerCase();

    let permission;
    try {
        permission = new Discord.Permissions(args.slice(2).join(' ').replaceAll(' ', '_').toUpperCase());
    } catch {
        permission = false;
    }

    if (!permission && option !== 'view')
        return client.util.throwError(message, 'no permission with this name or permission integer found');
    if (option !== 'view' && permission.has(Discord.Permissions.FLAGS.ADMINISTRATOR))
        permission = Discord.Permissions.FLAGS.ADMINISTRATOR;
    if (option !== 'view' && permission.length > 1 && option !== 'set')
        return client.util.throwError(
            message,
            'you can only use option `add` or `remove` with one permission at a time. To set the permissions all at once, consider using option `set`'
        );
    if(option !== 'view' && !message.member.permissions.has(permission)) return client.util.throwError(message, 'cannot manage a permission that you don\'t have');

    if (!option) return client.util.throwError(message, client.config.errors.missing_argument_option);

    const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
    const { modRolePermissions } = guildSettings;

    if (option === 'add') {
        if (new Discord.Permissions(modRolePermissions).has(permission))
            return client.util.throwError(
                message,
                'this permission is already on the moderator role permissions list!'
            );
        if (modRolePermissions !== '0' && permission === Discord.Permissions.FLAGS.ADMINISTRATOR)
            return client.util.throwError(
                message,
                'to add the administrator permission to the list, please remove all other listed permissions'
            );
        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                modRolePermissions: (BigInt(modRolePermissions) + permission).toString()
            }
        );

        return message.reply(`Successfully updated the moderator role permissions!`);
    } else if (option === 'remove') {
        if (!new Discord.Permissions(modRolePermissions).has(permission))
            return client.util.throwError(
                message,
                'this permission is not already on the moderator role permissions list!'
            );
        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                modRolePermissions: (BigInt(modRolePermissions) - permission).toString()
            }
        );

        return message.reply(`Successfully updated the moderator role permissions!`);
    } else if (option === 'set') {
        if (permission > 8589934591) return client.util.throwError(message, 'this permission int is to large');
        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                modRolePermissions: permission
            }
        );

        return message.reply(`Successfully set the moderator role permissions! `);
    } else if (option === 'view') {
        if (modRolePermissions === '0') return message.reply(`The moderator role permissions list is empty!`);
        const modRolePermissionsEmbed = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(message.guild))
            .setAuthor(`Moderator role permissions for ${message.guild.name}`, client.user.displayAvatarURL())
            .setDescription(
                `${
                    modRolePermissions === '8'
                        ? '`administrator`'
                        : new Discord.Permissions(modRolePermissions)
                              .toArray()
                              .map(perm => `\`${perm}\``)
                              .join(', ')
                              .replaceAll('_', ' ')
                              .toLowerCase()
                }`
            );

        return message.reply({ embeds: [modRolePermissionsEmbed] });
    } else return client.util.throwError(message, client.config.errors.invalid_option);
};
