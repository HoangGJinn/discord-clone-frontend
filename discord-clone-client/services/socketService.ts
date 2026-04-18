import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { resolveSocketUrl } from '@/api/networkConfig';
import { getAuthToken } from './authSession';

// Polyfills for TextEncoder/Decoder required by STOMPjs v7
import { TextEncoder, TextDecoder } from 'text-encoding';

if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}

const SOCKET_URL = resolveSocketUrl();

if (__DEV__) {
  console.log('🌐 SOCKET_URL đang kết nối:', SOCKET_URL);
}

class SocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private connectPromise: Promise<void> | null = null;

  async connect(): Promise<void> {
    if (this.client?.connected) return;
    if (this.connectPromise) return this.connectPromise;

    const token = getAuthToken();
    if (!token) {
      throw new Error('STOMP: No auth token available, cannot connect.');
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.client = new Client({
        brokerURL: SOCKET_URL,
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        reconnectDelay: 5000,
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
        debug: (msg) => {
          console.log('STOMP RAW:', msg);
        },
        onConnect: () => {
          console.log('STOMP: Connected successfully');
          this.connectPromise = null;
          resolve();
        },
        onStompError: (frame) => {
          console.error('STOMP [STOMP ERROR]:', frame.headers['message']);
          console.error('STOMP [STOMP ERROR Body]:', frame.body);
          this.connectPromise = null;
          reject(new Error(frame.headers['message'] || 'STOMP connection failed'));
        },
        onWebSocketError: (event) => {
          console.error('STOMP [WS ERROR]:', event);
          this.connectPromise = null;
          reject(new Error('WebSocket connection error'));
        },
      });

      this.client.activate();
    });

    return this.connectPromise;
  }

  async subscribe<T = any>(destination: string, callback: (message: T) => void): Promise<void> {
    await this.connect();

    if (this.subscriptions.has(destination)) {
      return;
    }

    const subscription = this.client!.subscribe(destination, (frame: IMessage) => {
      try {
        const parsed: T = JSON.parse(frame.body);
        callback(parsed);
      } catch (error) {
        console.error('Error parsing socket message:', error);
      }
    });

    this.subscriptions.set(destination, subscription);
  }

  unsubscribe(destination: string): void {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    }
  }

  async send(destination: string, body: object): Promise<boolean> {
    try {
      await this.connect();
    } catch (error) {
      console.error('Error connecting before send:', error);
      return false;
    }

    if (!this.client?.connected) {
      return false;
    }

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
      return true;
    } catch (error) {
      console.error('Error sending socket message:', error);
      return false;
    }
  }

  disconnect(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions.clear();

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    this.connectPromise = null;
  }

  isActive(): boolean {
    return this.client?.active || false;
  }

  isConnected(): boolean {
    return this.client?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;

