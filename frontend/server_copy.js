// server.js (v4 - Fix IDLE Reset)
const WebSocket = require('ws');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { WebClient } = require('@slack/web-api');
const pino = require('pino');
const fs = require('fs');

const PORT = 8080;
const AUTH_FOLDER = 'auth_info_baileys';

// State
let sock;
let slackClient;
let activeSocket = null;
let bridgeConfig = { slackToken: '', slackChannel: '', targetGroup: '' };
let isConnecting = false;
let connectionRetryTimeout = null;

console.clear();
console.log(`🚀 BRIDGE SERVER RUNNING ON PORT ${PORT}`);
console.log("===================================================");

const wss = new WebSocket.Server({ port: PORT }, () => {
    console.log(`✅ Waiting for Frontend...`);
});

wss.on('connection', (ws) => {
    console.log(`[${new Date().toLocaleTimeString()}] ⚡ FRONTEND CONNECTED`);
    activeSocket = ws;
    broadcastLog('info', 'Frontend connected.', 'SYSTEM');
    
    // DO NOT broadcast IDLE here, it resets the frontend UI!

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'PING': break;

                case 'INIT':
                    bridgeConfig.slackToken = data.payload.slackToken;
                    bridgeConfig.slackChannel = data.payload.slackChannel;
                    if (bridgeConfig.slackToken) {
                        slackClient = new WebClient(bridgeConfig.slackToken);
                        broadcastLog('success', 'Slack client ready.', 'SLACK');
                    }

                    if (sock && sock.user) {
                        broadcastLog('info', 'Resuming existing WhatsApp session...', 'SYSTEM');
                        broadcastState('AUTHENTICATED');
                        fetchGroups();
                    } else if (!isConnecting) {
                        startWhatsApp();
                    }
                    break;

                case 'SELECT_GROUP':
                    bridgeConfig.targetGroup = data.payload.groupId;
                    broadcastLog('success', `Target Group: ${data.payload.groupId}`, 'BRIDGE');
                    broadcastState('BRIDGING');
                    break;

                case 'RESET':
                    broadcastLog('warning', 'Force resetting session...', 'SYSTEM');
                    await resetSession();
                    break;
            }
        } catch (e) {
            console.error('Error:', e);
        }
    });

    ws.on('close', () => {
        console.log(`[${new Date().toLocaleTimeString()}] ❌ Frontend Disconnected`);
        activeSocket = null;
    });
});

// Helpers
function broadcastState(state) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'STATE_CHANGE', state })); }
function broadcastLog(level, message, source) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'LOG', entry: { id: Date.now().toString() + Math.random(), timestamp: new Date(), level, message, source } })); }
function broadcastQR(qr) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'QR_CODE', qr })); }
function broadcastGroups(groups) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'GROUPS_LIST', groups })); }
function broadcastTraffic(platform, sender, content) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'TRAFFIC', traffic: { id: Date.now().toString(), platform, sender, content, timestamp: new Date() } })); }

async function resetSession() {
    if (sock) { sock.end(undefined); sock = null; }
    if (connectionRetryTimeout) clearTimeout(connectionRetryTimeout);
    await new Promise(r => setTimeout(r, 1000));
    try { if (fs.existsSync(AUTH_FOLDER)) fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch (e) {}
    startWhatsApp();
}

async function startWhatsApp() {
    if (isConnecting) return;
    isConnecting = true;
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    broadcastState('INITIALIZING');
    try {
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger: pino({ level: 'silent' }),
            browser: ["BridgeCommand", "Chrome", "1.0"],
            connectTimeoutMs: 60000,
        });

        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                broadcastState('WAITING_FOR_QR');
                broadcastQR(qr);
            }
            if (connection === 'close') {
                isConnecting = false;
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    if (connectionRetryTimeout) clearTimeout(connectionRetryTimeout);
                    connectionRetryTimeout = setTimeout(startWhatsApp, 3000);
                } else {
                    broadcastState('ERROR');
                    sock = null;
                }
            } else if (connection === 'open') {
                isConnecting = false;
                broadcastState('AUTHENTICATED');
                setTimeout(fetchGroups, 2000);
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.message || m.type !== 'notify') return;
            const remoteJid = msg.key.remoteJid;
            const isFromMe = msg.key.fromMe;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

            if (bridgeConfig.targetGroup && remoteJid === bridgeConfig.targetGroup) {
                if (!isFromMe && text) {
                    broadcastTraffic('whatsapp', msg.pushName || 'Unknown', text);
                    if (slackClient && bridgeConfig.slackChannel) {
                        try { await slackClient.chat.postMessage({ channel: bridgeConfig.slackChannel, text: `*${msg.pushName || 'User'}*: ${text}` }); } catch (e) {}
                    }
                }
            }
        });
    } catch (e) { isConnecting = false; broadcastLog('error', `Error: ${e.message}`, 'WHATSAPP'); }
}

async function fetchGroups() {
    if (!sock) return;
    broadcastState('FETCHING_GROUPS');
    try {
        const groups = await sock.groupFetchAllParticipating();
        const formattedGroups = Object.values(groups).map(g => ({ id: g.id, name: g.subject, participantCount: g.participants.length, lastMessageTime: new Date(g.creation * 1000) }));
        broadcastGroups(formattedGroups);
        broadcastState('GROUP_SELECTION');
    } catch (e) {}
}