const Discord = require('discord.js')
const warningSchema = require('../../schemas/warning-schema')

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

            let moderatorID;
            let userid;

            for (const i of check.warnings) {
                if (i.code == code) {
                    moderatorID = i.moderatorID;
                    userid = i.userid
                }
            }
            if (moderatorID !== message.author.id && !message.member.hasPermission('MANAGE_GUILD')) {
                return message.channel.send('You can only delete warnings that you gave. You need the `Manage Guild` permission to delete other warnings')
            }

            await warningSchema.updateOne({
                guildid: message.guild.id,
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