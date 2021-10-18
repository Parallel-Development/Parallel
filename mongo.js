const mongoose = require('mongoose');
const mongoPath = require('./config.json').mongoURL;

module.exports = async () => {
    await mongoose.connect(mongoPath, {
        keepAlive: true,
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    return mongoose;
};
