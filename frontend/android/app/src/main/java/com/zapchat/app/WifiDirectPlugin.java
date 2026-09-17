package com.zapchat.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.NetworkInfo;
import android.net.wifi.p2p.WifiP2pConfig;
import android.net.wifi.p2p.WifiP2pDevice;
import android.net.wifi.p2p.WifiP2pDeviceList;
import android.net.wifi.p2p.WifiP2pInfo;
import android.net.wifi.p2p.WifiP2pManager;
import android.net.wifi.WpsInfo;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(
    name = "WifiDirect",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "wifi", strings = { Manifest.permission.ACCESS_WIFI_STATE, Manifest.permission.CHANGE_WIFI_STATE })
    }
)
public class WifiDirectPlugin extends Plugin {
    private static final String TAG = "WifiDirectPlugin";
    private static final int P2P_PORT = 8888;

    private WifiP2pManager manager;
    private WifiP2pManager.Channel channel;
    private BroadcastReceiver receiver;
    private IntentFilter intentFilter;

    private List<WifiP2pDevice> peersList = new ArrayList<>();
    private String currentStatus = "Disconnected";

    private ServerSocket serverSocket;
    private Socket activeSocket;
    private PrintWriter socketWriter;
    private BufferedReader socketReader;

    private Thread serverThread;
    private Thread clientThread;
    private Thread readerThread;

    private final Set<String> processedMessageIds = Collections.newSetFromMap(new ConcurrentHashMap<>());

