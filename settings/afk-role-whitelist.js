const afkSchema = require('../schemas/afk-schema');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
    const option = args[1]?.toLowerCase();

    if (!option) return client.util.throwError(message, client.config.errors.missing_argument_option);
    let role =
        client.util.getRole(message.guild, args[2]) ||
        message.guild.roles.cache.find(role => role.name === args.slice(2).join(' '));
    if (args.slice(2).join(' ') === 'everyone') role = message.guild.roles.everyone;

    if (!args[2] && (option === 'add' || option === 'remove'))
        return client.util.throwError(message, client.config.errors.missing_argument_role);
    if (!role && (option === 'add' || option === 'remove'))
        return client.util.throwError(message, client.config.errors.invalid_role);

    const guildAFK = await afkSchema.findOne({ guildID: message.guild.id });
    const { allowedRoles } = guildAFK;

    if (option === 'add') {
        if (allowedRoles.includes(role.id))
            return client.util.throwError(message, 'the provided role is already on the afk role whitelist!');
        await afkSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                $push: {
                    allowedRoles: role.id
                }
            }
        );

        return message.reply(`Anyone with the \`${role.name}\` role may now use the afk command`);
    } else if (option === 'remove') {
        if (!allowedRoles.includes(role.id))
            return client.util.throwError(message, 'the provided role is not on the afk role whitelist!');
        await afkSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                $pull: {
                    allowedRoles: role.id
                }
            }
        );

        return message.reply(`The \`${role.name}\` role no longer grants the ability to use the afk command`);
    } else if (option === 'removeall') {
        await afkSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                allowedRoles: []
            }
        );

        return message.reply(`Successfully removed all roles from the afk role whitelist`);
    } else if (option === 'view') {
        if (!allowedRoles.length) return message.reply(`There are no whitelisted roles setup for the afk command`);

        for (let i = 0; i !== allowedRoles.length; ++i) {
            const allowedRole = allowedRoles[i];
            if (!message.guild.roles.cache.get(allowedRole)) {
                await afkSchema.updateOne(
                    {
                        guildID: message.guild.id
                    },
                    {
                        $pull: {
                            allowedRoles: allowedRole
                        }
                    }
                );
            }
        }

        const _allowedRoles = await afkSchema
            .findOne({ guildID: message.guild.id })
            .then(result => result.allowedRoles);

        const roleList =
            _allowedRoles.map(role => message.guild.roles.cache.get(role.id)).join(' ').length <= 2000
                ? _allowedRoles.map(role => message.guild.roles.cache.get(role)).join(' ')
                : await client.util.createBin(_allowedRoles.map(role => message.guild.roles.cache.get(role.id)));

        const allowedRolesEmbed = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(message.guild))
            .setAuthor(
                `Allowed roles list for the afk command in ${message.guild.name}`,
                client.user.displayAvatarURL()
            )
            .setDescription(roleList);

        return message.reply({ embeds: [allowedRolesEmbed] });
    } else return client.util.throwError(message, client.config.errors.invalid_option);
};
