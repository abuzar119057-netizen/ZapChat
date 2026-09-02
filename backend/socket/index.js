const jwt = require('jsonwebtoken');
const { sendPushNotification } = require('../utils/push');
const User = require('../models/User');
const Message = require('../models/Message');
const Group = require('../models/Group');

// In-memory store for connected users: { userId: Set(socketIds) }
const connectedUsers = new Map();

// Structure: { "groupId-userId": timestamp, ... }
const slowModeTimers = new Map();

// Structure: { callId: Set(userIds) }
const activeCalls = new Map();


// Helper to determine if a recipient is online
const getRecipientRoom = (recipientId) => {
    return `user:${recipientId}`;
};

const setupSocket = (io) => {
    // Middleware for Auth
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
            const user = await User.findById(decoded.id).select('displayName profilePicture role isSuspended');
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }
            if (user.isSuspended) {
                return next(new Error('Authentication error: Account suspended'));
            }
            socket.user = {
                id: decoded.id,
                email: decoded.email,
                displayName: user.displayName,
                profilePicture: user.profilePicture,
                role: user.role
            };
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.user.id;
        
        // Join a room specific to this user for multi-instance messaging
        socket.join(`user:${userId}`);
        
        // Join rooms for all groups this user is a member of
        try {
            const userGroups = await Group.find({ members: userId }).select('_id');
            userGroups.forEach(group => {
                socket.join(`group:${group._id}`);
                console.log(`User ${userId} joined room group:${group._id}`);
            });
        } catch (err) {
            console.error('Error joining group rooms:', err);
        }
        
        // Add to connected users tracking
        if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
            
            // First instance connecting: update status and broadcast
            try {
                await User.findByIdAndUpdate(userId, { status: 'online' });
                socket.broadcast.emit('user_status', { userId, status: 'online' });
            } catch (error) {
                console.error('Error updating user status to online on connection:', error);
            }
        }
        
        connectedUsers.get(userId).add(socket.id);

        // Send list of all currently online users to the newly connected user
        const onlineUserIds = Array.from(connectedUsers.keys());
        socket.emit('initial_online_users', onlineUserIds.map(id => ({
            userId: id,
            status: 'online'
        })));

        // Delivery Sync: Update all pending 'sent' messages for this user to 'delivered'
        try {
            const undeliveredMessages = await Message.find({
                recipient: userId,
                status: 'sent'
            });

            if (undeliveredMessages.length > 0) {
                const messageIds = undeliveredMessages.map(m => m._id);
                await Message.updateMany(
                    { _id: { $in: messageIds } },
                    { $set: { status: 'delivered' } }
                );

                // Group by sender and notify them
                const messagesBySender = {};
                undeliveredMessages.forEach(m => {
                    const sId = m.sender.toString();
                    if (!messagesBySender[sId]) messagesBySender[sId] = [];
                    messagesBySender[sId].push(m._id);
                });

                Object.keys(messagesBySender).forEach(sId => {
                    const senderRoom = getRecipientRoom(sId);
                    io.to(senderRoom).emit('messages_delivered', {
                        messageIds: messagesBySender[sId],
                        recipientId: userId
                    });
                });
            }
        } catch (error) {
            console.error('Delivery sync error:', error);
        }

        // Helper to check global system settings from an admin user
        const getGlobalSettings = async () => {
            const adminUser = await User.findOne({ role: 'admin' }).select('settings');
            return adminUser?.settings || {};
        };

        // Handle sending messages (including file metadata if attached)
        socket.on('send_message', async (data, callback) => {
            try {
                const { recipientId, content, fileId, fileMetadata, clientId, type } = data;
                
                // 🔐 GLOBAL SYSTEM CHECKS
                const globalSettings = await getGlobalSettings();
                const isUserAdmin = socket.user.role === 'admin';

                if (globalSettings.maintenanceMode && !isUserAdmin) {
                    throw new Error('🔧 System is currently under maintenance. Only admins can send messages.');
                }

                if (content && content.length > (globalSettings.maxMessageLength || 5000)) {
                    throw new Error(`🚫 Message too long! Maximum allowed is ${globalSettings.maxMessageLength || 5000} characters.`);
                }

                if (globalSettings.globalSlowMode > 0 && !isUserAdmin) {
                    const lastMsgTime = slowModeTimers.get(`global:${userId}`) || 0;
                    const elapsed = (Date.now() - lastMsgTime) / 1000;
                    if (elapsed < globalSettings.globalSlowMode) {
                        throw new Error(`⏳ Slow mode is active. Wait ${Math.ceil(globalSettings.globalSlowMode - elapsed)}s.`);
                    }
                    slowModeTimers.set(`global:${userId}`, Date.now());
                }
                
                // Save message to DB
                const newMessage = new Message({
                    sender: userId,
                    recipient: recipientId,
                    content,
                    type: type || 'text',
                    fileId,
                    fileMetadata,
                    expiresAt: data.expiresAt || null,
                    status: 'sent',
                    replyTo: data.replyTo || null
                });
                await newMessage.save();

                const populatedMessage = await Message.findById(newMessage._id)
                    .populate('sender', 'displayName profilePicture')
                    .populate('recipient', 'displayName profilePicture')
                    .populate({
                        path: 'replyTo',
                        populate: { path: 'sender', select: 'displayName' }
                    });

                const recipientRoom = getRecipientRoom(recipientId);
                const senderRoom = getRecipientRoom(userId);
                const isRecipientOnline = connectedUsers.has(recipientId);

                if (isRecipientOnline) {
                    // Update status to delivered if online
                    populatedMessage.status = 'delivered';
                    await populatedMessage.save();

                    // Emit to all instances of the recipient
                    await sendPushNotification(recipientId, {
        notification: {
          title: 'New Message',
          body: `${socket.user.displayName}: ${content.slice(0, 100)}`
        },
        data: { type: 'new_message', chatId: recipientId, messageId: newMessage._id.toString() }
      });
                    // Emit notification
                    io.to(recipientRoom).emit('notification', { 
                        type: 'new_message', 
                        message: 'You have a new message' 
                    });
                }

                // Also emit to all instances of the sender so they see it in real-time
                io.to(senderRoom).emit('receive_message', populatedMessage);

                // Acknowledge back to sender
                if(callback) callback({ status: isRecipientOnline ? 'delivered' : 'sent', messageId: populatedMessage._id, clientId });

            } catch (error) {
                console.error('Send message error:', error);
                if(callback) callback({ error: error.message });
            }
        });
