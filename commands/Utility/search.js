const Discord = require('discord.js');
const moment = require('moment')

module.exports = {
    name: 'search',
    description: 'Search for a user aspect in your server',
    usage: 'search <filter: username, nickname, tag> [...args]',
    aliases: ['find'],
    async execute(client, message, args) {

        const option = args[0];

        switch (option) {
            case 'username':
                const findingUsernameEmbed = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription('Searching the server for the specified username... <a:loading:834973811735658548>')
                const findingUsername = await message.channel.send(findingUsernameEmbed);
                const usernameOutput = await message.guild.members.cache.filter(member => member.user.username === args.slice(1).join(' '))
                if (usernameOutput.size === 0) return findingUsername.edit(new Discord.MessageEmbed().setColor('#09fff2').setDescription('No users found with the specified username'));
                const usernamesEmbed = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setTitle(`Search for username - \`${args.slice(1).join(' ')}\``)
                for(var i = 0; i !== usernameOutput.array().length; ++i) {
                    const user = usernameOutput.array()[i]
                    usernamesEmbed.addField(`${user.user.tag}`, `Username: \`${user.user.username}\`\nUser ID: \`${user.user.id}\`\nJoined server: \`${client.util.timestamp()}\``);
                };
                findingUsername.edit(usernamesEmbed).catch(() => { return message.channel.send('Failed to send output. Too big?') })

                break;
            case 'nickname':
                const findingNicknameEmbed = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription('Searching the server for the specified nickname... <a:loading:834973811735658548>')
                const findingNickname = await message.channel.send(findingNicknameEmbed);
                const nicknameOutput = await message.guild.members.cache.filter(member => member.displayName === args.slice(1).join(' '))
                if (nicknameOutput.size === 0) return findingNickname.edit(new Discord.MessageEmbed().setColor('#09fff2').setDescription('No users found with the specified nickname'));
                const nicknamesEmbed = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setTitle(`Search for nickname - \`${args.slice(1).join(' ')}\``)
                for(var i = 0; i !== nicknameOutput.array().length; ++i) {
                    const member = nicknameOutput.array()[i];
                    nicknamesEmbed.addField(`${member.user.tag}`, `Username: \`${member.user.username}\`\nUser ID: \`${member.user.id}\`\nJoined server: \`${client.util.timestamp()}\``)
                }
                findingNickname.edit(nicknamesEmbed).catch(() => { return message.channel.send('Failed to send output. Too big?') })
                break;
            case 'tag':
                if(args[1].length < 5 && args[1].charAt(0) === '#' || args[1].length < 4 && args[1].charAt(0) !== '#') return message.channel.send('An invalid tag was provided');
                const findingTagEmbed = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription('Searching the server for the specified tag... <a:loading:834973811735658548>')
                const findingTag = await message.channel.send(findingTagEmbed);
                const tagOutput = await message.guild.members.cache.filter(member => member.user.discriminator === args[1].replace('#', ''))
                if (tagOutput.size === 0) return findingTag.edit(new Discord.MessageEmbed().setColor('#09fff2').setDescription('No users found with the specified tag'));
                const tagsEmbed = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setTitle(`Search for tag - \`#${args[1].replace('#', '')}\``)
                for(var i = 0; i !== tagOutput.array().length; ++i) {
                    const tag = tagOutput.array()[i];
                    tagsEmbed.addField(`${tag.user.tag}`, `Username: \`${tag.user.username}\`\nUser ID: \`${tag.user.id}\`\nJoined server: \`${client.util.timestamp()}\``)
                }
                findingTag.edit(tagsEmbed).catch(() => { return message.channel.send('Failed to send output. Too big?') })
                break;
            default:
                const findingNicknameEmbed_ = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setDescription('Searching the server for the specified nickname... <a:loading:834973811735658548>')
                const findingNickname_ = await message.channel.send(findingNicknameEmbed_);
                const nicknameOutput_ = await message.guild.members.cache.filter(member => member.displayName === args.join(' '))
                if (nicknameOutput_.size === 0) return findingNickname_.edit(new Discord.MessageEmbed().setColor('#09fff2').setDescription('No users found with the specified nickname'));
                const nicknamesEmbed_ = new Discord.MessageEmbed()
                    .setColor('#09fff2')
                    .setTitle(`Search for nickname - \`${args.join(' ')}\``)
                for (var i = 0; i !== nicknameOutput_.array().length; ++i) {
                    const member_ = nicknameOutput_.array()[i];
                    nicknamesEmbed_.addField(`${member_.user.tag}`, `Username: \`${member_.user.username}\`\nUser ID: \`${member_.user.id}\`\nJoined server: \`${client.util.timestamp()}\``)
                }
                findingNickname_.edit(nicknamesEmbed_).catch(() => { return message.channel.send('Failed to send output. Too big?') })
        }
    }

}
