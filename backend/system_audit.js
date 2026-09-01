const mongoose = require('mongoose');
const Message = require('./models/Message');
const User = require('./models/User');
const Contact = require('./models/Contact');

const runAudit = async () => {
    try {
        await mongoose.connect('mongodb://abuzar119057_db_user:Abu%40%40Zar204@ac-pelptyb-shard-00-00.wtjgew6.mongodb.net:27017,ac-pelptyb-shard-00-01.wtjgew6.mongodb.net:27017,ac-pelptyb-shard-00-02.wtjgew6.mongodb.net:27017/zapchat?ssl=true&authSource=admin&retryWrites=true&w=majority');
        console.log('--- Database Audit Started ---');

        // 1. Check for Users without roles
        const usersWithoutRole = await User.find({ role: { $exists: false } });
        console.log(`Users without roles: ${usersWithoutRole.length}`);
        if (usersWithoutRole.length > 0) {
            await User.updateMany({ role: { $exists: false } }, { $set: { role: 'user' } });
            console.log('Fixed: Assigned "user" role to all users without one.');
        }

        // 2. Check for Admin users
        const admins = await User.find({ role: 'admin' });
        console.log(`Admin users found: ${admins.map(a => a.displayName).join(', ') || 'NONE'}`);

        // 3. Check for Orphaned Messages (No sender or recipient/group)
        const orphanedMessages = await Message.find({ 
            $or: [
                { sender: null }, 
                { recipient: null, groupId: null, isSystem: { $ne: true } }
            ] 
        });
        console.log(`Orphaned messages: ${orphanedMessages.length}`);

        // 4. Check for duplicate contacts
        const allContacts = await Contact.find();
        const contactPairs = new Set();
        let duplicates = 0;
        for (const c of allContacts) {
            const pair = `${c.user}_${c.contact}`;
            if (contactPairs.has(pair)) {
                duplicates++;
                await Contact.findByIdAndDelete(c._id);
            } else {
                contactPairs.add(pair);
            }
        }
        console.log(`Duplicate contacts removed: ${duplicates}`);

        // 5. Check for messages with missing actual User documents
        const messages = await Message.find().limit(100).sort({ createdAt: -1 });
        let invalidUsersCount = 0;
        for (const m of messages) {
            const senderExists = await User.exists({ _id: m.sender });
            if (!senderExists) invalidUsersCount++;
        }
        console.log(`Sample check: Invalid senders in last 100 messages: ${invalidUsersCount}`);

        console.log('--- Audit Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('Audit failed:', error);
        process.exit(1);
    }
};

runAudit();
