const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Contact = require('./models/Contact');
const Message = require('./models/Message');
const Group = require('./models/Group');
const Story = require('./models/Story');
const Call = require('./models/Call');
require('dotenv').config();

const usersData = [
  { email: 'jane.smith@example.com', displayName: 'Jane Smith', about: 'Living my best life \u2728', status: 'online', phone: '+1234567890' },
  { email: 'michael.j@example.com', displayName: 'Michael Johnson', about: 'Coffee and code \u2615\uFE0F\uD83D\uDCBB', status: 'away', phone: '+1987654321' },
  { email: 'sarah.connor@example.com', displayName: 'Sarah Connor', about: 'No fate but what we make.', status: 'offline', phone: '+1122334455' },
  { email: 'alex.dev@example.com', displayName: 'Alex Developer', about: 'Building awesome apps!', status: 'online', phone: '+1555666777' },
  { email: 'emma.watson@example.com', displayName: 'Emma Watson', about: 'Reading books \uD83D\uDCDA', status: 'offline', phone: '+1999888777' }
];

const seedDatabase = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://abuzar119057_db_user:Abu%40%40Zar204@ac-pelptyb-shard-00-00.wtjgew6.mongodb.net:27017,ac-pelptyb-shard-00-01.wtjgew6.mongodb.net:27017,ac-pelptyb-shard-00-02.wtjgew6.mongodb.net:27017/zapchat?ssl=true&authSource=admin&retryWrites=true&w=majority');
        console.log('Connected!');

        console.log('--- Generating Base Data ---');

        // 1. Get or Create an Admin user (main user to attach data to)
        let adminUser = await User.findOne({ $or: [{ email: /abuzar/i }, { role: 'admin' }] });
        if (!adminUser) {
            console.log('No admin found. Creating default admin@zapchat.com');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            adminUser = new User({
                email: 'admin@zapchat.com',
                password: hashedPassword,
                displayName: 'Admin User',
                role: 'admin',
                about: 'Admin of ZapChat!'
            });
            await adminUser.save();
        } else {
            console.log(`Using existing admin: ${adminUser.email}`);
        }

        // 2. Create realistic users
        const createdUsers = [];
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        for (const data of usersData) {
            let u = await User.findOne({ email: data.email });
            if (!u) {
                u = new User({ ...data, password: hashedPassword, role: 'user' });
                await u.save();
                console.log(`Created user: ${u.displayName}`);
            }
            createdUsers.push(u);
        }

        // 3. Create Contacts for the Admin
        for (const u of createdUsers) {
            const existingContact = await Contact.findOne({ user: adminUser._id, contact: u._id });
            if (!existingContact) {
                await Contact.create({ user: adminUser._id, contact: u._id, status: 'accepted' });
                await Contact.create({ user: u._id, contact: adminUser._id, status: 'accepted' });
                console.log(`Created mutual contact between Admin and ${u.displayName}`);
            }
        }

        // 4. Create direct messages
        const msgs = [
            "Hey! How are you doing?",
            "Did you see the latest update?",
            "I'm working on a cool project right now.",
            "Let's catch up later today.",
            "Sounds good!"
        ];

        for (const u of createdUsers) {
            // Check if messages already exist
            const existMsgs = await Message.findOne({
                $or: [
                    { sender: adminUser._id, recipient: u._id },
                    { sender: u._id, recipient: adminUser._id }
                ]
            });
            
            if (!existMsgs) {
                await Message.create({ sender: u._id, recipient: adminUser._id, content: msgs[Math.floor(Math.random() * msgs.length)], status: 'read' });
                await Message.create({ sender: adminUser._id, recipient: u._id, content: msgs[Math.floor(Math.random() * msgs.length)], status: 'delivered' });
                console.log(`Seeded messages for ${u.displayName}`);
            }
        }

        // 5. Create a Group and Group Messages
        let devGroup = await Group.findOne({ name: 'Developers Lounge' });
        if (!devGroup) {
            devGroup = await Group.create({
                name: 'Developers Lounge',
                description: 'A place to discuss code and coffee.',
                members: [adminUser._id, ...createdUsers.map(u => u._id)],
                admins: [adminUser._id],
                createdBy: adminUser._id
            });
            console.log(`Created Group: Developers Lounge`);

            await Message.create({ sender: adminUser._id, groupId: devGroup._id, content: 'Welcome to the Developers Lounge!' });
            await Message.create({ sender: createdUsers[0]._id, groupId: devGroup._id, content: 'Glad to be here \uD83D\uDE04' });
            await Message.create({ sender: createdUsers[1]._id, groupId: devGroup._id, content: 'Anyone working on React right now?' });
        }

        // 6. Create Calls (Missed, Ongoing, Completed)
        const recentCall = await Call.findOne({ caller: adminUser._id });
        if (!recentCall) {
            await Call.create({ caller: adminUser._id, participants: [createdUsers[0]._id], type: 'video', status: 'missed', duration: 0 });
            await Call.create({ caller: createdUsers[1]._id, participants: [adminUser._id], type: 'audio', status: 'completed', duration: 145 });
            console.log('Seeded Call Logs');
        }

        // 7. Create Stories (Text & dummy images)
        const recentStory = await Story.findOne({ user: adminUser._id });
        if (!recentStory) {
            // Just simulate a text story to avoid needing real GridFS files
            const dummyObjectId = new mongoose.Types.ObjectId();
            await Story.create({
                user: adminUser._id,
                mediaType: 'text',
                fileId: dummyObjectId,
                caption: 'Excited to release this new update!',
                bgColor: '#6A5ACD',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });

            await Story.create({
                user: createdUsers[0]._id,
                mediaType: 'text',
                fileId: new mongoose.Types.ObjectId(),
                caption: 'What a beautiful day \u2600\uFE0F',
                bgColor: '#FF8C00',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });
            console.log('Seeded Stories');
        }

        console.log('--- Database Seeding Completed Successfully! ---');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

seedDatabase();
