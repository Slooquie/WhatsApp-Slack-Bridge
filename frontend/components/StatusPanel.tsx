import React from 'react';
import QRCode from 'react-qr-code';
import { BridgeState } from '../types';
import { ShieldCheck, AlertCircle, Loader2, Smartphone } from 'lucide-react';

interface StatusPanelProps {
    state: BridgeState;
    qrCode: string;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ state, qrCode }) => {
    return (
        <div className="bg-[#1e293b]/50 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ActivityIcon state={state} />
                System Status
            </h3>

            <div className="space-y-6">
                {/* Connection State */}
                <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl">
                    <span className="text-gray-400">Connection</span>
                    <span className={`font-mono font-bold ${getStateColor(state)}`}>
                        {state}
                    </span>
                </div>

                {/* QR Code Display */}
                {state === BridgeState.WAITING_FOR_QR && qrCode && (
                    <div className="flex flex-col items-center space-y-4 bg-white p-6 rounded-xl">
                        <QRCode value={qrCode} size={200} />
                        <p className="text-gray-900 font-medium text-center">
                            Scan with WhatsApp<br />
                            <span className="text-sm text-gray-500">Settings {'>'} Linked Devices</span>
                        </p>
                    </div>
                )}

                {/* Instructions based on state */}
                <div className="text-sm text-gray-400 bg-gray-900/30 p-4 rounded-xl border border-gray-800">
                    {state === BridgeState.IDLE && "Click 'Connect' to start the bridge server."}
                    {state === BridgeState.INITIALIZING && "Initializing connection to backend..."}
                    {state === BridgeState.WAITING_FOR_QR && "Please scan the QR code to authenticate WhatsApp."}
                    {state === BridgeState.AUTHENTICATED && "WhatsApp authenticated. Fetching data..."}
                    {state === BridgeState.BRIDGING && "Bridge is active. Messages are being synced."}
                    {state === BridgeState.ERROR && "An error occurred. Check logs for details."}
                </div>
            </div>
        </div>
    );
};

const ActivityIcon = ({ state }: { state: BridgeState }) => {
    switch (state) {
        case BridgeState.BRIDGING: return <ShieldCheck className="text-green-500" />;
        case BridgeState.ERROR: return <AlertCircle className="text-red-500" />;
        case BridgeState.WAITING_FOR_QR: return <Smartphone className="text-blue-500" />;
        case BridgeState.INITIALIZING:
        case BridgeState.CONNECTING: return <Loader2 className="text-yellow-500 animate-spin" />;
        default: return <div className="w-6 h-6 rounded-full border-2 border-gray-600" />;
    }
};

const getStateColor = (state: BridgeState) => {
    switch (state) {
        case BridgeState.BRIDGING: return 'text-green-400';
        case BridgeState.ERROR: return 'text-red-400';
        case BridgeState.WAITING_FOR_QR: return 'text-blue-400';
        default: return 'text-gray-400';
    }
};
