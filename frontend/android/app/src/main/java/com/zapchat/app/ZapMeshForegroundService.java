package com.zapchat.app;

import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

public class ZapMeshForegroundService extends Service {
    private static final String TAG = "ZapMeshForegroundService";
    public static final String ACTION_START_SERVICE = "ACTION_START_SERVICE";
    public static final String ACTION_STOP_SERVICE = "ACTION_STOP_SERVICE";
    public static final String ACTION_UPDATE_STATUS = "ACTION_UPDATE_STATUS";
    public static final String EXTRA_STATUS_TEXT = "EXTRA_STATUS_TEXT";

    private final IBinder binder = new LocalBinder();
    private static ZapMeshForegroundService instance = null;

    public class LocalBinder extends Binder {
        ZapMeshForegroundService getService() {
            return ZapMeshForegroundService.this;
        }
    }

    public static ZapMeshForegroundService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        Log.d(TAG, "ZapMeshForegroundService created.");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP_SERVICE.equals(action)) {
                Log.d(TAG, "Stopping foreground service...");
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }

            String statusText = intent.getStringExtra(EXTRA_STATUS_TEXT);
            if (statusText == null) {
                statusText = "ZapChat Mesh active in background";
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    int serviceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE;
                    if (Build.VERSION.SDK_INT >= 34) {
                        // Include microphone & camera foreground types if calling
                        serviceType |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE | ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA;
                    }
                    startForeground(
                        ZapNotificationManager.NOTIF_ID_STATUS,
                        ZapNotificationManager.buildForegroundServiceNotification(this, statusText),
                        serviceType
                    );
                } else {
                    startForeground(
                        ZapNotificationManager.NOTIF_ID_STATUS,
                        ZapNotificationManager.buildForegroundServiceNotification(this, statusText)
                    );
                }
            } catch (Exception e) {
                Log.e(TAG, "Error starting foreground service: " + e.getMessage());
            }
        }
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
        Log.d(TAG, "ZapMeshForegroundService destroyed.");
    }
}
