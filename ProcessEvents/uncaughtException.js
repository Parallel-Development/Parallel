console.errorLogs = [];

module.exports = {
    name: 'uncaughtException',
    execute(error) {
        console.error(error);
        if (!console.errorLogs.includes(error.stack)) console.errorLogs.push(error.stack);
    }
};