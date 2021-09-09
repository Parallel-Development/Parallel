module.exports = {
    name: 'docs',
    description: 'Send a link to Parallel\'s documentation',
    usage: 'docs',
    aliases: ['documentation', 'readthedocs'],
    async execute(client, message, args) {
        return message.reply('Parallel\'s official documentation is found at this page: https://paralleldiscordbot.gitbook.io/parallel/')
    }
}