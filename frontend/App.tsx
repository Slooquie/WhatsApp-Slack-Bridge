import React, { useState, useEffect, useCallback } from 'react';
import { bridgeService, BridgeConfig, Bridge } from './services/bridgeService';
import { BridgeState, LogEntry, WhatsAppGroup, MessageTraffic } from './types';
import { ConfigPanel } from './components/ConfigPanel';
import { StatusPanel } from './components/StatusPanel';
import { LogPanel } from './components/LogPanel';
import { TrafficPanel } from './components/TrafficPanel';
import { BridgeDashboard } from './components/BridgeDashboard';
import { MessageSquare, Trash2 } from 'lucide-react';

const App: React.FC = () => {
  const [bridgeState, setBridgeState] = useState<BridgeState>(BridgeState.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const DEFAULT_CONFIG: BridgeConfig = {
    backendUrl: 'ws://127.0.0.1:8080',
    slackBotToken: '',
    slackAppToken: '',
    bridges: []
  };

  const [config, setConfig] = useState<BridgeConfig>(() => {
    const saved = localStorage.getItem('bridgeConfig');
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  });

  const [autoConnect, setAutoConnect] = useState<boolean>(() => {
    return localStorage.getItem('autoConnect') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('bridgeConfig', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('autoConnect', String(autoConnect));
  }, [autoConnect]);

  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [traffic, setTraffic] = useState<MessageTraffic[]>([]);
  const [qrCodeData, setQrCodeData] = useState<string>("");

  // Auto-connect on mount if config exists and autoConnect is true
  useEffect(() => {
    if (config.backendUrl && autoConnect) {
      bridgeService.connect(config, {
        onLog: addLog,
        onStateChange: setBridgeState,
        onQR: setQrCodeData,
        onGroups: setGroups,
        onTraffic: addTraffic,
        onBridges: setBridges
      });
    }

    return () => {
      bridgeService.stop();
    };
  }, []); // Run once on mount

  const addLog = useCallback((log: LogEntry) => {
    setLogs(prev => [...prev.slice(-200), log]);
  }, []);

  const addTraffic = useCallback((msg: MessageTraffic) => {
    setTraffic(prev => [msg, ...prev.slice(0, 10)]);
  }, []);

  const handleStart = () => {
    if (!config.backendUrl) {
      addLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: "Backend URL is required.",
        source: 'SYSTEM'
      });
      return;
    }

    setAutoConnect(true);
    bridgeService.connect(config, {
      onLog: addLog,
      onStateChange: setBridgeState,
      onQR: setQrCodeData,
      onGroups: setGroups,
      onTraffic: addTraffic,
      onBridges: setBridges
    });
  };

  const handleStop = () => {
    setAutoConnect(false);
    bridgeService.stop();
    setBridgeState(BridgeState.IDLE);
    addLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'warning',
      message: "Disconnected.",
      source: 'SYSTEM'
    });
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the session? This will clear all bridges and require re-authentication.")) {
      bridgeService.resetSession();
      setBridges([]);
    }
  };

  const handleUpsertBridge = (bridge: Bridge) => {
    bridgeService.upsertBridge(bridge);
  };

  const handleDeleteBridge = (id: string) => {
    if (confirm("Are you sure you want to delete this bridge?")) {
      bridgeService.deleteBridge(id);
    }
  };

  const handleToggleBridge = (id: string, active: boolean) => {
    bridgeService.toggleBridge(id, active);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="bg-[#1e293b]/80 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-green-400 to-blue-500 p-2 rounded-lg shadow-lg shadow-green-500/20">
              <MessageSquare size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              WhatsApp-Slack Bridge
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {bridgeState !== BridgeState.IDLE && (
              <button
                onClick={handleReset}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Reset Session"
              >
                <Trash2 size={20} />
              </button>
            )}
            <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2 ${bridgeState === BridgeState.BRIDGING ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                bridgeState === BridgeState.ERROR ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
              <span className={`w-2 h-2 rounded-full ${bridgeState === BridgeState.BRIDGING ? 'bg-green-500 animate-pulse' :
                  bridgeState === BridgeState.ERROR ? 'bg-red-500' :
                    'bg-blue-500 animate-pulse'
                }`} />
              <span>{bridgeState}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Top Row: Config & Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <ConfigPanel
              config={config}
              setConfig={setConfig}
              onStart={handleStart}
              onStop={handleStop}
              isConnected={bridgeState !== BridgeState.IDLE}
            />
            <StatusPanel
              state={bridgeState}
              qrCode={qrCodeData}
            />
          </div>

          <div className="lg:col-span-2 space-y-8">
            {/* Bridge Dashboard */}
            {bridgeState !== BridgeState.IDLE && (
              <section className="bg-[#1e293b]/50 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
                <BridgeDashboard
                  bridges={bridges}
                  onUpsertBridge={handleUpsertBridge}
                  onDeleteBridge={handleDeleteBridge}
                  onToggleBridge={handleToggleBridge}
                />
              </section>
            )}

            {/* Traffic Monitor */}
            <TrafficPanel traffic={traffic} />

            {/* Logs */}
            <LogPanel logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
