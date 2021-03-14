const Discord = require('discord.js')
const { execute } = require('./warn')
const ms = require('ms')

module.exports = {
    name: 'test',
    async execute(client, message, args) {
        const user = message.mentions.users.first()
        let reason;
        let rawTime = args[1]
        let time = ms(rawTime)
        if(isNaN(time)) {
            reason = args.splice(1).join(' ')
            rawTime = 'never'
        } else {
            reason = args.splice(2).join(' ')
        }

        message.channel.send(`${user}, ${reason}, expires: ${rawTime}`)
    } 
}