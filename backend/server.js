// server.js (v12 - App Token from Frontend)
const WebSocket = require('ws');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { WebClient } = require('@slack/web-api');
const { SocketModeClient } = require('@slack/socket-mode');
const pino = require('pino');
const fs = require('fs');
const axios = require('axios');
const emoji = require('node-emoji');
const store = require('./store'); // Import MessageStore

const PORT = 8080;
const AUTH_FOLDER = 'auth_info_baileys';

// State
let sock;
let slackClient;
let socketModeClient;
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

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'PING': break;

                case 'INIT':
                    console.log("Received IN IT:", data.payload); // DEBUG
                    bridgeConfig.slackToken = data.payload.slackToken;
                    bridgeConfig.slackChannel = data.payload.slackChannel;
                    const appToken = data.payload.slackAppToken;

                    if (bridgeConfig.slackToken) {
                        // Initialize Web Client
                        slackClient = new WebClient(bridgeConfig.slackToken);
                        broadcastLog('success', 'Slack Web Client ready.', 'SLACK');

                        // Initialize Socket Mode
                        if (!socketModeClient && appToken) {
                            console.log("Initializing Socket Mode with App Token from frontend"); // DEBUG
                            try {
                                socketModeClient = new SocketModeClient({ appToken: appToken, logLevel: 'debug' });

                                socketModeClient.on('message', async ({ event, ack }) => {
                                    await ack();

                                    if (event.bot_id || event.subtype === 'bot_message') return;

                                    if (event.type === 'message') {
                                        console.log(`Slack Message received in channel ${event.channel}. Configured channel: ${bridgeConfig.slackChannel}`); // DEBUG

                                        if (event.channel === bridgeConfig.slackChannel) {
                                            const text = event.text || "";
                                            const userId = event.user;
                                            let senderName = "Slack User";

                                            // Fetch user info to get name
                                            if (userId && slackClient) {
                                                try {
                                                    const userInfo = await slackClient.users.info({ user: userId });
                                                    if (userInfo.ok && userInfo.user) {
                                                        senderName = userInfo.user.real_name || userInfo.user.name;
                                                    }
                                                } catch (e) {
                                                    console.error("Failed to fetch Slack user info:", e);
                                                }
                                            }

                                            broadcastTraffic('slack', senderName, text || "[Media]");

                                            if (sock && bridgeConfig.targetGroup) {
                                                try {
                                                    // Check for Thread Reply (Slack -> WhatsApp)
                                                    let quotedMsg = null;
                                                    if (event.thread_ts) {
                                                        const parentData = store.getWhatsappData(event.thread_ts);
                                                        if (parentData && parentData.id) {
                                                            console.log(`Found parent WhatsApp ID for thread ${event.thread_ts}: ${parentData.id}`);
                                                            quotedMsg = {
                                                                key: {
                                                                    remoteJid: bridgeConfig.targetGroup,
                                                                    id: parentData.id,
                                                                    participant: parentData.participant
                                                                },
                                                                message: { conversation: "Reply" }
                                                            };
                                                        }
                                                    }

                                                    // Handle Files (Images)
                                                    if (event.files && event.files.length > 0) {
                                                        for (const file of event.files) {
                                                            if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
                                                                console.log(`Downloading file from Slack: ${file.name}, URL: ${file.url_private}`);

                                                                try {
                                                                    const response = await axios.get(file.url_private, {
                                                                        responseType: 'arraybuffer',
                                                                        headers: { 'Authorization': `Bearer ${bridgeConfig.slackToken}` }
                                                                    });

                                                                    console.log(`Downloaded ${response.data.byteLength} bytes. Content-Type: ${response.headers['content-type']}`);

                                                                    const buffer = Buffer.from(response.data);
                                                                    const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';

                                                                    const sentMsg = await sock.sendMessage(bridgeConfig.targetGroup, {
                                                                        [mediaType]: buffer,
                                                                        caption: `*${senderName}*: ${file.title || file.name}`
                                                                    }, { quoted: quotedMsg });

                                                                    if (sentMsg) {
                                                                        const participant = sentMsg.key.participant || sentMsg.key.remoteJid;
                                                                        store.addMapping(sentMsg.key.id, event.ts, participant);
                                                                        console.log(`Mapped Slack TS ${event.ts} to WhatsApp ID ${sentMsg.key.id}`);
                                                                    }
                                                                    console.log(`Sent ${mediaType} to WhatsApp`);
                                                                } catch (downloadError) {
                                                                    console.error("Error downloading/sending Slack file:", downloadError.message);
                                                                }
                                                            }
                                                        }
                                                    }

                                                    // Handle Text
                                                    if (text) {
                                                        console.log(`Forwarding to WhatsApp Group: ${bridgeConfig.targetGroup}`);
                                                        const emojifiedText = emoji.emojify(text);
                                                        const sentMsg = await sock.sendMessage(bridgeConfig.targetGroup, {
                                                            text: `*${senderName}*: ${emojifiedText}`
                                                        }, { quoted: quotedMsg });

                                                        if (sentMsg) {
                                                            const participant = sentMsg.key.participant || sentMsg.key.remoteJid;
                                                            store.addMapping(sentMsg.key.id, event.ts, participant);
                                                            console.log(`Mapped Slack TS ${event.ts} to WhatsApp ID ${sentMsg.key.id}`);
                                                        }
                                                        console.log("Forwarded to WhatsApp successfully");
                                                    }
                                                } catch (e) {
                                                    console.error("Failed to send to WhatsApp:", e);
                                                    broadcastLog('error', `Failed to send to WhatsApp: ${e.message}`, 'BRIDGE');
                                                }
                                            } else {
                                                console.log("Cannot forward: sock or targetGroup missing", { sock: !!sock, targetGroup: bridgeConfig.targetGroup });
                                            }
                                        }
                                    }
                                });

                                await socketModeClient.start();
                                console.log("Socket Mode started");
                                broadcastLog('success', 'Slack Socket Mode connected.', 'SLACK');
                            } catch (e) {
                                console.error("Socket Mode Error:", e);
                                broadcastLog('error', `Socket Mode Error: ${e.message}`, 'SLACK');
                            }
                        } else if (!appToken) {
                            broadcastLog('warning', 'No App Token provided. Please enter your Slack App-Level Token in the frontend.', 'SLACK');
                        }
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
                    console.log("Selected Group:", bridgeConfig.targetGroup); // DEBUG
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
    try { if (fs.existsSync(AUTH_FOLDER)) fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch (e) { }
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
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
            const isMedia = msg.message.imageMessage || msg.message.videoMessage;

            if (bridgeConfig.targetGroup && remoteJid === bridgeConfig.targetGroup) {
                if (!isFromMe && (text || isMedia)) {

                    if (slackClient && bridgeConfig.slackChannel) {
                        try {
                            let slackThreadTs = null;
                            // Check for Reply (WhatsApp -> Slack)
                            const contextInfo = msg.message.extendedTextMessage?.contextInfo || msg.message.imageMessage?.contextInfo || msg.message.videoMessage?.contextInfo;
                            if (contextInfo && contextInfo.stanzaId) {
                                const parentSlackTs = store.getSlackTs(contextInfo.stanzaId);
                                if (parentSlackTs) {
                                    console.log(`Found parent Slack TS for WhatsApp message ${contextInfo.stanzaId}: ${parentSlackTs}`);
                                    slackThreadTs = parentSlackTs;
                                }
                            }

                            if (isMedia) {
                                const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage });
                                const fileType = isMedia.mimetype.split('/')[1].split(';')[0];
                                const fileName = `whatsapp_media.${fileType}`;

                                console.log(`Uploading ${fileName} to Slack...`);
                                const uploadResult = await slackClient.files.uploadV2({
                                    channel_id: bridgeConfig.slackChannel,
                                    file: buffer,
                                    filename: fileName,
                                    title: `From ${msg.pushName || 'WhatsApp User'}`,
                                    thread_ts: slackThreadTs
                                });

                                if (uploadResult.ok) {
                                    console.log("Media uploaded to Slack");
                                }
                            } else {
                                const result = await slackClient.chat.postMessage({
                                    channel: bridgeConfig.slackChannel,
                                    text: `*${msg.pushName || 'User'}*: ${text}`,
                                    thread_ts: slackThreadTs
                                });

                                if (result.ok) {
                                    // Store participant so we can reply back correctly later
                                    const participant = msg.key.participant || msg.key.remoteJid;
                                    store.addMapping(msg.key.id, result.ts, participant);
                                    console.log(`Mapped WhatsApp ID ${msg.key.id} to Slack TS ${result.ts} with participant ${participant}`);
                                }
                            }
                            broadcastTraffic('whatsapp', msg.pushName || 'User', text || "[Media]");
                        } catch (e) {
                            console.error("Failed to send to Slack:", e);
                        }
                    } else {
                        console.log("Skipping Slack forward: client or channel missing", { client: !!slackClient, channel: bridgeConfig.slackChannel }); // DEBUG
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
    } catch (e) { }
}