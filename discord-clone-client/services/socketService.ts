import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { resolveSocketUrl } from '@/api/networkConfig';
import { getAuthToken } from './authSession';
import { AppState, AppStateStatus } from 'react-native';

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
  private subscriptions: Map<
    string,
    { subscription: StompSubscription; listeners: Set<(message: any) => void> }
  > = new Map();
  private connectPromise: Promise<void> | null = null;
  private appState: AppStateStatus = AppState.currentState;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextState: AppStateStatus) => {
    const prevState = this.appState;
    this.appState = nextState;

    if ((prevState === 'background' || prevState === 'inactive') && nextState === 'active') {
      this.ensureForegroundConnection();
    }
  };

  private logSocketIssue(message: string, error?: unknown): void {
    if (this.appState === 'active') {
      console.warn(message, error);
      return;
    }

    if (__DEV__) {
      console.log('[Socket][background]', message, error ?? '');
    }
  }

  private ensureForegroundConnection(): void {
    const token = getAuthToken();
    if (!token) return;
    if (this.client?.connected || this.connectPromise) return;

    void this.connect().catch((error) => {
      this.logSocketIssue('STOMP foreground reconnect failed', error);
    });
  }

  private createSubscription<T = any>(
    destination: string,
    listeners: Set<(message: any) => void>
  ): StompSubscription {
    return this.client!.subscribe(destination, (frame: IMessage) => {
      try {
        const parsed: T = JSON.parse(frame.body);
        for (const listener of listeners) {
          try {
            listener(parsed);
          } catch (listenerError) {
            this.logSocketIssue('Error in socket listener callback', listenerError);
          }
        }
      } catch (error) {
        this.logSocketIssue('Error parsing socket message', error);
      }
    });
  }

  private resubscribeAll(): void {
    if (!this.client?.connected) return;

    this.subscriptions.forEach((entry, destination) => {
      try {
        entry.subscription.unsubscribe();
      } catch {
        // Ignore stale subscriptions during reconnect.
      }

      entry.subscription = this.createSubscription(destination, entry.listeners);
    });
  }

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
          this.resubscribeAll();

          if (!this.connectPromise) {
            return;
          }

          this.connectPromise = null;
          resolve();
        },
        onStompError: (frame) => {
          this.logSocketIssue('STOMP [STOMP ERROR]', {
            message: frame.headers['message'],
            body: frame.body,
          });
          this.connectPromise = null;
          reject(new Error(frame.headers['message'] || 'STOMP connection failed'));
        },
        onWebSocketError: (event) => {
          this.logSocketIssue('STOMP [WS ERROR]', event);
          this.connectPromise = null;
          reject(new Error('WebSocket connection error'));
        },
        onWebSocketClose: () => {
          this.connectPromise = null;
        },
      });

      this.client.activate();
    });

    return this.connectPromise;
  }

  async subscribe<T = any>(destination: string, callback: (message: T) => void): Promise<void> {
    await this.connect();

    const existing = this.subscriptions.get(destination);
    if (existing) {
      existing.listeners.add(callback as (message: any) => void);
      return;
    }

    const listeners = new Set<(message: any) => void>();
    listeners.add(callback as (message: any) => void);

    const subscription = this.createSubscription<T>(destination, listeners);

    this.subscriptions.set(destination, { subscription, listeners });
  }

  unsubscribe(destination: string, callback?: (message: any) => void): void {
    const entry = this.subscriptions.get(destination);
    if (!entry) return;

    if (callback) {
      entry.listeners.delete(callback as (message: any) => void);
      if (entry.listeners.size > 0) {
        return;
      }
    }

    entry.subscription.unsubscribe();
    this.subscriptions.delete(destination);
  }

  async send(destination: string, body: object): Promise<boolean> {
    try {
      await this.connect();
    } catch (error) {
      this.logSocketIssue('Error connecting before send', error);
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
      this.logSocketIssue('Error sending socket message', error);
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

