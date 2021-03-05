const Discord = require('discord.js')
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');
const punishmentSchema = require('../../schemas/punishment-schema');

module.exports = {
    name: 'clearserverwarn',
    description: 'Clears all warnings from the server',
    usage: 'clearserverwarn',
    aliases: ['clearserverinfractions'],
    async execute(client, message, args) {
        const accessdenied = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('You do not have the required permissions to run this command!')
            .setAuthor('Error', client.user.displayAvatarURL());

        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send(accessdenied)

        const confirmClearServerWarnings = new Discord.MessageEmbed()
            .setColor('#FFFF00')
            .setDescription('You are about to delete all the warnings from every user on this server. To confirm this action, type in the server name. (You have 30 seconds)')

        message.channel.send(confirmClearServerWarnings)
        let filter = m => m.author.id === message.author.id
        let collector = new Discord.MessageCollector(message.channel, filter, { max: 1, time: 30000 })

        collector.on('collect', async (message, col) => {
            if (message.content === message.guild.name) {
                await warningSchema.deleteMany({
                    guildid: message.guild.id
                })

                await punishmentSchema.deleteOne({
                    guildid: message.guild.id,
                    type: 'warn',
                })

                let date = new Date();
                date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

                const deletedAllServerWarnings = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription('Successfully deleted all warnings from this server')

                message.channel.send(deletedAllServerWarnings)

                collector.stop();
                return;
            } else {
                const cancelled = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setDescription('This action has been cancelled, because you input the wrong server name!')

                message.channel.send(cancelled)
                collector.stop();
                return;
            }
        })
    }
}