    @Override
    public void load() {
        super.load();
        Context context = getContext();

        manager = (WifiP2pManager) context.getSystemService(Context.WIFI_P2P_SERVICE);
        if (manager != null) {
            channel = manager.initialize(context, Looper.getMainLooper(), null);
        } else {
            Log.e(TAG, "WifiP2pManager is null! Wi-Fi Direct not supported on this device.");
        }

        intentFilter = new IntentFilter();
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION);
        intentFilter.addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION);

        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION.equals(action)) {
                    int state = intent.getIntExtra(WifiP2pManager.EXTRA_WIFI_STATE, -1);
                    boolean isEnabled = (state == WifiP2pManager.WIFI_P2P_STATE_ENABLED);
                    Log.d(TAG, "Wi-Fi P2P State Enabled: " + isEnabled);
                    if (!isEnabled) {
                        notifyError("Wi-Fi Direct is disabled. Please enable Wi-Fi in Android Settings.");
                    }
                } else if (WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION.equals(action)) {
                    if (manager != null && channel != null) {
                        try {
                            manager.requestPeers(channel, peerListListener);
                        } catch (SecurityException e) {
                            Log.e(TAG, "SecurityException requesting peers: " + e.getMessage());
                        }
                    }
                } else if (WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION.equals(action)) {
                    if (manager != null && channel != null) {
                        NetworkInfo networkInfo = intent.getParcelableExtra(WifiP2pManager.EXTRA_NETWORK_INFO);
                        if (networkInfo != null && networkInfo.isConnected()) {
                            manager.requestConnectionInfo(channel, connectionInfoListener);
                        } else {
                            if (!"Searching".equals(currentStatus) && !"Connecting".equals(currentStatus)) {
                                updateStatus("Disconnected");
                                closeSockets();
                            }
                        }
                    }
                } else if (WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION.equals(action)) {
                    WifiP2pDevice device = intent.getParcelableExtra(WifiP2pManager.EXTRA_WIFI_P2P_DEVICE);
                    if (device != null) {
                        Log.d(TAG, "This Device Name: " + device.deviceName + " | Address: " + device.deviceAddress);
                    }
                }
            }
        };

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(receiver, intentFilter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                context.registerReceiver(receiver, intentFilter);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error registering receiver: " + e.getMessage());
        }
    }

    private final WifiP2pManager.PeerListListener peerListListener = new WifiP2pManager.PeerListListener() {
        @Override
        public void onPeersAvailable(WifiP2pDeviceList peerList) {
            peersList.clear();
            peersList.addAll(peerList.getDeviceList());

            JSArray jsPeers = new JSArray();
            for (WifiP2pDevice dev : peersList) {
                JSObject devObj = new JSObject();
                devObj.put("deviceName", dev.deviceName != null && !dev.deviceName.isEmpty() ? dev.deviceName : "ZapChat User");
                devObj.put("deviceAddress", dev.deviceAddress);
                devObj.put("status", dev.status);
                devObj.put("statusText", getDeviceStatusText(dev.status));
                jsPeers.put(devObj);
            }

            Log.d(TAG, "Discovered " + peersList.size() + " nearby Wi-Fi Direct devices.");
            if (peersList.size() > 0 && "Searching".equals(currentStatus)) {
                updateStatus("Device Found");
            }

            JSObject ret = new JSObject();
            ret.put("devices", jsPeers);
            ret.put("count", peersList.size());
            notifyListeners("onPeersDiscovered", ret);
        }
    };

    private final WifiP2pManager.ConnectionInfoListener connectionInfoListener = new WifiP2pManager.ConnectionInfoListener() {
        @Override
        public void onConnectionInfoAvailable(WifiP2pInfo info) {
            if (info.groupFormed) {
                String groupOwnerIp = info.groupOwnerAddress != null ? info.groupOwnerAddress.getHostAddress() : "";
                Log.d(TAG, "Wi-Fi P2P Group Formed! Is Group Owner: " + info.isGroupOwner + " | GO IP: " + groupOwnerIp);

                updateStatus("Connected");

                JSObject connObj = new JSObject();
                connObj.put("status", "Connected");
                connObj.put("isGroupOwner", info.isGroupOwner);
                connObj.put("groupOwnerIp", groupOwnerIp);
                notifyListeners("onConnectionStatusChanged", connObj);

                if (info.isGroupOwner) {
                    startServerThread();
                } else {
                    startClientThread(groupOwnerIp);
                }
            } else {
                updateStatus("Disconnected");
                closeSockets();
            }
        }
    };

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        boolean hasPermission = hasRequiredPermissions();
        ret.put("granted", hasPermission);
        call.resolve(ret);
    }

    private boolean hasRequiredPermissions() {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ctx.checkSelfPermission(Manifest.permission.NEARBY_WIFI_DEVICES) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        } else {
            return ctx.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (manager == null || channel == null) {
            call.reject("Wi-Fi Direct is not supported on this device.");
            return;
        }

        try {
            manager.discoverPeers(channel, new WifiP2pManager.ActionListener() {
                @Override
                public void onSuccess() {
                    Log.d(TAG, "Wi-Fi Direct Peer Discovery Started.");
                    updateStatus("Searching");
                    JSObject ret = new JSObject();
                    ret.put("status", "Searching");
                    call.resolve(ret);
                }

                @Override
                public void onFailure(int reason) {
                    String errorMsg = getFailureReasonText(reason);
                    Log.e(TAG, "Discovery failed: " + errorMsg);
                    updateStatus("Disconnected");
                    notifyError("Wi-Fi Direct Discovery Failed: " + errorMsg + ". Make sure Wi-Fi and Location are turned ON.");
                    call.reject("Discovery failed: " + errorMsg);
                }
            });
        } catch (SecurityException e) {
            Log.e(TAG, "SecurityException in startDiscovery: " + e.getMessage());
            call.reject("Permission denied: Please grant Nearby Devices / Location permission.");
        }
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        if (manager == null || channel == null) {
            call.resolve();
            return;
        }

        try {
            manager.stopPeerDiscovery(channel, new WifiP2pManager.ActionListener() {
                @Override
                public void onSuccess() {
                    Log.d(TAG, "Stopped Peer Discovery.");
                    call.resolve();
                }

                @Override
                public void onFailure(int reason) {
                    call.resolve();
                }
            });
        } catch (SecurityException e) {
            call.resolve();
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String deviceAddress = call.getString("deviceAddress");
        if (deviceAddress == null || deviceAddress.isEmpty()) {
            call.reject("deviceAddress is required.");
            return;
        }

        if (manager == null || channel == null) {
            call.reject("Wi-Fi Direct is not supported.");
            return;
        }

        WifiP2pConfig config = new WifiP2pConfig();
        config.deviceAddress = deviceAddress;
        config.wps.setup = WpsInfo.PBC;

        try {
            updateStatus("Connecting");
            manager.connect(channel, config, new WifiP2pManager.ActionListener() {
                @Override
                public void onSuccess() {
                    Log.d(TAG, "Connection initiated to " + deviceAddress);
                    JSObject ret = new JSObject();
                    ret.put("status", "Connecting");
                    ret.put("deviceAddress", deviceAddress);
                    call.resolve(ret);
                }

                @Override
                public void onFailure(int reason) {
                    String errorMsg = getFailureReasonText(reason);
                    Log.e(TAG, "Connection failed: " + errorMsg);
                    updateStatus("Disconnected");
                    notifyError("Failed to connect to device: " + errorMsg);
                    call.reject("Connection failed: " + errorMsg);
                }
            });
        } catch (SecurityException e) {
            call.reject("Permission denied.");
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        closeSockets();
        if (manager != null && channel != null) {
            try {
                manager.removeGroup(channel, new WifiP2pManager.ActionListener() {
                    @Override
                    public void onSuccess() {
                        Log.d(TAG, "Disconnected and Wi-Fi Direct group removed.");
                        updateStatus("Disconnected");
                        call.resolve();
                    }

                    @Override
                    public void onFailure(int reason) {
                        updateStatus("Disconnected");
                        call.resolve();
                    }
                });
            } catch (Exception e) {
                updateStatus("Disconnected");
                call.resolve();
            }
        } else {
            updateStatus("Disconnected");
            call.resolve();
        }
    }

    @PluginMethod
    public void sendMessage(PluginCall call) {
        String text = call.getString("text");
        String messageId = call.getString("messageId");
        String senderName = call.getString("senderName", "ZapChat User");
        String senderId = call.getString("senderId", "local_user");

        if (text == null || text.trim().isEmpty()) {
            call.reject("Message text cannot be empty.");
            return;
        }

        if (messageId == null || messageId.trim().isEmpty()) {
            messageId = "p2p_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 10000);
        }

        if (activeSocket == null || !activeSocket.isConnected() || socketWriter == null) {
            call.reject("No active Wi-Fi Direct connection. Connect to a device first.");
            return;
        }

        final String finalMsgId = messageId;
        final String jsonMessage = buildMessageJson(finalMsgId, text, senderId, senderName);

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    synchronized (WifiDirectPlugin.this) {
                        if (socketWriter != null) {
                            socketWriter.println(jsonMessage);
                            socketWriter.flush();
                            processedMessageIds.add(finalMsgId);
                        }
                    }
                    Log.d(TAG, "P2P Message Sent Successfully! ID: " + finalMsgId);
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("messageId", finalMsgId);
                    call.resolve(ret);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to send P2P message: " + e.getMessage());
                    call.reject("Failed to send message: " + e.getMessage());
                }
            }
        }).start();
    }

    @PluginMethod
    public void getConnectionStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("status", currentStatus);
        ret.put("isConnected", activeSocket != null && activeSocket.isConnected());
        call.resolve(ret);
    }

    private String buildMessageJson(String messageId, String text, String senderId, String senderName) {
        JSObject obj = new JSObject();
        obj.put("messageId", messageId);
        obj.put("text", text);
        obj.put("senderId", senderId);
        obj.put("senderName", senderName);
        obj.put("timestamp", System.currentTimeMillis());
        return obj.toString();
    }

    private synchronized void startServerThread() {
        closeSockets();
        serverThread = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    serverSocket = new ServerSocket(P2P_PORT);
                    serverSocket.setReuseAddress(true);
                    Log.d(TAG, "ServerThread listening on port " + P2P_PORT);

                    Socket socket = serverSocket.accept();
                    Log.d(TAG, "Server accepted incoming P2P socket connection from " + socket.getInetAddress().getHostAddress());
                    activeSocket = socket;
                    setupSocketStreams(socket);
                } catch (IOException e) {
                    Log.e(TAG, "ServerThread Exception: " + e.getMessage());
                }
            }
        });
        serverThread.start();
    }

    private synchronized void startClientThread(final String hostIp) {
        closeSockets();
        clientThread = new Thread(new Runnable() {
            @Override
            public void run() {
                Socket socket = null;
                // Retry connecting up to 5 times (Wait for GO ServerSocket binding)
                for (int i = 0; i < 5; i++) {
                    try {
                        Thread.sleep(800);
                        socket = new Socket(hostIp, P2P_PORT);
                        break;
                    } catch (Exception e) {
                        Log.d(TAG, "Client connection attempt " + (i + 1) + " failed: " + e.getMessage());
                    }
                }

                if (socket != null && socket.isConnected()) {
                    Log.d(TAG, "Client connected to GO Server at " + hostIp);
                    activeSocket = socket;
                    setupSocketStreams(socket);
                } else {
                    Log.e(TAG, "Client failed to connect to GO Server at " + hostIp);
                    notifyError("Failed to connect to device socket.");
                }
            }
        });
        clientThread.start();
    }

    private void setupSocketStreams(final Socket socket) {
        try {
            socketWriter = new PrintWriter(new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), "UTF-8")), true);
            socketReader = new BufferedReader(new InputStreamReader(socket.getInputStream(), "UTF-8"));

            readerThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String line;
                        while ((line = socketReader.readLine()) != null) {
                            if (line.trim().isEmpty()) continue;
                            Log.d(TAG, "Incoming P2P Line: " + line);
                            try {
                                JSObject msgObj = new JSObject(line);
                                String messageId = msgObj.getString("messageId");

                                if (messageId != null && processedMessageIds.contains(messageId)) {
                                    Log.d(TAG, "Duplicate P2P message ignored: " + messageId);
                                    continue;
                                }

                                if (messageId != null) {
                                    processedMessageIds.add(messageId);
                                }

                                notifyListeners("onMessageReceived", msgObj);
                            } catch (Exception parseEx) {
                                Log.e(TAG, "Error parsing P2P message JSON: " + parseEx.getMessage());
                            }
                        }
                    } catch (IOException e) {
                        Log.d(TAG, "P2P Socket Reader Closed: " + e.getMessage());
                    } finally {
                        updateStatus("Disconnected");
                        JSObject statusObj = new JSObject();
                        statusObj.put("status", "Disconnected");
                        statusObj.put("reason", "Connection lost");
                        notifyListeners("onConnectionStatusChanged", statusObj);
                    }
                }
            });
            readerThread.start();
        } catch (IOException e) {
            Log.e(TAG, "Error setting up P2P socket streams: " + e.getMessage());
        }
    }

    private synchronized void closeSockets() {
        try {
            if (activeSocket != null && !activeSocket.isClosed()) {
                activeSocket.close();
            }
        } catch (Exception ignored) {}
        activeSocket = null;

        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (Exception ignored) {}
        serverSocket = null;

        socketWriter = null;
        socketReader = null;
    }

    private void updateStatus(String status) {
        this.currentStatus = status;
        Log.d(TAG, "Wi-Fi Direct Status Changed: " + status);
        JSObject statusObj = new JSObject();
        statusObj.put("status", status);
        notifyListeners("onConnectionStatusChanged", statusObj);
    }

    private void notifyError(String errorMsg) {
        JSObject errObj = new JSObject();
        errObj.put("message", errorMsg);
        notifyListeners("onError", errObj);
    }

    private String getDeviceStatusText(int status) {
        switch (status) {
            case WifiP2pDevice.AVAILABLE: return "Available";
            case WifiP2pDevice.INVITED: return "Connecting / Invited";
            case WifiP2pDevice.CONNECTED: return "Connected";
            case WifiP2pDevice.FAILED: return "Failed";
            case WifiP2pDevice.UNAVAILABLE: return "Unavailable";
            default: return "Unknown";
        }
    }

    private String getFailureReasonText(int reason) {
        switch (reason) {
            case WifiP2pManager.ERROR: return "Internal Android Error";
            case WifiP2pManager.P2P_UNSUPPORTED: return "Wi-Fi Direct unsupported on this device";
            case WifiP2pManager.BUSY: return "System is busy, please try again in a few seconds";
            default: return "Error code " + reason;
        }
    }

    @Override
    protected void handleOnDestroy() {
        closeSockets();
        if (receiver != null) {
            try {
                getContext().unregisterReceiver(receiver);
            } catch (Exception ignored) {}
        }
        super.handleOnDestroy();
    }
}
