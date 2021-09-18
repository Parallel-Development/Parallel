const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');
const punishmentSchema = require('../../schemas/punishment-schema')
const restricted = new Set();

module.exports = {
    name: 'clear-server-infractions',
    description: 'Remove all server infractions',
    usage: 'clear-server-infractions',
    aliases: ['clear-server-warns', 'clear-server-warnings', 'clear-all-warnings'],
    permissions: Discord.Permissions.FLAGS.ADMINISTRATOR,
    async execute(client, message, args) {

        if (restricted.has(message.guild.id)) return;

        const guildWarnings = await warningSchema.findOne({ 
            guildID: message.guild.id
        })

        if (!guildWarnings || !guildWarnings.warnings.length) return message.reply('This server has no warnings')

        message.reply('Are you sure? This will remove all warnings from the server and there is no way to get them back. To confirm, respond with the server name')
        const filter = m => m.author.id === message.author.id;
        const collector = new Discord.MessageCollector(message.channel, { filter: filter, time: 30000 });
        collector.on('collect', async(message) => {
            if (message.content === message.guild.name) {
                await warningSchema.deleteOne({
                    guildID: message.guild.id
                })
                const deletedAllWarnings = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setDescription(`${client.config.emotes.success} All warnings have been deleted`)
                message.reply({ embeds: [deletedAllWarnings] })
                return collector.stop();
            } else {
                message.reply('Action Cancelled');
                return collector.stop();
            }
        })

        collector.on('end', (collected, reason) => {
            restricted.delete(message.guild.id)
            if (reason === 'time') return message.reply('No response was received in time, cancelled')
        })
    }
}
