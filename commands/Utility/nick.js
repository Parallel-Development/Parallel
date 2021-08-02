const Discord = require('discord.js');

module.exports = {
    name: 'nick',
    description: 'Change the nickname of a user',
    usage: 'nick [member] <new nickname>\nnick [name]',
    permissions: 'MANAGE_NICKNAMES',
    requiredBotPermission: 'MANAGE_NICKNAMES',
    async execute(client, message, args) {

        if(!args[0]) return message.channel.send(client.config.errorMessages.missing_argument_member);

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if(!member) return message.channel.send(client.config.errorMessages.invalid_member);
        
        if(member.roles.highest.position >= message.member.roles.highest.position && message.member !== message.guild.owner && member !== message.member) return message.channel.send(client.config.errorMessages.hierarchy);
        if(member.roles.highest.position >= message.guild.me.roles.highest.position) return message.channel.send(client.config.errorMessages.my_hiearchy);

        const nickname = args.slice(1).join(' ') || null;
        if(member.nickname === nickname && nickname === null) return message.channel.send('Please provide a nickname as this user has none!')
        if(member.nickname === nickname) return message.channel.send('This user already has this nickname!');
        if(nickname.length > 32) return message.channel.send('Nickname length must be less than 33 characaters')
        await member.setNickname(nickname);

        const successEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`${client.config.emotes.success} Nickname for ${member} set  ${nickname ? `to \`${nickname}\`` : 'back to normal'}`)
        return message.channel.send(successEmbed)
    }
}