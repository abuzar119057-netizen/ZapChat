package com.zapchat.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import android.util.Log;

public class ZapNotificationManager {
    private static final String TAG = "ZapNotificationManager";

    public static final String CHANNEL_MESSAGES = "zapchat_messages";
    public static final String CHANNEL_CALLS = "zapchat_calls";
    public static final String CHANNEL_FILES = "zapchat_files";
    public static final String CHANNEL_STATUS = "zapchat_status";

    public static final int NOTIF_ID_STATUS = 1001;
    public static final int NOTIF_ID_CALL = 2001;
    public static final int NOTIF_ID_MESSAGE = 3001;
    public static final int NOTIF_ID_FILE = 4001;

    public static void createNotificationChannels(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager == null) return;

            // Messages Channel
            NotificationChannel messagesChannel = new NotificationChannel(
                CHANNEL_MESSAGES,
                "ZapChat Offline & Online Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            messagesChannel.setDescription("Notifications for incoming E2EE messages");
            messagesChannel.setVibrationPattern(new long[]{0, 250, 250, 250});
            messagesChannel.enableVibration(true);

            // Calls Channel
            NotificationChannel callsChannel = new NotificationChannel(
                CHANNEL_CALLS,
                "ZapChat Voice & Video Calls",
                NotificationManager.IMPORTANCE_HIGH
            );
            callsChannel.setDescription("High priority incoming P2P voice and video calls");
            callsChannel.setVibrationPattern(new long[]{0, 500, 500, 500});
            callsChannel.enableVibration(true);

            // Files Channel
            NotificationChannel filesChannel = new NotificationChannel(
                CHANNEL_FILES,
                "ZapChat File Transfers",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            filesChannel.setDescription("Progress and status of nearby file transfers");

            // Status Channel
            NotificationChannel statusChannel = new NotificationChannel(
                CHANNEL_STATUS,
                "ZapChat Background Mesh Service",
                NotificationManager.IMPORTANCE_LOW
            );
            statusChannel.setDescription("Ongoing status notification for background mesh routing");

            manager.createNotificationChannel(messagesChannel);
            manager.createNotificationChannel(callsChannel);
            manager.createNotificationChannel(filesChannel);
            manager.createNotificationChannel(statusChannel);
            Log.d(TAG, "Notification Channels initialized successfully.");
        }
    }

    public static Notification buildForegroundServiceNotification(Context context, String statusText) {
        createNotificationChannels(context);

        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        return new NotificationCompat.Builder(context, CHANNEL_STATUS)
            .setContentTitle("ZapChat Mesh Service Active")
            .setContentText(statusText != null ? statusText : "Monitoring nearby P2P encrypted mesh connections...")
            .setSmallIcon(android.R.drawable.ic_menu_share)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    public static void showMessageNotification(Context context, String senderName, String messageContent) {
        createNotificationChannels(context);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("openChatSender", senderName);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, (int) System.currentTimeMillis(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_MESSAGES)
            .setContentTitle(senderName != null ? senderName : "ZapChat Peer")
            .setContentText(messageContent != null ? messageContent : "Sent you an encrypted message")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(Notification.DEFAULT_ALL)
            .build();

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify((int) System.currentTimeMillis(), notification);
        } catch (SecurityException e) {
            Log.w(TAG, "Notification permission missing: " + e.getMessage());
        }
    }

    public static void showIncomingCallNotification(Context context, String callerName, boolean isVideo, String callId) {
        createNotificationChannels(context);

        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openIntent.putExtra("incomingCallId", callId);
        openIntent.putExtra("isVideoCall", isVideo);

        PendingIntent openPendingIntent = PendingIntent.getActivity(
            context, 1, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        String callType = isVideo ? "Incoming Video Call" : "Incoming Voice Call";

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_CALLS)
            .setContentTitle(callType)
            .setContentText("From: " + (callerName != null ? callerName : "ZapChat Peer"))
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setContentIntent(openPendingIntent)
            .setFullScreenIntent(openPendingIntent, true)
            .setAutoCancel(true)
            .setOngoing(true)
            .setDefaults(Notification.DEFAULT_ALL)
            .build();

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify(NOTIF_ID_CALL, notification);
        } catch (SecurityException e) {
            Log.w(TAG, "Notification permission missing: " + e.getMessage());
        }
    }

    public static void cancelCallNotification(Context context) {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.cancel(NOTIF_ID_CALL);
    }

    public static void showFileTransferNotification(Context context, String filename, boolean isCompleted, boolean isSuccess) {
        createNotificationChannels(context);

        String title = isCompleted ? (isSuccess ? "File Transfer Complete" : "File Transfer Failed") : "Transferring File";
        String content = filename + (isCompleted ? (isSuccess ? " received successfully." : " failed to transfer.") : " is downloading...");

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_FILES)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_save)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build();

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify(NOTIF_ID_FILE, notification);
        } catch (SecurityException e) {
            Log.w(TAG, "Notification permission missing: " + e.getMessage());
        }
    }
}
