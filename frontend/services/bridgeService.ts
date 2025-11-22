
import { BridgeState, LogEntry, MessageTraffic, WhatsAppGroup, BridgeConfig } from "../types";

interface BridgeCallbacks {
  onLog: (log: LogEntry) => void;
  onStateChange: (state: BridgeState) => void;
  onQR: (qrData: string) => void;
  onGroups: (groups: WhatsAppGroup[]) => void;
  onTraffic: (traffic: MessageTraffic) => void;
}

export class BridgeService {
  private ws: WebSocket | null = null;
  private callbacks: BridgeCallbacks | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private isExplicitlyStopped = false;

  connect(config: BridgeConfig, callbacks: BridgeCallbacks, isRetry = false) {
    if (this.ws) {
      this.stop();
    }

    this.callbacks = callbacks;
    this.isExplicitlyStopped = false;

    if (!isRetry) {
      this.retryCount = 0;
      this.log('info', `Initiating connection to ${config.backendUrl}...`, 'SYSTEM');
    }

    this.callbacks.onStateChange(BridgeState.CONNECTING);

    try {
      this.ws = new WebSocket(config.backendUrl);

      this.ws.onopen = () => {
        this.log('success', 'Connected to Backend Bridge Server.', 'SYSTEM');
        this.retryCount = 0;

        // Force state to INITIALIZING
        this.callbacks?.onStateChange(BridgeState.INITIALIZING);

        // Start keep-alive
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 30000);

        // Add a small delay before sending INIT to ensure connection is stable
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.log('info', 'Sending initialization handshake...', 'SYSTEM');
            this.sendMessage({
              type: 'INIT',
              payload: {
                slackToken: config.slackBotToken,
                slackAppToken: config.slackAppToken,
                slackChannel: config.slackChannelId,
                targetGroup: config.targetWhatsAppGroupId
              }
            });
          }
        }, 500);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error("Failed to parse websocket message", e);
          this.log('error', 'Received malformed data from backend.', 'SYSTEM');
        }
      };

      this.ws.onerror = (event: Event) => {
        // Log clearer error message
        console.error("WebSocket Error Details:", event);
        this.log('error', 'Connection error detected. Check if backend is running.', 'SYSTEM');
      };

      this.ws.onclose = (event) => {
        this.cleanup();

        if (this.isExplicitlyStopped) {
          this.log('info', 'Disconnected from backend.', 'SYSTEM');
          this.callbacks?.onStateChange(BridgeState.IDLE);
          return;
        }

        // Update state to CONNECTING so user sees we are retrying (instead of stuck on INITIALIZING)
        this.callbacks?.onStateChange(BridgeState.CONNECTING);

        if (this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          const delay = 2000;
          this.log('warning', `Connection lost (Code: ${event.code}). Retrying in ${delay / 1000}s... (Attempt ${this.retryCount}/${this.MAX_RETRIES})`, 'SYSTEM');

          this.reconnectTimeout = setTimeout(() => {
            this.connect(config, callbacks, true);
          }, delay);
        } else {
          this.log('error', 'Connection failed after multiple attempts. Check backend terminal.', 'SYSTEM');
          this.callbacks?.onStateChange(BridgeState.ERROR);
          this.retryCount = 0;
        }
      };

    } catch (e: any) {
      this.log('error', `Critical Connection Error: ${e.message}`, 'SYSTEM');
      this.callbacks?.onStateChange(BridgeState.ERROR);
    }
  }

  private handleMessage(data: any) {
    if (!this.callbacks) return;

    switch (data.type) {
      case 'STATE_CHANGE':
        // Ignore IDLE if we are already connected/processing
        if (data.state === 'IDLE' && this.ws?.readyState === WebSocket.OPEN) {
          return;
        }
        this.callbacks.onStateChange(data.state as BridgeState);
        break;
      case 'LOG':
        this.callbacks.onLog({ ...data.entry, timestamp: new Date(data.entry.timestamp) });
        break;
      case 'QR_CODE':
        this.callbacks.onQR(data.qr);
        break;
      case 'GROUPS_LIST':
        const groups = data.groups.map((g: any) => ({ ...g, lastMessageTime: new Date(g.lastMessageTime) }));
        this.callbacks.onGroups(groups);
        break;
      case 'TRAFFIC':
        this.callbacks.onTraffic({ ...data.traffic, timestamp: new Date(data.traffic.timestamp) });
        break;
    }
  }

  selectGroup(groupId: string) {
    this.sendMessage({
      type: 'SELECT_GROUP',
      payload: { groupId }
    });
  }

  resetSession() {
    this.log('warning', 'Sending RESET command to backend...', 'SYSTEM');
    this.sendMessage({ type: 'RESET' });
  }

  stop() {
    this.isExplicitlyStopped = true;
    if (this.ws) {
      this.ws.close();
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.ws = null;
  }

  private sendMessage(msg: { type: string; payload?: any }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private log(level: LogEntry['level'], message: string, source: LogEntry['source']) {
    console.log(`[${source}] ${message}`);
    this.callbacks?.onLog({
      id: Date.now().toString() + Math.random(),
      timestamp: new Date(),
      level,
      message,
      source
    });
  }
}

export const bridgeService = new BridgeService();
