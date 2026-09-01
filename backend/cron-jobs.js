const cron = require('node-cron');
const ScheduledMessage = require('./models/ScheduledMessage');
const Message = require('./models/Message');

const setupCronJobs = (io) => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            // Find messages scheduled up to now that are still pending
            const pendingMessages = await ScheduledMessage.find({
                executeAt: { $lte: now },
                status: 'pending'
            }).populate('senderId', 'displayName profilePicture')
              .populate('groupId', 'name icon');

            for (const schedMsg of pendingMessages) {
                try {
                    // Create the actual message
                    const newMessage = new Message({
                        sender: schedMsg.senderId._id,
                        groupId: schedMsg.groupId._id,
                        content: schedMsg.content,
                        type: 'text',
                        status: 'sent'
                    });
                    await newMessage.save();

                    const populatedMessage = await Message.findById(newMessage._id)
                        .populate('sender', 'displayName profilePicture')
                        .populate('groupId', 'name icon');

                    // Broadcast
                    io.to(`group:${schedMsg.groupId._id}`).emit('receive_message', populatedMessage);

                    // Mark scheduled message as sent
                    schedMsg.status = 'sent';
                    await schedMsg.save();
                } catch (err) {
                    console.error(`Failed to process scheduled message ${schedMsg._id}`, err);
                    schedMsg.status = 'failed';
                    await schedMsg.save();
                }
            }
        } catch (error) {
            console.error('Cron job error:', error);
        }
    });
};

module.exports = setupCronJobs;
