const Discord = require('discord.js')
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');
const punishmentSchema = require('../../schemas/punishment-schema');

module.exports = {
    name: 'clearwarn',
    description: 'Clears all warnings from a user',
    usage: 'clearwarn <user>',
    aliases: ['clearinfractions'],
    async execute(client, message, args) {
        const accessdenied = new Discord.MessageEmbed()
    .setColor('#FF0000')
    .setDescription('You do not have the required permissions to run this command!')
    .setAuthor('Error', client.user.displayAvatarURL());
    
    const missingarguser = new Discord.MessageEmbed()
    .setColor('#FF0000')
    .setDescription('User not specified')
    .setAuthor('Error', client.user.displayAvatarURL());

    if(!message.member.hasPermission('MANAGE_GUILD')) return message.channel.send(accessdenied)

    if (!args[0]) return message.channel.send(missingarguser);

    var member;

    function getUserFromMention(mention) {
        if (!mention) return false;
        const matches = mention.match(/^<@!?(\d+)>$/);
        if (!matches) return mention;
        const id = matches[1];

        return id;
    }

    try {
        member = await message.guild.members.cache.find(member => member.id == parseInt(getUserFromMention(args[0])));
    } catch (err) {
        member = null
    }
    if (!member) return message.reply('There was an error catching this member. Maybe try a ping?')

    await warningSchema.deleteMany({
        guildid: message.guild.id,
        userid: member.id
    })
    await punishmentSchema.deleteOne({
        guildid: message.guild.id,
        type: 'warn',
        userID: member.id
    })

    const clearwarnembed = new Discord.MessageEmbed()
    .setColor('#09fff2')
    .setDescription(`Successfully deleted all warnings from ${member}`)
    
    message.channel.send(clearwarnembed)

    let date = new Date();
    date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

    const logCheckClearWarn = await settingsSchema.findOne({
        guildid: message.guild.id,
        logs: 'none'
    })

    if(!logCheckClearWarn) {
        const clearWarnLog = new Discord.MessageEmbed()
        .setColor('#000066')
        .addField('User', member, true)
        .addField('User ID', member.id, true)
        .addField('Moderator', message.author, true)
        .addField('Date', date, true)
        .setAuthor('User Warnings Cleared', client.user.displayAvatarURL())

        let webhooks = await message.guild.fetchWebhooks();
        let webhook = await webhooks.first();

        webhook.send({
            username: 'Razor',
            avatar: client.user.displayAvatarURL(),
            embeds: [clearWarnLog]
        })
    }
    }
}