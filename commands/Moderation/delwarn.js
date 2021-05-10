const Discord = require('discord.js')
const warningSchema = require('../../schemas/warning-schema')
const settingsSchema = require('../../schemas/settings-schema');
const punishmentSchema = require('../../schemas/punishment-schema');

module.exports = {
    name: 'delwarn',
    description: 'Deletes a warning from a user',
    permissions: 'MANAGE_MESSAGES',
    moderationCommand: true,
    usage: 'delwarn <code>',
    aliases: ['deleteinfraction', 'delinfraction', 'rmpunish', 'deletepunish', 'removepunish', 'rmwarn', 'removewarn'],
    async execute(client, message, args) {

        const missingargcode = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription('Please specify a punishment to delete')
        
        let code = args[0]
        if (!code) return message.channel.send(missingargcode)

        const check = await warningSchema.findOne({
            guildid: message.guild.id,
            warnings: {
                $elemMatch: {
                    code: code
                }
            }
        })
        if (check) {

            const { userid, moderatorID } = check

            if(moderatorID !== message.author.id && !message.member.hasPermission('ADMINISTRATOR')) {
                return message.channel.send('You can only delete warnings that you gave. You need the `Administrator` permission to delete other warnings')
            }

            await warningSchema.updateOne({
                guildid: message.guild.id,
                userid: userid,
                warnings: {
                    $elemMatch: {
                        code: code
                    }
                }

            },
            {
                $pull: {
                    warnings: {
                        code: code
                    }
                }
            })

            const delwarnembed = new Discord.MessageEmbed()
                .setColor('#09fff2')
                .setDescription(`Successfully deleted punishment \`${code}\``)

            message.channel.send(delwarnembed)
        } else {

            const noID = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setDescription(`No punishment with the ID \`${code}\` exists on this server`)

            message.channel.send(noID)
            return;
        }

        let date = new Date();
        date = date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();

    }
}