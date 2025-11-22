
import React, { useState, useCallback, useEffect } from 'react';
import { BridgeState, BridgeConfig, LogEntry, WhatsAppGroup, MessageTraffic } from './types';
import { STATUS_LABELS } from './constants';
import Terminal from './components/Terminal';
import ConfigPanel from './components/ConfigPanel';
import GroupSelector from './components/GroupSelector';
import { bridgeService } from './services/bridgeService';
import { Play, Power, RefreshCw, ShieldAlert, ArrowRightLeft, MessageCircle, Hash, Smartphone, AlertCircle, Trash2 } from 'lucide-react';
import QRCode from 'react-qr-code';

const App: React.FC = () => {
  const [bridgeState, setBridgeState] = useState<BridgeState>(BridgeState.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const DEFAULT_CONFIG: BridgeConfig = {
    backendUrl: 'ws://127.0.0.1:8080',
    slackBotToken: '',
    slackAppToken: '',
    slackChannelId: '',
    targetWhatsAppGroupId: ''
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
        onTraffic: addTraffic
      });
    }

    return () => {
      bridgeService.stop();
    };
  }, []); // Run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      bridgeService.stop();
    };
  }, []);

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
      onTraffic: addTraffic
    });
  };

  const handleGroupSelect = (id: string) => {
    setConfig(prev => ({ ...prev, targetWhatsAppGroupId: id }));
    bridgeService.selectGroup(id);
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
    if (window.confirm("This will force the backend to restart the WhatsApp session. Use this if the connection is stuck. Continue?")) {
      bridgeService.resetSession();
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-300 font-sans selection:bg-whatsapp-green selection:text-black flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-terminal-black/90 backdrop-blur p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-whatsapp-green to-emerald-800 rounded flex items-center justify-center shadow-lg shadow-green-900/20">
              <ArrowRightLeft className="text-white" size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">BridgeCommand</h1>
              <p className="text-xs text-gray-500 hidden sm:block">WhatsApp &harr; Slack Gateway Control</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full border ${bridgeState === BridgeState.BRIDGING ? 'border-green-500/30 bg-green-500/10 text-green-400' : bridgeState === BridgeState.ERROR ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-gray-700 bg-gray-800 text-gray-400'} text-xs font-mono flex items-center gap-2 transition-all duration-500`}>
              <div className={`w-2 h-2 rounded-full ${bridgeState === BridgeState.BRIDGING ? 'bg-green-500 animate-pulse' : bridgeState === BridgeState.ERROR ? 'bg-red-500' : 'bg-gray-500'}`}></div>
              {STATUS_LABELS[bridgeState] || bridgeState}
            </div>

            {bridgeState !== BridgeState.IDLE && bridgeState !== BridgeState.ERROR && (
              <button
                onClick={handleReset}
                title="Reset WhatsApp Session"
                className="p-2 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}

            {bridgeState === BridgeState.IDLE || bridgeState === BridgeState.ERROR ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-4 py-2 rounded text-sm font-bold transition-colors shadow-lg shadow-white/10"
              >
                <Play size={16} /> Connect
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/30 px-4 py-2 rounded text-sm font-bold transition-colors"
              >
                <Power size={16} /> Disconnect
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 w-full">

        {/* Left Column: Config & Interactions */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">

          {/* Config Panel */}
          <ConfigPanel
            config={config}
            onUpdate={setConfig}
            locked={bridgeState !== BridgeState.IDLE && bridgeState !== BridgeState.ERROR}
          />

          {/* Action Area */}
          <div className="bg-terminal-gray/30 border border-terminal-gray rounded-lg p-6 flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden grow transition-all duration-500">

            {(bridgeState === BridgeState.IDLE || bridgeState === BridgeState.ERROR) && (
              <div className="text-center space-y-4 z-10 animate-in fade-in zoom-in duration-300">
                {bridgeState === BridgeState.ERROR ? (
                  <AlertCircle size={48} className="mx-auto text-red-500" />
                ) : (
                  <ShieldAlert size={48} className="mx-auto text-gray-600" />
                )}
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  {bridgeState === BridgeState.ERROR
                    ? "Connection failed. Ensure the backend is running on the specified URL."
                    : "Ready to connect to backend server."}
                </p>
              </div>
            )}

            {(bridgeState === BridgeState.INITIALIZING || bridgeState === BridgeState.CONNECTING) && (
              <div className="text-center space-y-4 z-10 animate-in fade-in duration-300">
                <RefreshCw size={48} className="mx-auto text-blue-500 animate-spin" />
                <p className="text-sm text-blue-400 font-mono">
                  {bridgeState === BridgeState.INITIALIZING ? 'Initializing Protocol...' : 'Connecting to Backend...'}
                </p>
              </div>
            )}

            {bridgeState === BridgeState.WAITING_FOR_QR && (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-4 z-10 animate-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                    <Smartphone className="text-gray-500" size={20} />
                    <span>Scan with WhatsApp</span>
                  </h2>
                </div>

                {/* QR Container */}
                <div className="bg-white p-3 rounded-xl shadow-lg">
                  {qrCodeData ? (
                    <QRCode
                      value={qrCodeData}
                      size={220}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox={`0 0 256 256`}
                    />
                  ) : (
                    <div className="w-[220px] h-[220px] flex items-center justify-center text-black font-mono text-xs">
                      Waiting for QR data...
                    </div>
                  )}
                </div>

                <p className="text-xs text-center text-gray-400 max-w-[250px] mx-auto">
                  Open WhatsApp on your phone &gt; Linked Devices &gt; Link a Device
                </p>
              </div>
            )}

            {bridgeState === BridgeState.GROUP_SELECTION && (
              <div className="w-full h-full absolute inset-0 animate-in fade-in duration-300">
                <GroupSelector groups={groups} onSelect={handleGroupSelect} />
              </div>
            )}

            {bridgeState === BridgeState.BRIDGING && (
              <div className="text-center space-y-4 z-10 animate-in zoom-in duration-500">
                <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto relative">
                  <div className="absolute inset-0 border-2 border-green-500/30 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                  <div className="absolute inset-2 border border-green-500/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_500ms]"></div>
                  <ArrowRightLeft size={40} className="text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                </div>
                <div>
                  <p className="text-green-400 font-bold text-lg">Bridge Active</p>
                  <p className="text-xs text-gray-500 mt-1">{traffic.length} messages processed</p>
                </div>
              </div>
            )}

          </div>

          {/* Recent Traffic Preview */}
          {traffic.length > 0 && (
            <div className="bg-terminal-black border border-gray-800 rounded-lg p-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center justify-center lg:justify-between">
                <span>Live Traffic</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                </div>
              </h3>
              <div className="space-y-3">
                {traffic.map(t => (
                  <div key={t.id} className="flex gap-3 items-start text-xs group">
                    <div className={`mt-0.5 p-1.5 rounded shrink-0 transition-colors ${t.platform === 'whatsapp' ? 'bg-whatsapp-green text-black shadow-[0_0_10px_rgba(37,211,102,0.2)]' : 'bg-slack-purple text-white shadow-[0_0_10px_rgba(74,21,75,0.4)]'}`}>
                      {t.platform === 'whatsapp' ? <MessageCircle size={12} /> : <Hash size={12} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-gray-300 truncate">{t.sender}</span>
                        <span className="text-[9px] text-gray-600">{t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <p className="text-gray-500 group-hover:text-gray-400 transition-colors break-words leading-relaxed">{t.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Terminal */}
        <div className="lg:col-span-8 h-[600px] lg:h-auto flex flex-col">
          <Terminal logs={logs} />
        </div>
      </main>

      <footer className="max-w-7xl mx-auto p-4 text-center text-[10px] text-gray-600 w-full border-t border-gray-900/50 mt-4">
        <p>BridgeCommand Control Panel v1.0</p>
      </footer>
    </div>
  );
};

export default App;
