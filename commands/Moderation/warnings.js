const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema')

module.exports = {
    name: 'warnings',
    description: 'Fetches a user\'s warnings in the server',
    usage: 'warnings <member>',
    aliases: ['infractions', 'modlogs', 'search', 'record'],
    async execute(client, message, args) {
        const accessdenied = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('You do not have the required permissions to run this command!')
        .setAuthor('Error', client.user.displayAvatarURL());
        
        const missingarguser = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('User not specified')
        .setAuthor('Error', client.user.displayAvatarURL());
    
        if(!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send(accessdenied)
    
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
    
        const warnings = await warningSchema.find({
            guildid: message.guild.id,
            userid: member.id
        })
        .catch(e => false)
    
        if(warnings.length > 0) {
            let warningsList = new Discord.MessageEmbed()
            warningsList.setAuthor(`Warnings for ${member.user.tag}`, client.user.displayAvatarURL())
            warningsList.setColor('#09fff2')
            warnings.forEach((warnings) => {
                const {type, reason, code, date} = warnings
                warningsList.addField(`${type}`, `ID: \`${code}\`\nReason: \`${reason}\`\nDate: \`${date}\``, false)
            })
    
            message.channel.send(warningsList).catch(() => { return })
        } else {
            message.channel.send('This user does not have any warnings!')
        }
    }
}