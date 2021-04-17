const Discord = require('discord.js')
const warningSchema = require('../../schemas/warning-schema')

module.exports = {
    name: 'reason',
    description: 'Changes the reason of a punishment',
    permissions: 'MANAGE_MESSAGES',
    moderationCommand: true,
    usage: 'reason (code) [New Reason]',
    async execute(client, message, args) {

        const noCode = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('Please specify a punishment ID to change the reason of')

        const code = args[0]
        if(!code) return message.channel.send(noCode)

        const newReason = args.splice(1).join(' ')

        const codeNotFound = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription(`No punishment found on this server with the ID \`${code}\``)

        const codeExists = await warningSchema.findOne({
            guildid: message.guild.id,
            warnings: {
                $elemMatch: {
                    code: code
                }
            }
        })

        if(!codeExists) return message.channel.send(codeNotFound)

        const noReason = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('Please specify the new reason for this punishment')
        
        if(!newReason) return message.channel.send(noReason)

        await warningSchema.updateOne({
            guildid: message.guild.id,
            warnings: {
                $elemMatch: {
                    code: code
                }
            }
        },
        {
            $set: {
                'warnings.$.reason': newReason
            }
        })

        const updatedReason = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setDescription(`Successfully changed the reason for punishment \`${code}\``)

        message.channel.send(updatedReason)

    }
}