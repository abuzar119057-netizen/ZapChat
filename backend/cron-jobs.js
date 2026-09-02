const cron = require('node-cron');
const https = require('https');
const http = require('http');
const ScheduledMessage = require('./models/ScheduledMessage');
const Message = require('./models/Message');

const setupCronJobs = (io) => {
    // 1. 24/7 Self-Ping Keep-Alive Heartbeat (Runs every 4 minutes)
    // Prevents Back4App free container from sleeping or destroying domain due to inactivity
    cron.schedule('*/4 * * * *', () => {
        const liveUrl = process.env.LIVE_BACKEND_URL || 'https://zapchat1-vbymlxsu.b4a.run';
        try {
            if (liveUrl.startsWith('https')) {
                https.get(`${liveUrl}/health`, (res) => {
                    console.log(`[Keep-Alive] 24/7 Heartbeat pinged ${liveUrl}/health - Status: ${res.statusCode}`);
                }).on('error', (err) => {
                    console.warn(`[Keep-Alive] Ping warning: ${err.message}`);
                });
            } else {
                http.get(`${liveUrl}/health`, (res) => {
                    console.log(`[Keep-Alive] Heartbeat pinged local - Status: ${res.statusCode}`);
                }).on('error', () => {});
            }
        } catch (e) {
            console.warn('[Keep-Alive] Heartbeat exception:', e);
        }
    });
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
