const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async(client, message, args) => {
    const option = args[1];

    if(option == 'view') {
        const getModRoles = await settingsSchema.findOne({
            guildid: message.guild.id,
        })
        if(getModRoles.modRoles.length == 0) return message.channel.send('No moderation roles are setup for this server')
        const viewModRoles = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setAuthor(`Moderation roles for ${message.guild.name}`, client.user.displayAvatarURL())
        let descriptionArr = [];
        getModRoles.modRoles.forEach(async(modRole) => {
            descriptionArr.push(message.guild.roles.cache.get(modRole))
        })
        let description;
        description += descriptionArr.join(', ');
        viewModRoles.setDescription(description);
        return message.channel.send(viewModRoles)

    } else if(option == 'removeall') {
        await settingsSchema.updateOne({
            guildid: message.guild.id
        },
        {
            modRoles: []
        })
        return message.channel.send('Successfully removed all moderation roles')
    } else if(option == 'add') {
        let role = message.mentions.roles.first() || message.guild.roles.cache.find(r => r.name == args[2]);
        if(!role) return message.channel.send('Please mention the moderator role or specify its name');

        await settingsSchema.updateOne({
            guildid: message.guild.id
        },
        {
            $push: {
                modRoles: role.id
            }
        })
        return message.channel.send(`\`${role.name}\` has been added to the moderator role list!`)
    } else if(option == 'remove') {
        let role = message.mentions.roles.first() || message.guild.roles.cache.find(r => r.name == args[2]);
        if (!role) return message.channel.send('Please mention the moderator role or specify its name');

        await settingsSchema.updateOne({
            guildid: message.guild.id
        },
            {
                $pull: {
                    modRoles: role.id
                }
            })
        return message.channel.send(`\`${role.name}\` has been removed from the moderator role list!`)
    } else {
        return message.channel.send('Invalid option!')
    }

}