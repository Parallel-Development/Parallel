const Discord = require('discord.js')
const settingsSchema = require('../../schemas/settings-schema');

module.exports = {
    name: 'unban',
    description: 'Unbans the specified member from the server',
    permissions: 'BAN_MEMBERS',
    moderationCommand: true,
    usage: 'unban',
    aliaes: ['pardon'],
    async execute(client, message, args) {
    
        const missingperms = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('I do not have the permission to ban members. Please give me the `Ban Members` permission and run again')
        .setAuthor('Error', client.user.displayAvatarURL());
    
        const missingarguser = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('User not specified')
        .setAuthor('Error', client.user.displayAvatarURL());
    
        const badinput = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('You can only unban members by ID!')
        .setAuthor('Error', client.user.displayAvatarURL())
    
        const nobans = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('There are no users currently banned on this server!')
        .setAuthor('Error', client.user.displayAvatarURL())
    
        const notBanned = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('This user is not currently banned!')
        .setAuthor('Error', client.user.displayAvatarURL())
    
        const userID = args[0]
        if(!userID) return message.channel.send(missingarguser)
        if(isNaN(userID)) return message.channel.send(badinput)

        let reason = args.slice(1).join(' ')
        if(!reason) reason = 'Unspecified';

        const deleteModerationCommand = await settingsSchema.findOne({
            guildid: message.guild.id,
            delModCmds: true
        })
    
        message.guild.fetchBans().then(bans => {
            if(bans.size == 0) return message.channel.send(nobans)
            let bannedUser = bans.find(b => b.user.id == userID)
            if(!bannedUser) return message.channel.send(notBanned)

            if (deleteModerationCommand) message.delete()
            
            message.guild.members.unban(bannedUser.user)
    
            const unbanned = new Discord.MessageEmbed()
            .setColor('#09fff2')
            .setDescription(`<@!${userID}> has been unbanned <a:check:800062847974375424>`)
            message.channel.send(unbanned)

            var file = require('../../structures/moderationLogging');
            file.run(client, 'Unbanned', message.member, await client.users.fetch(userID), message.channel, reason, null, code)
        })}
}
