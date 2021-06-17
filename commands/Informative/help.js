const { execute } = require("../Utility/clear");
const Discord = require('discord.js')
const fs = require('fs')
const path = require('path')
const commandFolders = fs.readdirSync('./commands')
const settingsSchema = require('../../schemas/settings-schema');
const config  = require("../../config.json");

module.exports = {
    name: 'help',
    description: 'Provides help on commands',
    usage: 'help <command>',
    aliases: ['commands'],
    async execute(client, message, args) {
        if (args[0]) {
            return getCMD(client, message, args[0]);
        } else {
            return getAll(client, message);
        }
    }
}

async function getAll(client, message) {

    let prefixSetting = await settingsSchema.findOne({
        guildid: message.guild.id
    })
    let { prefix } = prefixSetting

    const mainHelp = new Discord.MessageEmbed()
    mainHelp.setColor('#09fff2')
    mainHelp.setAuthor('Help | Razor', client.user.displayAvatarURL())
    mainHelp.setFooter(`To get specific information about a command, run ${prefix}help <command>`)
    for(const folder of commandFolders) {
        let commands = new Array();
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'))
        for(const file of commandFiles) {
            let cmd = client.commands.get(path.parse(file).name)
            if(cmd.developer && config.developers.includes(message.author.id) 
            || cmd.eval && config.eval.includes(message.author.id)
            || cmd.developer && config.blacklist.includes(message.author.id)) {
                commands.push(`\`${path.parse(file).name}\``)
            } else  {
                if(!cmd.deprecated && !cmd.developer && !cmd.eval) commands.push(`\`${path.parse(file).name}\``)
            }
        }
        if (commands.length !== 0) mainHelp.addField(folder, commands.join(', '))
    }
    mainHelp.addField('Links', `[Invite Link](https://discord.com/oauth2/authorize?client_id=745401642664460319&permissions=8&scope=bot) | [Support/Development Server](https://discord.gg/DcmVMPx8bn) | [Bot Guidelines](https://docs.google.com/document/d/1u0Z6WVS0V8D72E8cU5gUw2OwGeqW3g1OvwSkzG7odOw/edit) | [Privacy Policy](https://docs.google.com/document/d/1-dkGO89cDY_GeKzjKj9SMAVm8SbSvdOZlMK3WLZ6kIs/edit)`)
    message.channel.send(mainHelp)
}

async function getCMD(client, message, input) {

    let prefixSetting = await settingsSchema.findOne({
        guildid: message.guild.id
    })
    let { prefix } = prefixSetting

    const embed = new Discord.MessageEmbed()

    let cmd = client.commands.get(input.toLowerCase()) || client.commands.get(client.aliases.get(input.toLowerCase()));

    let info = `<:error:815355171537289257> No information found for command **${input.toLowerCase()}**`;

    if (!cmd) {
        embed.setColor('#09fff2')
        .setDescription(info)
        return message.channel.send(embed);
    }

    if(cmd.deprecated) return message.channel.send('This command is deprecated and is no longer usable')
    if(cmd.eval && !config.eval.includes(message.author.id)) return message.channel.send('This command is too cool for you to get help on')
    if(cmd.developer && !config.blacklist.includes(message.author.id)) return message.channel.send('This command is too cool for you to get help on')

    embed.setColor('#09fff2')
    if(cmd.name) embed.setAuthor(`Help | ${cmd.name}`, client.user.displayAvatarURL())
    if(cmd.description) embed.addField('Description', cmd.description)
    if(cmd.usage) embed.addField('Usage', `${prefix}${cmd.usage}`)
    if(cmd.aliases) embed.addField('Aliases', cmd.aliases.join(', '))


    return message.channel.send(embed);
}
