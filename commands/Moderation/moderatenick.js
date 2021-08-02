const Discord = require('discord.js');

module.exports = {
    name: 'moderatenick',
    description: 'Set the nickname of a user to Moderated_(Random Code) - Used to help filter out names blacklisted on a server',
    usage: 'moderatenick [member]\nmoderatenick [member] --dm',
    aliases: ['moderatenickname', 'modnick', 'moderate', 'mod'],
    permissions: 'MANAGE_NICKNAMES',
    requiredBotPermission: 'MANAGE_NICKNAMES',
    async execute(client, message, args) {

        if(!args[0]) return message.channel.send(client.config.errorMessages.missing_argument_member);

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if(!member) return message.channel.send(client.config.errorMessages.invalid_member);

        if (member.id === client.user.id) return message.channel.send(client.config.errorMessages.cannot_punish_myself);
        if (member.id === message.member.id) return message.channel.send(client.config.errorMessages.cannot_punish_yourself);
        if (member.roles.highest.position >= message.member.roles.highest.position && message.member !== message.guild.owner) return message.channel.send(client.config.errorMessages.hierarchy);
        if (member.roles.highest.position >= message.guild.me.roles.highest.position) return message.channel.send(client.config.errorMessages.my_hierarchy);

        const code = client.util.generateRandomBase62String(8);
        member.setNickname(`Moderated_${code}`);

        const moderatedNicknameEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setDescription(`${client.config.emotes.success} User ID \`${member.id}\` has been moderated with identifier code ${code}`)
        
        message.channel.send(moderatedNicknameEmbed);
        if(args[1] === '--dm') member.send(`Your username was moderated in **${message.guild.name}**`)

        return;
    }
}