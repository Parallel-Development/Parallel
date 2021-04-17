const Discord = require('discord.js')
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');
const punishmentSchema = require('../../schemas/punishment-schema');

module.exports = {
    name: 'clearwarn',
    description: 'Clears all warnings from a user',
    permissions: 'MANAGE_GUILD',
    moderationCommand: true,
    usage: 'clearwarn <user>',
    aliases: ['clearinfractions'],
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
        if (!member) return message.reply('There was an error catching this member. Maybe try a ping?')

        await warningSchema.deleteMany({
            guildid: message.guild.id,
            userid: member.id
        })

        const clearwarnembed = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`Successfully deleted all warnings from ${member}`)

        message.channel.send(clearwarnembed)

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

    }
}