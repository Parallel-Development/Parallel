const Discord = require('discord.js')
const ms = require('ms')

module.exports = {
    name: 'settings',
    description: 'Allows you to change server settings',
    usage: 'settings <option>',
    async execute(client, message, args) {
        const settingsSchema = require('../../schemas/settings-schema')

        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to execute this command')
            .setAuthor('Error', client.user.displayAvatarURL());

        if (!message.member.hasPermission('MANAGE_GUILD')) return message.channel.send(accessdenied)

        let option = args[0]
        let setting = args[1]

        const settingslist = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .addField('Prefix', 'Sets the server bot prefix for razor to whatever you input (prefix)')
            .addField('Logs', 'Chooses a channel to log information to. If you pass \`none\`, logging will be disabled (logs)')
            .setAuthor('Settings', client.user.displayAvatarURL())

        if (!option) return message.channel.send(settingslist)

        if (option === 'prefix') {
            if (!setting) return message.channel.send('Please specify a prefix')

            await settingsSchema.updateOne({
                guildid: message.guild.id
            }, {
                prefix: setting
            })

            message.channel.send(`The server prefix for razor is now \`${setting}\`. You can ping me if you ever forget the prefix`)
        }

        if (option === 'logs') {

            const missingperms = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setDescription('In order to use logs, please give me the `Manage Webhooks` permission')
                .setAuthor('Error', client.user.displayAvatarURL());

            if (!message.guild.me.hasPermission('MANAGE_WEBHOOKS')) return message.channel.send(missingperms)

            let channel = message.mentions.channels.first();
            if (args[1] === 'none') {
                var webhooks = await message.guild.fetchWebhooks();
                var webhook = webhooks.first();
                webhook.delete().catch(() => { return })
                const loggingdisabled = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription('Logging has been disabled in this server')
                    .setAuthor('Logging Disabled', client.user.displayAvatarURL())
                message.channel.send(loggingdisabled)
                await settingsSchema.updateMany({
                    guildid: message.guild.id,
                    logs: 'none'
                })
                return;
            }

            if (!channel) return message.channel.send('Please specify a channel to log in')

            const checkForWebhook = await settingsSchema.findOne({
                guildid: message.guild.id,
                logs: 'none'
            })

            if (checkForWebhook) {
                channel.createWebhook('Razor', {
                    username: 'Razor',
                    avatar: client.user.displayAvatarURL(),
                    channel: channel.id
                })

                var logginghere = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription(`Logs will now be logged in ${channel}`)
                    .setAuthor('Log Channel Set', client.user.displayAvatarURL())

                message.channel.send(logginghere)

                await settingsSchema.updateOne({
                    guildid: message.guild.id,
                    
                }, {
                    logs: channel.id
                })
            } else {

                let webhooks = await message.guild.fetchWebhooks()
                let webhook = webhooks.first();

                webhook.edit({
                    channel: channel.id
                }).catch(() => {
                    channel.createWebhook('Razor', {
                        username: 'Razor',
                        avatar: client.user.displayAvatarURL(),
                        channel: channel.id
                    })
                })

                var logginghere = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription(`Logs will now be logged in ${channel}`)
                    .setAuthor('Log Channel Set', client.user.displayAvatarURL())

                message.channel.send(logginghere)

                await settingsSchema.updateOne({
                    guildid: message.guild.id
                }, {
                    logs: channel.id
                })
            }

        } 
    }
}

