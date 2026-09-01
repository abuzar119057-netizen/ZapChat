const mongoose = require('mongoose');
const User = require('./models/User');
const Contact = require('./models/Contact');
const Message = require('./models/Message');
const Call = require('./models/Call');
const Story = require('./models/Story');
const Group = require('./models/Group');
const ScheduledMessage = require('./models/ScheduledMessage');
const Report = require('./models/Report');
const AccountReport = require('./models/AccountReport');
require('dotenv').config();

const clearDb = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const userRes = await User.deleteMany({});
        console.log(`- Deleted ${userRes.deletedCount} Users`);

        const contactRes = await Contact.deleteMany({});
        console.log(`- Deleted ${contactRes.deletedCount} Contacts`);

        const messageRes = await Message.deleteMany({});
        console.log(`- Deleted ${messageRes.deletedCount} Messages`);

        const callRes = await Call.deleteMany({});
        console.log(`- Deleted ${callRes.deletedCount} Calls`);

        const storyRes = await Story.deleteMany({});
        console.log(`- Deleted ${storyRes.deletedCount} Stories`);

        const groupRes = await Group.deleteMany({});
        console.log(`- Deleted ${groupRes.deletedCount} Groups`);

        const schedRes = await ScheduledMessage.deleteMany({});
        console.log(`- Deleted ${schedRes.deletedCount} Scheduled Messages`);

        const reportRes = await Report.deleteMany({});
        console.log(`- Deleted ${reportRes.deletedCount} Reports`);

        const accReportRes = await AccountReport.deleteMany({});
        console.log(`- Deleted ${accReportRes.deletedCount} Account Reports`);

        console.log('🎉 All user data and records cleared successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error clearing database:', err);
        process.exit(1);
    }
};

clearDb();
