const Discord = require('discord.js')
const lockSchema = require('../../schemas/lock-schema')

module.exports = {
    name: 'lock',
    description: 'Denies the permission for members to speak in the specified channel',
    usage: 'lock <channel>',
    moderationCommand: true,
    permissions: 'MANAGE_CHANNELS',
    async execute(client, message, args) {

        const missingperms = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('I do not have the permission to lock channels. Please give me the `Manage Channels` permission and run again')
            .setAuthor('Error', client.user.displayAvatarURL());

        let channel = message.mentions.channels.first();

        let reason = args.slice(1).join(' ');

        if(!channel) {
            channel = message.channel;
            reason = args.join(' ')
        }

        if(!reason) reason = 'Unspecified';

        const alreadyLocked = await lockSchema.findOne({
            guildid: message.guild.id,
            channelid: channel.id
        })

        if(alreadyLocked) return message.channel.send('This channel is already locked! (If you manually unlocked, just run the unlock command to register this channel as unlocked)')

        const locking = new Discord.MessageEmbed()
            .setColor('#ffa500')
            .setDescription(`Now attempting to lock ${channel}...`)

        if(!message.guild.me.hasPermission('MANAGE_CHANNELS')) return message.channel.send(missingperms);
        if(!channel.permissionsFor(message.guild.me).toArray().includes('MANAGE_CHANNELS')) return message.channel.send('I cannot manage this channel. Please give me permission to manage this channel and run again')

        const msg = await message.channel.send(locking)

        let enabledOverwrites = new Array();
        let neutralOverwrites = new Array();

        await channel.permissionOverwrites.forEach(async(r) => {
            if (r.type == 'role' && !channel.permissionsFor(message.guild.roles.cache.get(r.id)).toArray().includes('MANAGE_MESSAGES')) {
                if(!r.allow.toArray().includes('MANAGE_MESSAGES')
                || !channel.permissionsFor(message.guild.roles.cache.get(r.id)).toArray().includes('MANAGE_MESSAGES')
                || !channel.permissionsFor(message.guild.roles.cache.get(r.id)).toArray().includes('ADMINISTRATOR'))
                {
                    channel.updateOverwrite(message.guild.roles.cache.get(r.id), {
                        SEND_MESSAGES: false,
                    }).catch(e => false)

                    if(r.allow.toArray().includes('SEND_MESSAGES')) {
                        enabledOverwrites.push(r.id)
                    } else if(!r.deny.toArray().includes('SEND_MESSAGES')) {
                        neutralOverwrites.push(r.id)
                    }
                }
            }
        })

        await new lockSchema({
            guildid: message.guild.id,
            guildname: message.guild.name,
            channelid: channel.id,
            enabledOverwrites: enabledOverwrites,
            neutralOverwrites: neutralOverwrites
        }).save()

        locked = new Discord.MessageEmbed()
        .setColor('#ffa500')
        .setAuthor('Channel Locked', client.user.displayAvatarURL())
        .setDescription('This channel is currently locked | This means you cannot send messages in this channel')
        .addField('Lock Reason', reason)

        if(channel == message.channel) {
            msg.edit(locked)
        } else {
            msg.edit(new Discord.MessageEmbed()
            .setColor('#ffa500')
            .setDescription(`Successfully locked ${channel}`))

            channel.send(locked).catch(() => { return });
        }
    }
}