socket.on('message:new', async (msg) => {
  try {
    // Assume message is already saved
    await sendPushNotification(msg.receiverId, {
      notification: {
        title: 'New Message 💬',
        body: `${msg.senderName} sent you a message`
      },
      data: {
        type: 'new_message',
        chatId: msg.chatId,
        messageId: msg._id
      }
    });
  } catch (error) {
    console.log('FCM Error:', error);
  }
});

        // Group joining logic for real-time creation
        socket.on('join_group', (groupId) => {
            if (groupId) {
                socket.join(`group:${groupId}`);
                console.log(`Socket ${socket.id} (User ${socket.user.id}) manually joined group:${groupId}`);
            }
        });

        // Handle sending group messages
        socket.on('send_group_message', async (data, callback) => {
            try {
                const { groupId, content, fileId, fileMetadata, clientId, type } = data;
                
                // 🔐 GLOBAL SYSTEM CHECKS
                const globalSettings = await getGlobalSettings();
                const isUserAdmin = socket.user.role === 'admin';

                if (globalSettings.maintenanceMode && !isUserAdmin) {
                    throw new Error('🔧 System is currently under maintenance. Only admins can send messages.');
                }

                if (content && content.length > (globalSettings.maxMessageLength || 5000)) {
                    throw new Error(`🚫 Message too long! Max limit is ${globalSettings.maxMessageLength || 5000} characters.`);
                }
                
                // Permission Check
                const group = await Group.findById(groupId);
                if (!group) throw new Error('Group not found');

                if (group.bannedMembers && group.bannedMembers.includes(userId)) {
                    throw new Error('You are banned from this group');
                }

                // Admin Mute (Chat Ban) Check
                if (group.muteSettings && group.muteSettings.has(userId)) {
                    const mute = group.muteSettings.get(userId);
                    if (mute.muted && new Date(mute.until) > new Date()) {
                        throw new Error(`You have been muted in this group until ${new Date(mute.until).toLocaleString()}`);
                    }
                }

                const isAdmin = group.admins.includes(userId);
                
                if (!isAdmin) {
                    if (group.settings.messagingRestricted || group.settings.announcementMode) {
                        throw new Error('Only admins can send messages in this group');
                    }
                    if (type === 'text' && group.settings.allowText === false) throw new Error('Text messages disabled');
                    if (type === 'audio' && group.settings.allowVoice === false) throw new Error('Voice messages disabled');
                    if (['image', 'video'].includes(type) && group.settings.allowMedia === false) throw new Error('Media disabled');
                    if (type === 'file' && group.settings.allowFiles === false) throw new Error('Files disabled');
                    if (type === 'text' && group.settings.allowLinks === false && content.match(/https?:\/\//)) throw new Error('Links disabled');
                    if (type === 'text' && group.settings.allowEmojis === false && content.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)) throw new Error('Emojis disabled');

                    if (group.settings.slowMode > 0) {
                        const key = `${groupId}-${userId}`;
                        const lastSent = slowModeTimers.get(key) || 0;
                        if (Date.now() - lastSent < group.settings.slowMode * 1000) {
                            throw new Error(`Slow mode is active. Please wait ${group.settings.slowMode}s between messages.`);
                        }
                        slowModeTimers.set(key, Date.now());
                    }
                }

                let finalContent = content;
                if (group.settings.autoFilterBadWords && type === 'text' && finalContent) {
                    // Simple profanity list for demo
                    const badWords = ['badword', 'stupid', 'idiot', 'spam', 'scam', 'fuck', 'shit', 'bitch'];
                    const regex = new RegExp(badWords.join('|'), 'gi');
                    finalContent = finalContent.replace(regex, '***');
                }

                // Basic Spam Detection (Repetitive Content)
                if (group.settings.autoSpamDetection && !isAdmin && type === 'text') {
                    // Check if User sent exact same message in last 3 messages
                    const recentLogs = await Message.find({ groupId, sender: userId }).sort({ createdAt: -1 }).limit(3);
                    if (recentLogs.some(m => m.content === finalContent)) {
                        throw new Error('Spam detected! Please avoid sending repetitive messages.');
                    }
                }

                // Expiration Logic for disappearing messages
                let expiresAt = null;
                if (group.settings && group.settings.disappearingMessages > 0) {
                    expiresAt = new Date(Date.now() + (group.settings.disappearingMessages * 1000));
                }

                // Save message to DB
                const newMessage = new Message({
                    sender: userId,
                    groupId,
                    content: finalContent,
                    type: type || 'text',
                    fileId,
                    fileMetadata,
                    status: 'sent',
                    expiresAt,
                    replyTo: data.replyTo || null
                });
                await newMessage.save();

                const populatedMessage = await Message.findById(newMessage._id)
                    .populate('sender', 'displayName profilePicture')
                    .populate('groupId', 'name icon')
                    .populate({
                        path: 'replyTo',
                        populate: { path: 'sender', select: 'displayName' }
                    });

                // Broadcast to the group room
                io.to(`group:${groupId}`).emit('receive_message', populatedMessage);

                // Auto Responder Processing
                if (group.settings.autoReply && group.settings.autoReplyText && type !== 'system' && !newMessage.isSystem) {
                    // Prevent circular loops by not replying to other bots/system messages
                    setTimeout(async () => {
                        try {
                            const botMessage = new Message({
                                sender: group.createdBy || userId, // Send as creator
                                groupId,
                                content: `🤖 Auto-Reply:\n${group.settings.autoReplyText}`,
                                type: 'text',
                                status: 'sent',
                                isSystem: true
                            });
                            await botMessage.save();
                            const popBotMsg = await Message.findById(botMessage._id).populate('groupId', 'name icon');
                            io.to(`group:${groupId}`).emit('receive_message', popBotMsg);
                        } catch(e) { console.error('Auto reply error', e); }
                    }, 1500); // 1.5s delay
                }

                if(callback) callback({ status: 'sent', messageId: populatedMessage._id, clientId });

            } catch (error) {
                console.error('Send group message error:', error);
                if(callback) callback({ error: error.message });
            }
        });

        // Handle message reactions
        socket.on('send_reaction', async (data) => {
            try {
                const { messageId, emoji } = data;
                const msg = await Message.findById(messageId);
                if (!msg) return;

                const existingIdx = msg.reactions.findIndex(r => r.userId.toString() === userId);
                if (existingIdx > -1) {
                    if (msg.reactions[existingIdx].emoji === emoji) {
                        msg.reactions.splice(existingIdx, 1);
                    } else {
                        msg.reactions[existingIdx].emoji = emoji;
                    }
                } else {
                    msg.reactions.push({ userId, emoji });
                }

                await msg.save();

                const broadcastData = { messageId, reactions: msg.reactions };
                if (msg.groupId) {
                    io.to(`group:${msg.groupId}`).emit('message_reaction_updated', broadcastData);
                } else {
                    const r1 = msg.sender.toString();
                    const r2 = msg.recipient.toString();
                    io.to(`user:${r1}`).emit('message_reaction_updated', broadcastData);
                    io.to(`user:${r2}`).emit('message_reaction_updated', broadcastData);
                }
            } catch (error) {
                console.error('Send reaction error:', error);
            }
        });

        // Handle live location updates
        socket.on('update_live_location', async (data) => {
            try {
                const { messageId, content, recipientId } = data;
                
                // Update message in DB
                await Message.findByIdAndUpdate(messageId, { content });
                
                // Broadcast to recipient
                const recipientRoom = getRecipientRoom(recipientId);
                if (connectedUsers.has(recipientId)) {
                    io.to(recipientRoom).emit('live_location_updated', { messageId, content });
                }
            } catch(error) {
                console.error('Live location update error:', error);
            }
        });

        // Handle stop live location
        socket.on('stop_live_location', async (data) => {
             try {
                const { messageId, recipientId } = data;
                // Expire it immediately
                await Message.findByIdAndUpdate(messageId, { expiresAt: new Date() });
                
                const recipientRoom = getRecipientRoom(recipientId);
                if (connectedUsers.has(recipientId)) {
                    io.to(recipientRoom).emit('live_location_stopped', { messageId });
                }
             } catch(error) {
                 console.error('Stop live location error:', error);
             }
        });

        // Handle reading messages
        socket.on('mark_read', async (data) => {
            try {
                const { messageIds, senderId } = data;
                
                await Message.updateMany(
                    { _id: { $in: messageIds } },
                    { status: 'read' }
                );

                // Notify all instances of the original sender that their messages were read
                const senderRoom = getRecipientRoom(senderId);
                if(connectedUsers.has(senderId)) {
                    io.to(senderRoom).emit('messages_read', { messageIds, readerId: userId });
                }
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        socket.on('mark_played', async (data) => {
            try {
                const { messageIds, senderId } = data;
                await Message.updateMany({ _id: { $in: messageIds } }, { status: 'played' });
                const senderRoom = getRecipientRoom(senderId);
                if(connectedUsers.has(senderId)) {
                    io.to(senderRoom).emit('messages_played', { messageIds, playerId: userId });
                }
            } catch (error) {
                console.error('Error marking messages as played:', error);
            }
        });

        // Typing indicators
        socket.on('typing', (data) => {
            const recipientRoom = getRecipientRoom(data.recipientId);
            if (connectedUsers.has(data.recipientId)) {
                io.to(recipientRoom).emit('typing', { senderId: userId });
            }
        });

        socket.on('stop_typing', (data) => {
            const recipientRoom = getRecipientRoom(data.recipientId);
            if (connectedUsers.has(data.recipientId)) {
                io.to(recipientRoom).emit('stop_typing', { senderId: userId });
            }
        });

        // --- Audio/Video Calling Engine (Multi-Party Mesh Supported) ---
        
        socket.on('call:initiate', async (data) => {
            try {
                const { recipientId, type, offer, isGroup, groupName, groupPicture } = data;
                const callId = data.callId || `call_${Date.now()}`;
                
                // Register call
                if (!activeCalls.has(callId)) {
                    activeCalls.set(callId, new Set([userId]));
                }

                if (isGroup) {
                    const group = await Group.findById(recipientId);
                    if (group) {
                        group.members.forEach(memberId => {
                            const mId = memberId.toString();
                            if (mId !== userId) {
                                const memberRoom = getRecipientRoom(mId);
                                io.to(memberRoom).emit('call:incoming', {
                                    callerId: recipientId, // Use Group ID so recipient sees it as a group call
                                    callerName: groupName || group.name,
                                    callerPicture: groupPicture || group.profilePicture,
                                    type,
                                    offer,
                                    callId,
                                    isConference: true,
                                    actualCallerId: userId
                                });
                            }
                        });
                    }
                } else {
                    activeCalls.get(callId).add(recipientId);
                    const recipientRoom = getRecipientRoom(recipientId);
                    io.to(recipientRoom).emit('call:incoming', {
        callerId: userId,
        callerName: socket.user.displayName || 'Unknown',
        callerPicture: socket.user.profilePicture,
        type,
        offer,
        callId
      });
      // Push notification for incoming call
      await sendPushNotification(recipientId, {
        notification: {
          title: 'Incoming Call',
          body: `${socket.user.displayName} is calling you`
        },
        data: { type: 'incoming_call', callId, from: userId }
      });

                }
                
                // Join the call room
                socket.join(`room:${callId}`);

                // ✅ CRITICAL: Send callId back to the initiator (admin)
                // Without this, the frontend never knows the callId and can't end calls properly
                socket.emit('call:initiated', { callId });
            } catch (error) {
                console.error('Call initiate error:', error);
            }
        });

        socket.on('call:respond', async (data) => {
            try {
                const { callerId, accepted, answer, isConference, callId } = data;
                const callerRoom = getRecipientRoom(callerId);
                
                if (accepted && callId) {
                    socket.join(`room:${callId}`);
                    if (activeCalls.has(callId)) {
                        activeCalls.get(callId).add(userId);
                        
                        const participantIds = Array.from(activeCalls.get(callId));
                        const populatedParticipants = await User.find({
                            _id: { $in: participantIds }
                        }).select('displayName profilePicture');
                        
                        // Notify everyone in the room about the new participant
                        io.to(`room:${callId}`).emit('call:user_joined', {
                            userId,
                            displayName: socket.user.displayName,
                            profilePicture: socket.user.profilePicture,
                            participants: populatedParticipants
                        });
                    }
                }


                io.to(callerRoom).emit('call:response', {
                    recipientId: userId,
                    from: userId,
                    fromName: socket.user.displayName,
                    accepted,
                    answer,
                    isConference,
                    callId
                });
            } catch (error) {
                console.error('Call respond error:', error);
            }
        });

        socket.on('call:signal', (data) => {
            const { recipientId, signal, callId } = data;
            const recipientRoom = getRecipientRoom(recipientId);
            
            io.to(recipientRoom).emit('call:signal', {
                senderId: userId,
                from: userId,
                signal,
                callId
            });
        });

        socket.on('call:end', (data) => {
            const { callId, recipientId } = data;

            console.log(`📞 call:end from ${userId} | callId=${callId} | recipientId=${recipientId}`);

            if (callId && activeCalls.has(callId)) {
                activeCalls.get(callId).delete(userId);
                if (activeCalls.get(callId).size === 0) {
                    activeCalls.delete(callId);
                }
            }

            const payload = { senderId: userId, from: userId, callId };

            if (callId) {
                // Broadcast to everyone in the call room (primary method)
                io.to(`room:${callId}`).emit('call:ended', payload);
                socket.leave(`room:${callId}`);
            }

            // ✅ FALLBACK: If recipientId provided, emit directly to that user's room
            // This handles cases where callId is missing or room join was skipped
            if (recipientId) {
                const recipientRoom = getRecipientRoom(recipientId);
                io.to(recipientRoom).emit('call:ended', payload);
                // Also emit call:end directly so the new listener fires too
                io.to(recipientRoom).emit('call:end', payload);
            }
        });

        socket.on('call:kick', (data) => {
            const { targetUserId, callId } = data;
            
            if (callId && activeCalls.has(callId)) {
                activeCalls.get(callId).delete(targetUserId);
            }

            io.to(`room:${callId}`).emit('call:kick', {
                targetUserId,
                kickedBy: userId
            });
        });

        socket.on('call:mute_change', (data) => {
            const { isMuted, callId } = data;
            socket.to(`room:${callId}`).emit('call:participant_muted', {
                userId,
                isMuted
            });
        });

        socket.on('call:invite', async (data) => {
            try {
                const { targetUserId, callId, type } = data;
                const recipientRoom = getRecipientRoom(targetUserId);
                
                if (callId && activeCalls.has(callId)) {
                    activeCalls.get(callId).add(targetUserId);
                }

                const caller = await User.findById(userId).select('displayName profilePicture');
                
                io.to(recipientRoom).emit('call:invite_received', {
                    callerId: userId,
                    callerName: caller.displayName,
                    callerPicture: caller.profilePicture,
                    callId,
                    type: type || 'video'
                });
            } catch (error) {
                console.error('Call invite error:', error);
            }
        });




        socket.on('call:incoming', async (call) => {
          await sendPushNotification(call.receiverId, {
            notification: {
              title: 'Incoming Call 📞',
              body: `${call.callerName} is calling you`
            },
            data: {
              type: 'incoming_call',
              callId: call.callId
            }
          });
        });

        socket.on('call:missed', async (call) => {
  await sendPushNotification(call.receiverId, {
    notification: {
      title: 'Missed Call',
      body: `${call.callerName} missed your call`
    },
    data: {
      type: 'missed_call'
    }
  });
});

socket.on('disconnect', async () => {
            const userSockets = connectedUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                
                if (userSockets.size === 0) {
                    // Last instance disconnected
                    connectedUsers.delete(userId);
                    
                    // Update user status
                    try {
                        await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: Date.now() });
                    } catch (error) {
                        console.error('Error updating user status to offline on disconnect:', error);
                    }
                    
                    io.emit('user_status', { userId, status: 'offline', lastSeen: Date.now() });
                }
            }
        });
    });
};

module.exports = setupSocket;
