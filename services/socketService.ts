import { Client, IFrame, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuthStore } from "../store/useAuthStore";

// Polyfills for TextEncoder/Decoder if needed in RN
import "text-encoding";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "http://10.0.2.2:8085/ws";

class SocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, any> = new Map();

  connect(onConnectCb?: (frame: IFrame) => void, onDisconnectCb?: () => void) {
    if (this.client?.active) return;

    const token = useAuthStore.getState().token;

    this.client = new Client({
      brokerURL: SOCKET_URL.startsWith("ws") ? SOCKET_URL : undefined,
      webSocketFactory: SOCKET_URL.startsWith("http")
        ? () => new SockJS(SOCKET_URL)
        : undefined,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (msg) => {
        if (process.env.NODE_ENV === "development") {
          console.log("STOMP DEBUG:", msg);
        }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        console.log("STOMP Connected!");
        if (onConnectCb) onConnectCb(frame);
      },
      onDisconnect: () => {
        console.log("STOMP Disconnected!");
        if (onDisconnectCb) onDisconnectCb();
      },
      onStompError: (frame) => {
        console.error("STOMP ERROR:", frame.headers["message"]);
        console.error("Additional details:", frame.body);
      },
    });

    if (this.client) {
      this.client.activate();
    }
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.subscriptions.clear();
    }
  }

  subscribe(destination: string, callback: (message: IMessage) => void) {
    if (!this.client) {
      console.warn("STOMP: Cannot subscribe, client is null");
      return;
    }
    const subscription = this.client.subscribe(destination, callback);
    this.subscriptions.set(destination, subscription);
    return subscription;
  }

  unsubscribe(destination: string) {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    }
  }

  send(destination: string, body: any) {
    if (!this.client || !this.client.active) {
      console.error("Cannot send message, STOMP client is not active");
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
}

const socketService = new SocketService();
export default socketService;
