const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async (client, message, args) => {
    const option = args[1];

    if (option === 'view') {
        const getModRoles = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        if (!getModRoles.modRoles.length) return message.reply('No moderation roles are setup for this server');
        const viewModRoles = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setAuthor(`Moderation roles for ${message.guild.name}`, client.user.displayAvatarURL());
        const descriptionArr = [];
        for (let i = 0; i !== getModRoles.modRoles.length; ++i) {
            const modRole = getModRoles.modRoles[i];
            descriptionArr.push(message.guild.roles.cache.get(modRole));
        }
        viewModRoles.setDescription(descriptionArr.join(', '));
        return message.reply({ embeds: [viewModRoles] });
    } else if (option === 'removeall') {
        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                modRoles: []
            }
        );
        return message.reply(`${client.config.emotes.success} Successfully removed all moderation roles`);
    } else if (option === 'add') {
        let role =
            client.util.getRole(message.guild, args[2]) ||
            message.guild.roles.cache.find(r => r.name === args.slice(2).join(' '));
        if (!role) return client.util.throwError(message, 'Please mention the moderator role or specify its name');

        const isThisAlreadyOnTheList = await settingsSchema.findOne({
            guildID: message.guild.id,
            modRoles: role.id
        });

        if (isThisAlreadyOnTheList) return client.util.throwError(message, 'This role is already on the list!');

        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                $push: {
                    modRoles: role.id
                }
            }
        );
        const addedRole = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(
                `Role ${role.toString()} has been added to the moderator roles list. This role now has moderator permissions`
            );
        return message.reply({ embeds: [addedRole] });
    } else if (option === 'remove') {
        let role =
            client.util.getRole(message.guild, args[2]) ||
            message.guild.roles.cache.find(r => r.name === args.slice(2).join(' '));
        if (!role) return client.util.throwError(message, 'Please mention the moderator role or specify its name');

        const isThisEvenOnTheList = await settingsSchema.findOne({
            guildID: message.guild.id,
            modRoles: role.id
        });

        if (!isThisEvenOnTheList) return message.reply('This role is not even on the list!');

        await settingsSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                $pull: {
                    modRoles: role.id
                }
            }
        );
        const removedRole = new Discord.MessageEmbed()
            .setColor(client.config.colors.main)
            .setDescription(
                `Role ${role.toString()} has been removed to the moderator roles list. This role no longer has moderator permissions`
            );
        return message.reply({ embeds: [removedRole] });
    } else {
        return client.util.throwError(message, client.config.errors.invalid_option);
    }
};
