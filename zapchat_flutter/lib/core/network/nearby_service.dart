import 'dart:convert';
import 'dart:typed_data';
import 'package:nearby_connections/nearby_connections.dart';
import 'package:permission_handler/permission_handler.dart';

class NearbyService {
  static final NearbyService _instance = NearbyService._internal();
  factory NearbyService() => _instance;
  NearbyService._internal();

  final Strategy _strategy = Strategy.P2P_CLUSTER; // Mesh clustering strategy
  final String _serviceId = "com.zapchat.p2p";

  // State
  final Map<String, String> connectedPeers = {}; // connectionId -> userName
  bool isAdvertising = false;
  bool isDiscovering = false;

  // Callback to execute when a message is received
  Function(String senderId, Map<String, dynamic> message)? onMessageReceived;
  // Callback to update connected peers list in UI
  Function()? onPeersChanged;

  Future<bool> checkPermissions() async {
    // Nearby Connections requires Location, Bluetooth permissions
    final locationStatus = await Permission.location.request();
    final bluetoothStatus = await Permission.bluetooth.request();
    final scanStatus = await Permission.bluetoothScan.request();
    final advertiseStatus = await Permission.bluetoothAdvertise.request();
    final connectStatus = await Permission.bluetoothConnect.request();

    return locationStatus.isGranted &&
        (bluetoothStatus.isGranted ||
            (scanStatus.isGranted && advertiseStatus.isGranted && connectStatus.isGranted));
  }

  Future<void> startP2PAdvertising(String userName) async {
    if (isAdvertising) return;
    final granted = await checkPermissions();
    if (!granted) return;

    try {
      isAdvertising = await Nearby().startAdvertising(
        userName,
        _strategy,
        onConnectionInitiated: (id, info) async {
          // Auto-accept connection requests for seamless mesh chat
          await Nearby().acceptConnection(
            id,
            onPayLoadRecieved: (endpointId, payload) {
              if (payload.type == PayloadType.BYTES && payload.bytes != null) {
                _handleIncomingPayload(endpointId, payload.bytes!);
              }
            },
            onPayloadTransferUpdate: (endpointId, payloadTransferUpdate) {},
          );
        },
        onConnectionResult: (id, status) {
          if (status == Status.CONNECTED) {
            connectedPeers[id] = userName;
            onPeersChanged?.call();
          }
        },
        onDisconnected: (id) {
          connectedPeers.remove(id);
          onPeersChanged?.call();
        },
        serviceId: _serviceId,
      );
    } catch (_) {}
  }

  Future<void> startP2PDiscovery(String userName) async {
    if (isDiscovering) return;
    final granted = await checkPermissions();
    if (!granted) return;

    try {
      isDiscovering = await Nearby().startDiscovery(
        userName,
        _strategy,
        onEndpointFound: (id, name, serviceId) async {
          // Request connection to found peers automatically
          try {
            await Nearby().requestConnection(
              userName,
              id,
              onConnectionInitiated: (endpointId, info) async {
                await Nearby().acceptConnection(
                  endpointId,
                  onPayLoadRecieved: (eid, payload) {
                    if (payload.type == PayloadType.BYTES && payload.bytes != null) {
                      _handleIncomingPayload(eid, payload.bytes!);
                    }
                  },
                  onPayloadTransferUpdate: (eid, payloadTransferUpdate) {},
                );
              },
              onConnectionResult: (endpointId, status) {
                if (status == Status.CONNECTED) {
                  connectedPeers[endpointId] = name;
                  onPeersChanged?.call();
                }
              },
              onDisconnected: (endpointId) {
                connectedPeers.remove(endpointId);
                onPeersChanged?.call();
              },
            );
          } catch (_) {}
        },
        onEndpointLost: (id) {},
        serviceId: _serviceId,
      );
    } catch (_) {}
  }

  Future<void> stopAdvertising() async {
    await Nearby().stopAdvertising();
    isAdvertising = false;
    onPeersChanged?.call();
  }

  Future<void> stopDiscovery() async {
    await Nearby().stopDiscovery();
    isDiscovering = false;
    onPeersChanged?.call();
  }

  Future<void> stopAll() async {
    await Nearby().stopAdvertising();
    await Nearby().stopDiscovery();
    await Nearby().stopAllEndpoints();
    connectedPeers.clear();
    isAdvertising = false;
    isDiscovering = false;
    onPeersChanged?.call();
  }

  // Send a text message to all connected peers
  Future<void> broadcastMessage(Map<String, dynamic> messageData) async {
    final payloadBytes = Uint8List.fromList(utf8.encode(jsonEncode(messageData)));
    for (final peerId in connectedPeers.keys) {
      try {
        await Nearby().sendBytesPayload(peerId, payloadBytes);
      } catch (_) {}
    }
  }

  void _handleIncomingPayload(String endpointId, Uint8List bytes) {
    try {
      final jsonString = utf8.decode(bytes);
      final data = jsonDecode(jsonString) as Map<String, dynamic>;
      onMessageReceived?.call(endpointId, data);
    } catch (_) {}
  }
}
