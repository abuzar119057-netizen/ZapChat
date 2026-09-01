const mongoose = require('mongoose');
const Message = require('./models/Message');
const User = require('./models/User');

const run = async () => {
    await mongoose.connect('mongodb://abuzar119057_db_user:Abu%40%40Zar204@ac-pelptyb-shard-00-00.wtjgew6.mongodb.net:27017,ac-pelptyb-shard-00-01.wtjgew6.mongodb.net:27017,ac-pelptyb-shard-00-02.wtjgew6.mongodb.net:27017/zapchat?ssl=true&authSource=admin&retryWrites=true&w=majority');
    
    const contactId = '69e13597d0082d8ebe5aa964'; // Loos Again
    const adminId = '69e06bccbadccf4203c72df1'; // Abu Zar
    
    const messages = await Message.find({
        $or: [
            { sender: adminId, recipient: contactId },
            { sender: contactId, recipient: adminId }
        ]
    });
    
    console.log('Total Messages found between Admin and User:', messages.length);
    if (messages.length > 0) {
        console.log('Sample Message:', messages[0].content);
        console.log('Sender:', messages[0].sender);
        console.log('Recipient:', messages[0].recipient);
    }
    
    process.exit();
};

run();
