
import { BridgeState } from "./types";

export const STATUS_LABELS: Record<BridgeState, string> = {
  [BridgeState.IDLE]: 'System Idle',
  [BridgeState.CONNECTING]: 'Connecting to Backend...',
  [BridgeState.INITIALIZING]: 'Initializing Protocol...',
  [BridgeState.WAITING_FOR_QR]: 'Awaiting QR Scan',
  [BridgeState.AUTHENTICATED]: 'Session Established',
  [BridgeState.FETCHING_GROUPS]: 'Querying Group List...',
  [BridgeState.GROUP_SELECTION]: 'Select Target Group',
  [BridgeState.BRIDGING]: 'Active Bridge',
  [BridgeState.ERROR]: 'Connection Error'
};
