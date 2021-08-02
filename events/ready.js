module.exports = {
    name: 'ready',
    once: true,
    execute(client) { 
        client.user.setActivity('>help', { type: 'LISTENING'} )
        return console.log(`Logged in as ${client.user.tag}!`);
    }
}