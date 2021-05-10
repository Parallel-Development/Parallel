const Discord = require('discord.js')
let cooldown = false;

module.exports = {
    name: 'story',
    deprecated: true,
    async execute(client, message, args) {

        if(!cooldown) return
        else {
            cooldown = true;
            setTimeout(() => { 
                cooldown = false;
            }, 3600000)
        }
    

        message.channel.send(`The Fall - A story by Piyeris

        Someone had logged onto Discord, for the 3rd time since creation of their account\n They last logged in yesterday\n
        Out of no where, he managed to join the Discord server Razor Development\n
        The owner was, to say the least, confused. How would someone, with such a new account, join the server. So, he asked\n
        "Where did you find this server?", Piyeris asked. He assumed it was an alternate account\n
        For a few minutes there was no response, until finally, he began to type\n
        His response.. horrified Piyeris. The message read his full name, location, IP, family information, and a terrible private photo\n
        So Piyeris instantly deleted the information. He was about the ban the user, but the user sent a message quickly\n
        "Give me two thousand dollars and this information is kept private", said the mysterious user, who, by the way, their name was "Grav"\n
        Piyeris did not know what to do, he didn\'t have that money. He began to panic. A dark thought flashed in his head\n
        Goddamnit, no, I can\'t do that. He knew what had to be done - he had to get vengence\n\n\n
        2 PM EST - New York City | Grav logged onto his PC. He opened Discord, to see he was logged out\n
        He logged back in, confused, to see DM\'s from multiple people he knew online. He saw unfimiliar DM\'s from himself\n
        He was shocked with horror to see he had sent private images to them, images that are not safe..\n
        So what did Grav do?\n
        Part 2 soon...`)
    }
}