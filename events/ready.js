module.exports = {
    name: 'ready',
    once: true,
    async execute(client) { 
        client.user.setActivity('>help', { type: 'LISTENING'} )
        console.log(`Logged in as ${client.user.tag}!`);
        if (global.void === true) console.log('Bot is in void mode')

        return;
    }
}