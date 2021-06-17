const Discord = require('discord.js');
const moment = require('moment')

module.exports = {
    name: 'search',
    description: 'Search for a user aspect in your server',
    usage: 'search <filter: username, nickname, tag> [...args]',
    aliases: ['find'],
    async execute(client, message, args) {

        const option = args[0];
        if(!option) return message.channel.send('No option was provided! Please choose an option');

        switch (option) {
            case 'username':
                if(!args[1]) return message.channel.send('Please specify a username to search for!')
                const findingUsernameEmbed = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setDescription('Searching the server for the specified username... <a:loading:834973811735658548>')
                const findingUsername = await message.channel.send(findingUsernameEmbed);
                const usernameOutput = await message.guild.members.cache.filter(member => member.user.username == args.slice(1).join(' '))
                if(usernameOutput.size == 0) return findingUsername.edit(new Discord.MessageEmbed().setColor('#09fff2').setDescription('No users found with the specified username'));
                const usernamesEmbed = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setTitle(`Search for username - \`${args.slice(1).join(' ')}\``)
                usernameOutput.forEach(async(user) => {
                    usernamesEmbed.addField(`${user.user.tag}`, `Username: \`${user.user.username}\`\nUser ID: \`${user.user.id}\`\nJoined server: \`${moment(user.joinedAt).format('dddd, MMMM Do YYYY, h:mm:ss A')}\``)
                })
                findingUsername.edit(usernamesEmbed).catch(() => { return message.channel.send('Failed to send output. Too big?') })

                break;
            case 'nickname':
                if (!args[1]) return message.channel.send('Please specify a nickname to search for!')
                const findingNicknameEmbed = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setDescription('Searching the server for the specified nickname... <a:loading:834973811735658548>')
                const findingNickname = await message.channel.send(findingNicknameEmbed);
                const nicknameOutput = await message.guild.members.cache.filter(member => member.displayName == args.slice(1).join(' '))
                if (nicknameOutput.size == 0) return findingNickname.edit(new Discord.MessageEmbed().setColor('#09fff2').setDescription('No users found with the specified nickname'));
                const nicknamesEmbed = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setTitle(`Search for nickname - \`${args.slice(1).join(' ')}\``)
                nicknameOutput.forEach(async (user) => {
                    nicknamesEmbed.addField(`${user.user.tag}`, `Username: \`${user.user.username}\`\nUser ID: \`${user.user.id}\`\nJoined server: \`${moment(user.joinedAt).format('dddd, MMMM Do YYYY, h:mm:ss A')}\``)
                })
                findingNickname.edit(nicknamesEmbed).catch(() => { return message.channel.send('Failed to send output. Too big?') })
                break;
            case 'tag':
                if (!args.slice(1).join(' ')) return message.channel.send('Please specify a tag to search for!')
                const findingTagEmbed = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setDescription('Searching the server for the specified tag... <a:loading:834973811735658548>')
                const findingTag = await message.channel.send(findingTagEmbed);
                const tagOutput = await message.guild.members.cache.filter(member => member.user.discriminator == args[1].replace('#', ''))
                if (tagOutput.size == 0) return findingTag.edit(new Discord.MessageEmbed().setColor('#09fff2').setDescription('No users found with the specified tag'));
                const tagsEmbed = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setTitle(`Search for tag - \`#${args[1].replace('#', '')}\``)
                tagOutput.forEach(async (user) => {
                    tagsEmbed.addField(`${user.user.tag}`, `Username: \`${user.user.username}\`\nUser ID: \`${user.user.id}\`\nJoined server: \`${moment(user.joinedAt).format('dddd, MMMM Do YYYY, h:mm:ss A')}\``)
                })
                findingTag.edit(tagsEmbed).catch(() => { return message.channel.send('Failed to send output. Too big?') })
                break;
            default:
                return message.channel.send('Invalid option! View the options in the information of this command')
        }
    }
}
