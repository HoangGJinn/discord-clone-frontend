import { Client, IFrame, IMessage } from "@stomp/stompjs";
import { useAuthStore } from "../store/useAuthStore";

// Polyfills for TextEncoder/Decoder required by STOMPjs v7
import { TextEncoder, TextDecoder } from "text-encoding";

if (typeof global.TextEncoder === "undefined") {
  (global as any).TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  (global as any).TextDecoder = TextDecoder;
}

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "ws://10.0.2.2:8085/ws-native";

class SocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, any> = new Map();
  private queuedSubscriptions: Array<{
    destination: string;
    callback: (message: IMessage) => void;
  }> = [];
  private isConnecting: boolean = false;

  connect(onConnectCb?: (frame: IFrame) => void, onDisconnectCb?: () => void) {
    if (this.client?.active) {
      console.log("STOMP: Already active, skipping connect.");
      return;
    }

    if (this.isConnecting) {
      console.log("STOMP: Already connecting, skipping duplicate connect call.");
      return;
    }

    const token = useAuthStore.getState().token;
    if (!token) {
      console.warn("STOMP: No auth token available, cannot connect.");
      return;
    }

    this.isConnecting = true;
    console.log("=== STOMP: Attempting to connect ===");
    console.log("STOMP: URL =", SOCKET_URL);
    console.log("STOMP: Token =", token.substring(0, 20) + "...");

    this.client = new Client({
      brokerURL: SOCKET_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (msg) => {
        // Log ALL STOMP messages for debugging
        console.log("STOMP RAW:", msg);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: (frame) => {
        console.log("=== STOMP: Connected successfully! ===");
        this.isConnecting = false;

        // Process queued subscriptions
        this.queuedSubscriptions.forEach((sub) => {
          console.log(
            `STOMP: Subscribing to queued destination: ${sub.destination}`
          );
          this._doSubscribe(sub.destination, sub.callback);
        });
        this.queuedSubscriptions = [];

        if (onConnectCb) onConnectCb(frame);
      },
      onDisconnect: () => {
        console.log("STOMP: Disconnected.");
        this.isConnecting = false;
        if (onDisconnectCb) onDisconnectCb();
      },
      onWebSocketError: (event) => {
        console.error("STOMP [WS ERROR]:", JSON.stringify(event));
        this.isConnecting = false;
      },
      onWebSocketClose: (event) => {
        console.warn(
          `STOMP [WS CLOSE]: Code=${event.code}, Reason=${event.reason}, Clean=${event.wasClean}`
        );
        this.isConnecting = false;
      },
      onStompError: (frame) => {
        console.error("STOMP [STOMP ERROR]:", frame.headers["message"]);
        console.error("STOMP [STOMP ERROR Body]:", frame.body);
        this.isConnecting = false;
      },
    });

    console.log("STOMP: Calling activate()...");
    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.subscriptions.clear();
      this.queuedSubscriptions = [];
      this.isConnecting = false;
    }
  }

  subscribe(destination: string, callback: (message: IMessage) => void) {
    if (!this.client) {
      console.warn(
        "STOMP: Client is null, initiating connect and queuing:",
        destination
      );
      this.queuedSubscriptions.push({ destination, callback });
      this.connect();
      return;
    }

    if (!this.client.connected) {
      console.log(
        `STOMP: Not connected yet, queuing subscription for: ${destination}`
      );
      this.queuedSubscriptions.push({ destination, callback });
      // Trigger connect if not already connecting
      if (!this.isConnecting) {
        this.connect();
      }
      return;
    }

    return this._doSubscribe(destination, callback);
  }

  private _doSubscribe(
    destination: string,
    callback: (message: IMessage) => void
  ) {
    if (!this.client || !this.client.connected) return;

    // Avoid duplicate subscriptions
    if (this.subscriptions.has(destination)) {
      console.log(`STOMP: Already subscribed to ${destination}, skipping.`);
      return this.subscriptions.get(destination);
    }

    const subscription = this.client.subscribe(destination, callback);
    this.subscriptions.set(destination, subscription);
    console.log(`STOMP: Subscribed to ${destination}`);
    return subscription;
  }

  unsubscribe(destination: string) {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    }
    this.queuedSubscriptions = this.queuedSubscriptions.filter(
      (s) => s.destination !== destination
    );
  }

  send(destination: string, body: any) {
    if (!this.client || !this.client.connected) {
      console.error("STOMP: Cannot send, not connected.");
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }

  isActive() {
    return this.client?.active || false;
  }

  isConnected() {
    return this.client?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;
