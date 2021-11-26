console.errorLogs = [];

process.on('uncaughtException', error => {
    console.error(error);
    if (!console.errorLogs.includes(error.stack)) console.errorLogs.push(error.stack);
});
