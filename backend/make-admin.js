const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const makeAdmin = async () => {
    // Read email from CLI argument, default to abuzarit@gmail.com
    const email = (process.argv[2] || 'abuzarit@gmail.com').toLowerCase();
    
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const user = await User.findOne({ email });
        if (!user) {
            console.log(`\n❌ User with email "${email}" not found in database.`);
            console.log('👉 Please register this user account in the app first, then run this script to make them an admin:\n');
            console.log(`   node make-admin.js ${email}\n`);
            process.exit(1);
        }

        user.role = 'admin';
        await user.save();
        console.log(`\n🎉 Successfully promoted "${email}" to Admin role!\n`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error promoting user:', err);
        process.exit(1);
    }
};

makeAdmin();
