const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');

exports.run = async(client, message, args) => {

    const guildSettings = await settingsSchema.findOne({ guildID: message.guild.id });
    const { muterole } = guildSettings;
    if (args[1] === 'current') {
        if (!message.guild.roles.cache.get(muterole)) return message.reply('There is no mute role. Mute a user to have the bot automatically create one, or just set the new muted role')
        const currentMuteroleEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`The current muted role is set to ${message.guild.roles.cache.get(muterole)}`)
        return message.reply( { embeds: [currentMuteroleEmbed] });
    }

    const role = client.util.getRole(message.guild, args[1]) || message.guild.roles.cache.find(r => r.name === args.slice(1).join(' '));
    if (!role) return client.util.throwError(message, client.config.errors.invalid_role);
    if (role.position >= message.guild.me.roles.highest.position) return client.util.throwError(message, client.config.errors.my_hierarchy);
    if (role === message.guild.roles.everyone || role.managed) return client.util.throwError(message, client.config.errors.unmanagable_role);

    await settingsSchema.updateOne({
        guildID: message.guild.id
    },
    {
        muterole: role.id
    })

    const successEmbed = new Discord.MessageEmbed()
    .setColor(client.config.colors.main)
    .setDescription(`${client.config.emotes.success} Successfully set the muted role to ${role}`)

    return message.reply({ embeds: [successEmbed] })
}