const Discord = require('discord.js')
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');
const punishmentSchema = require('../../schemas/punishment-schema');

module.exports = {
    name: 'clearserverwarn',
    description: 'Clears all warnings from the server',
    permissions: 'ADMINISTRATOR',
    moderationCommand: true,
    usage: 'clearserverwarn',
    aliases: ['clearserverinfractions', 'clearserverwarnings', 'clearserverwarns'],
    async execute(client, message, args) {

        const confirmClearServerWarnings = new Discord.MessageEmbed()
            .setColor('#FFFF00')
            .setDescription('You are about to delete all the warnings from every user on this server. To confirm this action, type in the server name. (You have 30 seconds)')

        message.channel.send(confirmClearServerWarnings)
        let filter = m => m.author.id === message.author.id
        let collector = new Discord.MessageCollector(message.channel, filter, { max: 1, time: 30000 })

        collector.on('collect', async (message, col) => {
            if (message.content === message.guild.name) {

                const tryingToDelete = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setDescription('Clearing all server warnings... <a:loading:834973811735658548>')

                const msg = await message.channel.send(tryingToDelete)

                await warningSchema.deleteMany({
                    guildid: message.guild.id
                })

                let date = new Date();
                date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

                const deletedAllServerWarnings = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription('Successfully deleted all warnings from this server')

                msg.edit(deletedAllServerWarnings)

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