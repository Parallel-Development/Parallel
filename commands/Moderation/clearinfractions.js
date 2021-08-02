const Discord = require('discord.js');
const warningSchema = require('../../schemas/warning-schema')

module.exports = {
    name: 'clearinfractions',
    description: 'Clears all infractions from a user',
    usage: 'clearinfractions [user]\nclearwarn [user] <warning type: manual | auto | all>',
    aliases: ['clearwarnings', 'clearuserwarnings', 'clearuserinfractions', 'clearwarn', 'clearwarns'],
    permissions: 'MANAGE_GUILD',
    async execute(client, message, args)  {

        if(!args[0]) return message.channel.send(client.config.errorMessages.missing_argument_user);

        const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => { });
        if(!user) return message.channel.send(client.config.errorMessages.invalid_user);

        const userWarnings = await warningSchema.findOne({
            guildID: message.guild.id,
            warnings: {
                $elemMatch: {
                    userID: user.id
                }
            }
        })

        if(!userWarnings || !userWarnings.warnings.length) return message.channel.send('This user has no infractions');

        let filter = args[1];
        if(!(filter === 'manual' || filter === 'auto' || filter === 'all')) filter = 'all';

        switch(filter) {
            case 'all':
                await warningSchema.updateMany({
                    guildID: message.guild.id,
                    warnings: {
                        $elemMatch: {
                            userID: user.id
                        }
                    }
                },
                    {
                        $pull: {
                            warnings: {
                                userID: user.id
                            }
                        }
                    })

                const all = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setDescription(`${client.config.emotes.success} All infractions have been removed from **${user.tag}**`)

                return message.channel.send(all);
                break;
            case 'manual':
                await warningSchema.updateMany({
                    guildID: message.guild.id,
                    warnings: {
                        $elemMatch: {
                            userID: user.id,
                            auto: false
                        }
                    }
                },
                    {
                        $pull: {
                            warnings: {
                                userID: user.id
                            }
                        }
                    })

                const manual = new Discord.MessageEmbed()
                    .setColor(client.config.colors.main)
                    .setDescription(`${client.config.emotes.success} All manual infractions have been removed from **${user.tag}**`)

                return message.channel.send(manual);
                break;
            case 'auto':
                await warningSchema.updateMany({
                    guildID: message.guild.id,
                    warnings: {
                        $elemMatch: {
                            userID: user.id,
                            auto: true
                        }
                    }
                },
                    {
                        $pull: {
                            warnings: {
                                userID: user.id
                            }
                        }
                    })

                const auto = new Discord.MessageEmbed()
                    .setColor(client.config.colors.main)
                    .setDescription(`${client.config.emotes.success} All auto infractions have been removed from **${user.tag}**`)

                return message.channel.send(auto);
                break;
        }
    }
}