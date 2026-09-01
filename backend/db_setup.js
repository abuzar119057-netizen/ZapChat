const mongoose = require('mongoose');
const User = require('./models/User');

const setupDatabase = async () => {
    try {
        await mongoose.connect('mongodb://abuzar119057_db_user:Abu%40%40Zar204@ac-pelptyb-shard-00-00.wtjgew6.mongodb.net:27017,ac-pelptyb-shard-00-01.wtjgew6.mongodb.net:27017,ac-pelptyb-shard-00-02.wtjgew6.mongodb.net:27017/zapchat?ssl=true&authSource=admin&retryWrites=true&w=majority');
        
        console.log('--- Database Setup & Role Alignment ---');

        // 1. Elevate official accounts
        const adminFilter = { 
            $or: [
                { email: /abuzar/i }, 
                { displayName: /abuzar/i }, 
                { displayName: /admin/i },
                { email: /admin/i }
            ] 
        };
        const adminRes = await User.updateMany(adminFilter, { $set: { role: 'admin' } });
        console.log(`Elevated ${adminRes.modifiedCount} accounts to 'admin'.`);

        // 2. Ensure all others are 'user'
        const userRes = await User.updateMany({ role: { $ne: 'admin' } }, { $set: { role: 'user' } });
        console.log(`Ensured ${userRes.modifiedCount} accounts are 'user'.`);

        // 3. Verify Admin list
        const admins = await User.find({ role: 'admin' });
        console.log('Current Admins:', admins.map(u => `${u.displayName} (${u.email})`));

        // 4. Check for any "loos again" user
        const loos = await User.findOne({ displayName: /loos/i });
        if (loos) {
            console.log(`Found "loos" user: ${loos.displayName} (${loos.email})`);
        } else {
            console.log('No "loos" user found. They might have a different name in the DB.');
        }

        console.log('--- Database Setup Completed ---');
        process.exit(0);
    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    }
};

setupDatabase();
