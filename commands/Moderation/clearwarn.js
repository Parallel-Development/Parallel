const Discord = require('discord.js')
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');
const punishmentSchema = require('../../schemas/punishment-schema');

module.exports = {
    name: 'clearwarn',
    description: 'Clears all warnings from a user',
    permissions: 'ADMINISTRATOR',
    moderationCommand: true,
    usage: 'clearwarn <user>',
    aliases: ['clearinfractions', 'clearwarnings', 'clearwarns'],
    async execute(client, message, args) {

        const missingarguser = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription('User not specified')
            .setAuthor('Error', client.user.displayAvatarURL());

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

        if (!member) {
            try {
                member = await client.users.fetch(args[0])
            } catch {
                return message.channel.send('Please specify a valid member')
            }
        }

        const confirmClearUserWarnings = new Discord.MessageEmbed()
        .setColor('#FFFF00')
        .setDescription('You are about to delete all the warnings from this user. To confirm this action, respond with `confirm` (You have 30 seconds)')

        message.channel.send(confirmClearUserWarnings)

        let filter = m => m.author.id == message.author.id;
        const collector = new Discord.MessageCollector(message.channel, filter, { time: 30000 })
        collector.on('collect', async(message) => {
            if(message.content == 'confirm') {
                await warningSchema.deleteMany({
                    guildid: message.guild.id,
                    userid: member.id
                })

                const clearwarnembed = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription(`Successfully deleted all warnings from ${member}`)

                message.channel.send(clearwarnembed)
                collector.stop();
                return
            } else {
                const cancelled = new Discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setDescription('This action has been cancelled because you did not input the correct confirmation keyword')

                message.channel.send(cancelled)
                collector.stop();
                return;
            }
        
        })

        collector.on('end', (col, reason) => {
            if (reason == 'time') {
                return message.channel.send('No response for more than 30 seconds, action cancelled')
            }
        })

    }
}
