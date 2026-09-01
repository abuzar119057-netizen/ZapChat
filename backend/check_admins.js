const mongoose = require('mongoose');
const User = require('./models/User');

const checkAdmins = async () => {
    await mongoose.connect('mongodb://abuzar119057_db_user:Abu%40%40Zar204@ac-pelptyb-shard-00-00.wtjgew6.mongodb.net:27017,ac-pelptyb-shard-00-01.wtjgew6.mongodb.net:27017,ac-pelptyb-shard-00-02.wtjgew6.mongodb.net:27017/zapchat?ssl=true&authSource=admin&retryWrites=true&w=majority');
    
    const users = await User.find({ displayName: { $in: ['Abu Zar', 'loos again'] } });
    console.log('--- User Role Status ---');
    users.forEach(u => {
        console.log(`User: ${u.displayName}, ID: ${u._id}, Role: ${u.role}`);
    });
    
    // Force set them to admin if they are found
    if(users.length > 0) {
        const res = await User.updateMany(
            { displayName: { $in: ['Abu Zar', 'loos again'] } },
            { $set: { role: 'admin' } }
        );
        console.log('Update Result:', res);
    }
    
    process.exit();
};

checkAdmins();
