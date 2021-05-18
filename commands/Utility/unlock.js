const Discord = require('discord.js')
const lockSchema = require('../../schemas/lock-schema')

module.exports = {
    name: 'unlock',
    description: 'Grants the permission for members to speak in the specified channel',
    usage: 'unlock <channel>',
    moderationCommand: true,
    permissions: 'MANAGE_CHANNELS',
    async execute(client, message, args) {

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to unlock channels. Please give me the `Manage Channels` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL());

        let channel = message.mentions.channels.first();

        let reason = args.slice(1).join(' ');

        if (!channel) {
            channel = message.channel;
            reason = args.join(' ')
        }

        if (!reason) reason = 'Unspecified';

        const getLockSchema = await lockSchema.findOne({
            guildid: message.guild.id,
            channelid: channel.id
        })

        if (!getLockSchema) return message.channel.send('This channel is already unlocked! (If you manually locked, just run the lock command to register this channel as locked)')

        const { enabledOverwrites, neutralOverwrites } = getLockSchema;

        const unlocking = new Discord.MessageEmbed()
            .setColor('#FF000')
            .setDescription(`Now attempting to unlock ${channel}...`)

        if (!message.guild.me.hasPermission('MANAGE_CHANNELS')) return message.channel.send(missingperms);
        if (!channel.permissionsFor(message.guild.me).toArray().includes('MANAGE_CHANNELS')) return message.channel.send('I cannot manage this channel. Please give me permission to manage this channel and run again')

        const msg = await message.channel.send(unlocking)

        enabledOverwrites.forEach(overwrite => {
            channel.updateOverwrite(message.guild.roles.cache.get(overwrite), { 
                SEND_MESSAGES: true
            }).catch(e => false)
        })

        neutralOverwrites.forEach(overwrite => {
            channel.updateOverwrite(message.guild.roles.cache.get(overwrite), {
                SEND_MESSAGES: null
            }).catch(e => false)
        })

        await lockSchema.deleteOne({
            guildid: message.guild.id,
            channelid: channel.id
        })

        unlocked = new Discord.MessageEmbed()
            .setColor('#FF000')
            .setAuthor('Channel Unlocked', client.user.displayAvatarURL())
            .setDescription('This channel has been unlocked | This means you can now send messages in this channel')
            .addField('Unlock Reason', reason)

        if (channel == message.channel) {
            msg.edit(unlocked)
        } else {
            msg.edit(new Discord.MessageEmbed()
                .setColor('#FF000')
                .setDescription(`Successfully unlocked ${channel}`))

            channel.send(unlocked).catch(() => { return });
        }
    }
}