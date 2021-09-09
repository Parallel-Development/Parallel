const Discord = require('discord.js');
const settingsSchema = require('../../schemas/settings-schema');
const automodSchema = require('../../schemas/automod-schema');
const lockSchema = require('../../schemas/lock-schema');
const punishmentSchema = require('../../schemas/punishment-schema');
const systemSchema = require('../../schemas/system-schema');
const warningSchema = require('../../schemas/warning-schema');

const cooldown = new Set();

module.exports = {
    name: 'request-my-data',
    description: 'Be able to download a json file of your data to view what data we have stored for your server',
    usage: 'request-my-data (data)\nrequest-my-data (data) --dm\n\nPossible data options:\n\n> settings\n> automod\n> warnings\n> punishments\n> punishment-system\n> locks',
    aliases: ['request'],
    requiredBotPermission: 'ATTACH_FILES',
    async execute(client, message, args) {
        if (message.author.id !== message.guild.ownerId) return await client.util.throwError(message, 'This command is restricted to the server owner');
        if (cooldown.has(message.guild.id)) return await client.util.throwError(message, 'This command has a 30 second cooldown!')
        else {
            cooldown.add(message.guild.id);
            setTimeout(() => cooldown.delete(message.guild.id), 30000)
        }

        if (!args[0]) return await client.util.throwError(message, 'Please specify the data you want to request')
        const dataOption = args[0];
        const DM = args[1] === '--dm' ? true : false;
        let _data; 

        switch (dataOption) {
            case 'settings':
                _data = await settingsSchema.findOne({ guildID: message.guild.id })
                break;
            case 'automod':
                _data = await automodSchema.findOne({ guildID: message.guild.id });
                break;
            case 'warnings':
                _data = await warningSchema.findOne({ guildID: message.guild.id });
                break;
            case 'punishments':
                _data = await punishmentSchema.find({ guildID: message.guild.id })
                break;
            case 'punishment-system':
                _data = await systemSchema.findOne({ guildID: message.guild.id });
                break;
            case 'locks':
                _data = await lockSchema.findOne({ guildID: message.guild.id });
                break;
            default:
                return await client.util.throwError(message, 'Unknown data option, please view the help of this command for a list of the data you can request')
        }

        let data = Buffer.from(JSON.stringify(_data, null, 2));
        const attachment = new Discord.MessageAttachment(data, `${dataOption}.json`);
        if (DM) {
            message.react('✅').catch(() => message.reply('Attempted to send data to your DM\'s'))
            return message.author.send(
                { content: `Here\'s all the currently stored data for \`${dataOption}\`! If you would like to request a change in data, feel free to ask in the support server: <https://discord.gg/v2AV3XtnBM>`,
                files: [attachment] }
            ).catch(() => message.reply('Failed to send you the requested data. Are your DM\'s closed?'))
        } else {
            return message.reply(
                { content: `Here\'s all the currently stored data for \`${dataOption}\`! If you would like to request a change in data, feel free to ask in the support server: <https://discord.gg/v2AV3XtnBM>`,
                files: [attachment] }
            ).catch(() => message.reply('Failed to send you the requested data. Are your DM\'s closed?'))
        }
    }
}