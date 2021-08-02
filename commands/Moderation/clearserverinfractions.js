const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema');
const restricted = new Set();

module.exports = {
    name: 'clearserverinfractions',
    description: 'Remove all server infractions',
    usage: 'clearserverinfractions\nclearserverinfractions',
    aliases: ['clearserverwarn', 'clearserverwarnings', 'clearallwarnings'],
    permissions: 'ADMINISTRATOR',
    async execute(client, message, args) {

        if(restricted.has(message.guild.id)) return;

        const guildWarnings = await warningSchema.findOne({ 
            guildID: message.guild.id
        })

        if(!guildWarnings || !guildWarnings.warnings.length) return message.channel.send('This server has no warnings')

        message.channel.send('Are you sure? This will remove all warnings from the server and there is no way to get them back. To confirm, respond with the server name')
        const filter = m => m.author.id === message.author.id;
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 30000 });
        collector.on('collect', async(message) => {
            if(message.content === message.guild.name) {
                await warningSchema.deleteOne({
                    guildID: message.guild.id
                })
                const deletedAllWarnings = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setDescription(`${client.config.emotes.success} All warnings have been deleted`)
                message.channel.send(deletedAllWarnings)
                return collector.stop();
            } else {
                message.channel.send('Action Cancelled');
                return collector.stop();
            }
        })

        collector.on('end', (collected, reason) => {
            restricted.delete(message.guild.id)
            if(reason === 'time') return message.channel.send('No response was received in time, cancelled')
        })
    }
}