// server.js - WhatsApp-Slack Bridge with Multi-Bridge Support (Duplicate Fix)
const WebSocket = require('ws');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { WebClient } = require('@slack/web-api');
const { SocketModeClient } = require('@slack/socket-mode');
const pino = require('pino');
const fs = require('fs');
const axios = require('axios');
const emoji = require('node-emoji');
const store = require('./store');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const PORT = 8080;
const AUTH_FOLDER = 'auth_info_baileys';
const CONFIG_FILE = 'bridge_config.json';

let sock;
let slackClient;
let socketModeClient;
let activeSocket = null;
let bridgeConfig = { slackToken: '', appToken: '', bridges: [] };
let isConnecting = false;
let connectionRetryTimeout = null;
const processedMessages = new Set();

console.clear();
console.log(`🚀 BRIDGE SERVER RUNNING ON PORT ${PORT}`);
console.log("===================================================");

const wss = new WebSocket.Server({ port: PORT }, () => {
    console.log(`✅ Waiting for Frontend...`);
    loadConfig();
});

wss.on('connection', (ws) => {
    console.log(`[${new Date().toLocaleTimeString()}] ⚡ FRONTEND CONNECTED`);
    activeSocket = ws;
    broadcastLog('info', 'Frontend connected.', 'SYSTEM');
    if (sock && sock.user) broadcastState('AUTHENTICATED');
    broadcastBridges(bridgeConfig.bridges);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'PING': break;
                case 'INIT':
                    console.log("Received INIT Payload:", JSON.stringify(data.payload, null, 2));
                    bridgeConfig.slackToken = data.payload.slackToken;
                    bridgeConfig.appToken = data.payload.slackAppToken;
                    saveConfig(bridgeConfig);
                    if (bridgeConfig.slackToken) {
                        slackClient = new WebClient(bridgeConfig.slackToken);
                        broadcastLog('success', 'Slack Web Client ready.', 'SLACK');
                        if (bridgeConfig.appToken) await startSlack(bridgeConfig.appToken);
                    }
                    if (sock && sock.user) {
                        broadcastLog('info', 'Resuming existing WhatsApp session...', 'SYSTEM');
                        broadcastState('AUTHENTICATED');
                        fetchGroups();
                    } else if (!isConnecting) {
                        startWhatsApp();
                    }
                    break;
                case 'UPSERT_BRIDGE':
                    const bridge = data.payload;
                    if (!bridge.id) bridge.id = uuidv4();
                    const existingIndex = bridgeConfig.bridges.findIndex(b => b.id === bridge.id);
                    if (existingIndex >= 0) {
                        bridgeConfig.bridges[existingIndex] = bridge;
                        broadcastLog('success', `Updated bridge: ${bridge.name}`, 'BRIDGE');
                    } else {
                        bridgeConfig.bridges.push(bridge);
                        broadcastLog('success', `Created new bridge: ${bridge.name}`, 'BRIDGE');
                    }
                    saveConfig(bridgeConfig);
                    broadcastBridges(bridgeConfig.bridges);
                    break;
                case 'DELETE_BRIDGE':
                    bridgeConfig.bridges = bridgeConfig.bridges.filter(b => b.id !== data.payload.id);
                    saveConfig(bridgeConfig);
                    broadcastLog('info', 'Bridge deleted.', 'BRIDGE');
                    broadcastBridges(bridgeConfig.bridges);
                    break;
                case 'TOGGLE_BRIDGE':
                    const targetBridge = bridgeConfig.bridges.find(b => b.id === data.payload.id);
                    if (targetBridge) {
                        targetBridge.active = data.payload.active;
                        saveConfig(bridgeConfig);
                        broadcastLog('info', `Bridge ${targetBridge.name} ${targetBridge.active ? 'enabled' : 'disabled'}.`, 'BRIDGE');
                        broadcastBridges(bridgeConfig.bridges);
                    }
                    break;
                case 'RESET':
                    broadcastLog('warning', 'Force resetting session...', 'SYSTEM');
                    bridgeConfig.bridges = [];
                    saveConfig(bridgeConfig);
                    broadcastBridges([]);
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

async function startSlack(appToken) {
    if (socketModeClient) {
        console.log("Socket Mode already running.");
        return;
    }
    console.log("Initializing Slack Socket Mode...");
    try {
        socketModeClient = new SocketModeClient({ appToken: appToken, logLevel: 'debug' });
        socketModeClient.on('message', async ({ event, ack }) => {
            await ack();
            if (event.bot_id || event.subtype === 'bot_message') return;
            if (event.type === 'message') await handleSlackMessage(event);
        });
        await socketModeClient.start();
        console.log("Socket Mode started");
        broadcastLog('success', 'Slack Socket Mode connected.', 'SLACK');
    } catch (e) {
        console.error("Socket Mode Error:", e);
        broadcastLog('error', `Socket Mode Error: ${e.message}`, 'SLACK');
    }
}

async function handleSlackMessage(event) {
    const activeBridges = bridgeConfig.bridges.filter(b => b.active && b.slackChannelId === event.channel);
    if (activeBridges.length === 0) return;
    const text = event.text || "";
    const userId = event.user;
    let senderName = "Slack User";
    if (userId && slackClient) {
        try {
            const userInfo = await slackClient.users.info({ user: userId });
            if (userInfo.ok && userInfo.user) senderName = userInfo.user.real_name || userInfo.user.name;
        } catch (e) { }
    }
    broadcastTraffic('slack', senderName, text || "[Media]");
    if (!sock) return;
    for (const bridge of activeBridges) {
        if (!bridge.whatsappGroupId) continue;
        try {
            let quotedMsg = null;
            if (event.thread_ts) {
                const parentData = store.getWhatsappData(event.thread_ts);
                if (parentData && parentData.id) {
                    quotedMsg = { key: { remoteJid: bridge.whatsappGroupId, id: parentData.id, participant: parentData.participant }, message: { conversation: "Reply" } };
                }
            }
            if (event.files && event.files.length > 0) {
                for (const file of event.files) {
                    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
                        try {
                            const response = await axios.get(file.url_private, { responseType: 'arraybuffer', headers: { 'Authorization': `Bearer ${bridgeConfig.slackToken}` } });
                            const buffer = Buffer.from(response.data);
                            const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
                            const sentMsg = await sock.sendMessage(bridge.whatsappGroupId, { [mediaType]: buffer, caption: `*${senderName}*: ${file.title || file.name}` }, { quoted: quotedMsg });
                            if (sentMsg) {
                                const participant = sentMsg.key.participant || sentMsg.key.remoteJid;
                                store.addMapping(sentMsg.key.id, event.ts, participant);
                            }
                        } catch (downloadError) {
                            console.error("Error downloading/sending Slack file:", downloadError.message);
                        }
                    }
                }
            }
            if (text) {
                const emojifiedText = emoji.emojify(text);
                const sentMsg = await sock.sendMessage(bridge.whatsappGroupId, { text: `*${senderName}*: ${emojifiedText}` }, { quoted: quotedMsg });
                if (sentMsg) {
                    const participant = sentMsg.key.participant || sentMsg.key.remoteJid;
                    store.addMapping(sentMsg.key.id, event.ts, participant);
                }
            }
        } catch (e) {
            console.error(`Failed to send to WhatsApp Group ${bridge.whatsappGroupId}:`, e);
            broadcastLog('error', `Failed to send to WhatsApp (${bridge.name}): ${e.message}`, 'BRIDGE');
        }
    }
}

async function startWhatsApp() {
    if (isConnecting) return;
    isConnecting = true;
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    broadcastState('INITIALIZING');
    try {
        sock = makeWASocket({ auth: state, printQRInTerminal: true, logger: pino({ level: 'silent' }), browser: ["BridgeCommand", "Chrome", "1.0"], connectTimeoutMs: 60000 });
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
                fetchGroups();
            }
        });
        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.message || m.type !== 'notify') return;
            const remoteJid = msg.key.remoteJid;
            const isFromMe = msg.key.fromMe;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
            const isMedia = msg.message.imageMessage || msg.message.videoMessage;
            const activeBridges = bridgeConfig.bridges.filter(b => b.active && b.whatsappGroupId === remoteJid);
            if (activeBridges.length > 0 && !isFromMe && (text || isMedia)) {
                const participant = msg.key.participant || msg.key.remoteJid;
                const msgTime = msg.messageTimestamp || Math.floor(Date.now() / 1000);
                let dedupKey;
                if (isMedia) {
                    try {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage });
                        const mediaHash = crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
                        dedupKey = `${participant}_${mediaHash}_${msgTime}`;
                        if (processedMessages.has(dedupKey)) return;
                        processedMessages.add(dedupKey);
                        if (processedMessages.size > 1000) {
                            const iterator = processedMessages.values();
                            processedMessages.delete(iterator.next().value);
                        }
                        if (slackClient) {
                            for (const bridge of activeBridges) {
                                if (!bridge.slackChannelId) continue;
                                try {
                                    const fileType = isMedia.mimetype.split('/')[1].split(';')[0];
                                    const caption = text ? `From ${msg.pushName || 'WhatsApp User'}: ${text}` : `From ${msg.pushName || 'WhatsApp User'}`;
                                    await slackClient.files.uploadV2({ channel_id: bridge.slackChannelId, file: buffer, filename: `whatsapp_media.${fileType}`, title: caption });
                                    broadcastTraffic('whatsapp', msg.pushName || 'User', text || "[Media]");
                                } catch (e) {
                                    console.error(`Failed to send media:`, e);
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to download media:`, e);
                    }
                } else {
                    const textHash = crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
                    dedupKey = `${participant}_${textHash}_${msgTime}`;
                    if (processedMessages.has(dedupKey)) return;
                    processedMessages.add(dedupKey);
                    if (processedMessages.size > 1000) {
                        const iterator = processedMessages.values();
                        processedMessages.delete(iterator.next().value);
                    }
                    if (slackClient) {
                        for (const bridge of activeBridges) {
                            if (!bridge.slackChannelId) continue;
                            try {
                                const result = await slackClient.chat.postMessage({ channel: bridge.slackChannelId, text: `*${msg.pushName || 'User'}*: ${text}` });
                                if (result.ok) {
                                    const participant2 = msg.key.participant || msg.key.remoteJid;
                                    store.addMapping(msg.key.id, result.ts, participant2);
                                }
                                broadcastTraffic('whatsapp', msg.pushName || 'User', text);
                            } catch (e) {
                                console.error(`Failed to send text:`, e);
                            }
                        }
                    }
                }
            }
        });
    } catch (e) {
        isConnecting = false;
        broadcastLog('error', `Error: ${e.message}`, 'WHATSAPP');
    }
}

async function fetchGroups() {
    if (!sock) return;
    broadcastState('FETCHING_GROUPS');
    try {
        const groups = await sock.groupFetchAllParticipating();
        const formattedGroups = Object.values(groups).map(g => ({ id: g.id, name: g.subject, participantCount: g.participants.length, lastMessageTime: new Date(g.creation * 1000) }));
        broadcastGroups(formattedGroups);
    } catch (e) {
        console.error("Error fetching groups:", e);
    }
}

async function resetSession() {
    if (sock) { sock.end(undefined); sock = null; }
    if (connectionRetryTimeout) clearTimeout(connectionRetryTimeout);
    await new Promise(r => setTimeout(r, 1000));
    try { if (fs.existsSync(AUTH_FOLDER)) fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch (e) { }
    startWhatsApp();
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log("Configuration saved to file.");
    } catch (e) {
        console.error("Failed to save configuration:", e);
    }
}

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            const rawConfig = JSON.parse(data);
            if (rawConfig.targetGroup && (!rawConfig.bridges || rawConfig.bridges.length === 0)) {
                console.log("Migrating legacy config to new bridge structure...");
                bridgeConfig.bridges.push({ id: uuidv4(), name: "Default Bridge", active: true, slackChannelId: rawConfig.slackChannel, whatsappGroupId: rawConfig.targetGroup });
                delete rawConfig.targetGroup;
                delete rawConfig.slackChannel;
            }
            bridgeConfig = { ...bridgeConfig, ...rawConfig };
            if (!Array.isArray(bridgeConfig.bridges)) bridgeConfig.bridges = [];
            console.log("Loaded configuration from file:", bridgeConfig);
            if (bridgeConfig.slackToken) {
                slackClient = new WebClient(bridgeConfig.slackToken);
                console.log("Slack Web Client initialized from saved config.");
                if (bridgeConfig.appToken) startSlack(bridgeConfig.appToken);
            }
            const hasActiveBridges = bridgeConfig.bridges.some(b => b.active);
            if (hasActiveBridges && !isConnecting) {
                console.log("Auto-starting WhatsApp (Active bridges found)...");
                startWhatsApp();
            }
        } catch (e) {
            console.error("Failed to load configuration:", e);
        }
    }
}

function broadcastState(state) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'STATE_CHANGE', state })); }
function broadcastLog(level, message, source) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'LOG', entry: { id: Date.now().toString() + Math.random(), timestamp: new Date(), level, message, source } })); }
function broadcastQR(qr) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'QR_CODE', qr })); }
function broadcastGroups(groups) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'GROUPS_LIST', groups })); }
function broadcastBridges(bridges) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'BRIDGES_LIST', bridges })); }
function broadcastTraffic(platform, sender, content) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'TRAFFIC', traffic: { id: Date.now().toString(), platform, sender, content, timestamp: new Date() } })); }