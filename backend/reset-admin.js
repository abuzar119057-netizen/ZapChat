const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const updated = await User.findOneAndUpdate(
            { email: 'admin@zapchat.com' },
            { password: hashedPassword },
            { new: true }
        );

        if (updated) {
            console.log('✅ Admin password reset to: admin123');
            console.log('Email: admin@zapchat.com');
        } else {
            console.log('❌ Admin user not found. Creating one...');
            await User.create({
                email: 'admin@zapchat.com',
                password: hashedPassword,
                displayName: 'Admin User',
                role: 'admin'
            });
            console.log('✅ Admin user created with password: admin123');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

resetAdmin();
