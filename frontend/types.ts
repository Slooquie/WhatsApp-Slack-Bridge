
export enum BridgeState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  INITIALIZING = 'INITIALIZING',
  WAITING_FOR_QR = 'WAITING_FOR_QR',
  AUTHENTICATED = 'AUTHENTICATED',
  FETCHING_GROUPS = 'FETCHING_GROUPS',
  GROUP_SELECTION = 'GROUP_SELECTION',
  BRIDGING = 'BRIDGING',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error' | 'debug';
  message: string;
  source: 'SYSTEM' | 'WHATSAPP' | 'SLACK' | 'BRIDGE' | 'CRYPTO';
}

export interface WhatsAppGroup {
  id: string;
  name: string;
  participantCount: number;
  lastMessageTime: Date;
}

export interface BridgeConfig {
  backendUrl: string;
  slackBotToken: string;
  slackAppToken: string;
  slackChannelId: string;
  targetWhatsAppGroupId: string;
}

export interface MessageTraffic {
  id: string;
  platform: 'whatsapp' | 'slack';
  sender: string;
  content: string;
  timestamp: Date;
}
