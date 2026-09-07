// server.js - WhatsApp-Slack Bridge with Multi-Bridge Support (Duplicate Fix)
const WebSocket = require('ws');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage, fetchLatestBaileysVersion, WAMessageStubType } = require('@whiskeysockets/baileys');
const { WebClient } = require('@slack/web-api');
const { SocketModeClient } = require('@slack/socket-mode');
const pino = require('pino');
const fs = require('fs');
const axios = require('axios');
const emoji = require('node-emoji');
const store = require('./store');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const http = require('http');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;

// When running as a packaged single-file executable, keep runtime data beside
// the binary rather than in whatever directory it happened to be launched from.
let IS_PACKAGED = false;
try { IS_PACKAGED = require('node:sea').isSea(); } catch (e) { /* plain node */ }
const DATA_DIR = IS_PACKAGED ? path.dirname(process.execPath) : __dirname;
const AUTH_FOLDER = path.join(DATA_DIR, 'auth_info_baileys');
const CONFIG_FILE = path.join(DATA_DIR, 'bridge_config.json');
store.setDataDir(DATA_DIR);

// The built frontend is embedded at package time so one file serves the whole app.
let EMBEDDED_UI = null;
try { EMBEDDED_UI = require('./frontend-assets.generated.js'); } catch (e) { /* dev: served from disk */ }

let sock;
let slackClient;
let socketModeClient;
let activeSocket = null;
let bridgeConfig = { slackToken: '', appToken: '', bridges: [] };
let isConnecting = false;
let connectionRetryTimeout = null;
const processedMessages = new Set();

// proto.Message.ProtocolMessage.Type.REVOKE - a WhatsApp "delete for everyone".
const REVOKE_TYPE = 0;
// Deleting on one side makes the other side emit its own delete event. Remember
// what we already handled so the two sides do not chase each other.
const processedDeletions = new Set();
function markDeletion(id) {
    if (processedDeletions.has(id)) return false;
    processedDeletions.add(id);
    if (processedDeletions.size > 500) processedDeletions.delete(processedDeletions.values().next().value);
    return true;
}

console.clear();
// Replaced at package time by esbuild --define; stays 'dev' under plain node.
const VERSION = typeof __BRIDGE_VERSION__ === 'string' ? __BRIDGE_VERSION__ : 'dev';

const RELEASE_API = 'https://api.github.com/repos/Slooquie/WhatsApp-Slack-Bridge/releases/latest';
const ASSET_NAME = process.platform === 'win32'
    ? 'whatsapp-slack-bridge-windows-x64.exe'
    : 'whatsapp-slack-bridge-linux-x64';

// Self-update needs three things: a packaged binary to replace, a platform that
// allows replacing a running executable (Windows locks it), and a supervisor to
// start us again after we exit. systemd sets INVOCATION_ID.
const CAN_SELF_UPDATE = IS_PACKAGED && process.platform !== 'win32' && !!process.env.INVOCATION_ID;

console.log(`🚀 BRIDGE SERVER RUNNING ON PORT ${PORT}  (version ${VERSION})`);
console.log("===================================================");

const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.map': 'application/json'
};

function serveUI(req, res) {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let rel = urlPath;
    while (rel.startsWith('/')) rel = rel.slice(1);
    if (rel === '') rel = 'index.html';

    if (EMBEDDED_UI) {
        // exact match, else fall back to index.html so client routing works
        const asset = EMBEDDED_UI[rel] || EMBEDDED_UI['index.html'];
        if (asset) {
            res.writeHead(200, { 'Content-Type': asset.type });
            return res.end(Buffer.from(asset.b64, 'base64'));
        }
    }

    // Development: serve the Vite build straight off disk if it exists.
    const distDir = path.join(__dirname, '..', 'frontend', 'dist');
    const target = path.resolve(distDir, rel);
    if (!target.startsWith(path.resolve(distDir))) { // block path traversal
        res.writeHead(403); return res.end('Forbidden');
    }
    const file = fs.existsSync(target) && fs.statSync(target).isFile()
        ? target
        : path.join(distDir, 'index.html');
    if (fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        return fs.createReadStream(file).pipe(res);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('UI not built. Run the frontend dev server, or use a packaged build.');
}

const httpServer = http.createServer(serveUI);
const wss = new WebSocket.Server({ server: httpServer });
httpServer.listen(PORT, () => {
    console.log(`✅ Open http://localhost:${PORT} in your browser`);
    loadConfig();
});

wss.on('connection', (ws) => {
    console.log(`[${new Date().toLocaleTimeString()}] ⚡ FRONTEND CONNECTED`);
    activeSocket = ws;
    broadcastLog('info', 'Frontend connected.', 'SYSTEM');
    broadcastVersion();
    if (sock && sock.user) broadcastState('AUTHENTICATED');
    broadcastBridges(bridgeConfig.bridges);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'PING': break;
                case 'INIT':
                    // Never log raw tokens - this printed both Slack tokens in full.
                    const redact = (t) => !t ? '(empty)' : t.slice(0, 9) + '...' + t.slice(-4);
                    console.log("Received INIT Payload: { slackToken: " + redact(data.payload.slackToken) +
                                ", slackAppToken: " + redact(data.payload.slackAppToken) + " }");
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
                case 'CHECK_UPDATE':
                    await checkForUpdate();
                    break;
                case 'APPLY_UPDATE':
                    await applyUpdate();
                    break;
                case 'REFRESH_GROUPS':
                    if (sock && sock.user) {
                        broadcastLog('info', 'Refreshing WhatsApp group list...', 'WHATSAPP');
                        await fetchGroups();
                    } else {
                        broadcastLog('error', 'Cannot refresh groups: WhatsApp is not connected.', 'WHATSAPP');
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
            // Deletions arrive as a subtype of the same message event, so they need
            // routing before the bot filter - a deleted bot message still matters.
            if (event.subtype === 'message_deleted') { await handleSlackDeletion(event); return; }
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

// WhatsApp message deleted -> delete the copy we posted in Slack.
async function relayWhatsAppDeletion(whatsappId, activeBridges) {
    const ts = store.getSlackTs(whatsappId);
    if (typeof ts !== 'string' || !slackClient) return;
    if (!markDeletion(ts)) return;
    for (const bridge of activeBridges) {
        if (!bridge.slackChannelId) continue;
        try {
            await slackClient.chat.delete({ channel: bridge.slackChannelId, ts });
            broadcastLog('info', `Deleted a message in Slack (${bridge.name}) to match WhatsApp.`, 'BRIDGE');
        } catch (e) {
            // message_not_found just means it was already gone
            if (e.data?.error !== 'message_not_found') {
                broadcastLog('error', `Could not delete in Slack (${bridge.name}): ${e.data?.error || e.message}`, 'BRIDGE');
            }
        }
    }
}

// Slack message deleted -> delete the copy we sent to WhatsApp. Only messages the
// bridge itself sent can be revoked, which is exactly the set it relayed.
async function handleSlackDeletion(event) {
    const deletedTs = event.deleted_ts || event.previous_message?.ts;
    if (!deletedTs || !sock) return;
    const data = store.getWhatsappData(deletedTs);
    if (!data || !data.id) return;
    if (!markDeletion(deletedTs)) return;
    const activeBridges = bridgeConfig.bridges.filter(b => b.active && b.slackChannelId === event.channel);
    for (const bridge of activeBridges) {
        if (!bridge.whatsappGroupId) continue;
        try {
            await sock.sendMessage(bridge.whatsappGroupId, {
                delete: { remoteJid: bridge.whatsappGroupId, fromMe: true, id: data.id }
            });
            broadcastLog('info', `Deleted a message in WhatsApp (${bridge.name}) to match Slack.`, 'BRIDGE');
        } catch (e) {
            broadcastLog('error', `Could not delete in WhatsApp (${bridge.name}): ${e.message}`, 'BRIDGE');
        }
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

// fetchLatestBaileysVersion() scrapes GitHub and has no timeout of its own, so a
// slow or unreachable network would stall startup indefinitely. Bound it, and fall
// back to the version bundled with the installed baileys.
async function resolveWaVersion(timeoutMs = 5000) {
    let timer;
    try {
        return await Promise.race([
            fetchLatestBaileysVersion(),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
            })
        ]);
    } catch (e) {
        broadcastLog('warning', `Could not fetch latest WA Web version (${e.message}); using the version bundled with baileys.`, 'WHATSAPP');
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function startWhatsApp() {
    if (isConnecting) return;
    isConnecting = true;
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    broadcastState('INITIALIZING');
    try {
        const waVersion = await resolveWaVersion();
        if (waVersion) {
            broadcastLog('info', `Using WA Web version ${waVersion.version.join('.')} (isLatest: ${waVersion.isLatest})`, 'WHATSAPP');
        }
        sock = makeWASocket({ auth: state, ...(waVersion ? { version: waVersion.version } : {}), logger: pino({ level: 'silent' }), browser: ["BridgeCommand", "Chrome", "1.0"], connectTimeoutMs: 60000 });
        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                broadcastState('WAITING_FOR_QR');
                broadcastQR(qr);
            }
            if (connection === 'close') {
                isConnecting = false;
                const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                const reason = DisconnectReason[statusCode] || 'unknown';
                const detail = lastDisconnect?.error?.message || '';
                broadcastLog('error', 'WhatsApp connection closed: ' + statusCode + ' ' + reason + ' - ' + detail, 'WHATSAPP');
                console.error('[WhatsApp] closed: statusCode=' + statusCode + ' reason=' + reason + ' ' + detail);

                // 405 = WhatsApp rejected this client's version. Retrying will never help;
                // @whiskeysockets/baileys has to be upgraded. Fail loudly instead of looping forever.
                if (statusCode === 405) {
                    broadcastLog('error', 'WhatsApp rejected this client version (405). Upgrade @whiskeysockets/baileys - retrying will not help.', 'WHATSAPP');
                    broadcastState('ERROR');
                    sock = null;
                    return;
                }

                if (statusCode === DisconnectReason.loggedOut) {
                    broadcastLog('error', "Session logged out. Delete the '" + AUTH_FOLDER + "' folder and re-scan the QR code.", 'WHATSAPP');
                    broadcastState('ERROR');
                    sock = null;
                    return;
                }

                // restartRequired (515) is expected immediately after a fresh QR pairing
                const delay = statusCode === DisconnectReason.restartRequired ? 0 : 3000;
                if (connectionRetryTimeout) clearTimeout(connectionRetryTimeout);
                connectionRetryTimeout = setTimeout(startWhatsApp, delay);
            } else if (connection === 'open') {
                isConnecting = false;
                broadcastState('AUTHENTICATED');
                fetchGroups();
            }
        });
        // Baileys turns a WhatsApp "delete for everyone" into a messages.update with
        // the REVOKE stub type, carrying the deleted message's id - not a normal
        // upsert. This is the path that actually fires.
        sock.ev.on('messages.update', async (updates) => {
            for (const u of updates) {
                const isRevoke = u.update?.messageStubType === WAMessageStubType.REVOKE
                    || (u.update && u.update.message === null);
                if (!isRevoke || !u.key?.id) continue;
                const bridges = bridgeConfig.bridges.filter(b => b.active && b.whatsappGroupId === u.key.remoteJid);
                await relayWhatsAppDeletion(u.key.id, bridges);
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

            // Baileys normally converts a revoke into a messages.update event (see the
            // listener below); this is only a fallback for a raw protocol message.
            const revoke = msg.message.protocolMessage;
            if (revoke && revoke.type === REVOKE_TYPE && revoke.key?.id) {
                await relayWhatsAppDeletion(revoke.key.id, activeBridges);
                return;
            }

            // If this message quotes another one we have already relayed, reply in
            // that Slack thread instead of posting a detached message.
            const ctx = msg.message.extendedTextMessage?.contextInfo
                || msg.message.imageMessage?.contextInfo
                || msg.message.videoMessage?.contextInfo;
            const quotedId = ctx?.stanzaId;
            const parentTs = quotedId ? store.getSlackTs(quotedId) : null;
            const threadArgs = typeof parentTs === 'string' ? { thread_ts: parentTs } : {};
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
                                    await slackClient.files.uploadV2({ channel_id: bridge.slackChannelId, file: buffer, filename: `whatsapp_media.${fileType}`, title: caption, ...threadArgs });
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
                                const result = await slackClient.chat.postMessage({ channel: bridge.slackChannelId, text: `*${msg.pushName || 'User'}*: ${text}`, ...threadArgs });
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

async function fetchLatestRelease() {
    const res = await fetch(RELEASE_API, {
        headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'whatsapp-slack-bridge' }
    });
    if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
    return res.json();
}

async function checkForUpdate() {
    try {
        broadcastLog('info', 'Checking for updates...', 'SYSTEM');
        const release = await fetchLatestRelease();
        const latest = release.tag_name;
        const isNewer = latest && latest !== VERSION;
        broadcastVersion({ latest, updateAvailable: !!isNewer, checked: true });
        broadcastLog(isNewer ? 'success' : 'info',
            isNewer ? `Update available: ${latest} (running ${VERSION})` : `Already on the latest version (${VERSION})`,
            'SYSTEM');
    } catch (e) {
        broadcastLog('error', `Update check failed: ${e.message}`, 'SYSTEM');
        broadcastVersion({ checked: true, error: e.message });
    }
}

async function applyUpdate() {
    if (!CAN_SELF_UPDATE) {
        broadcastLog('error', 'Self-update is unavailable here. It needs a packaged build on Linux managed by systemd; update manually instead.', 'SYSTEM');
        return;
    }
    const target = process.execPath;
    const tmp = target + '.new';
    try {
        const release = await fetchLatestRelease();
        if (release.tag_name === VERSION) {
            broadcastLog('info', `Already on ${VERSION}, nothing to do.`, 'SYSTEM');
            return;
        }
        const asset = (release.assets || []).find(a => a.name === ASSET_NAME);
        if (!asset) throw new Error(`Release ${release.tag_name} has no asset named ${ASSET_NAME}`);

        broadcastLog('info', `Downloading ${release.tag_name}...`, 'SYSTEM');
        const res = await fetch(asset.browser_download_url, { headers: { 'User-Agent': 'whatsapp-slack-bridge' } });
        if (!res.ok) throw new Error(`Download failed with ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());

        // A truncated download must never replace a working binary.
        if (buf.length < 10 * 1024 * 1024) throw new Error(`Downloaded file is only ${buf.length} bytes - refusing to install it`);

        fs.writeFileSync(tmp, buf);
        fs.chmodSync(tmp, 0o755);

        // Keep the old binary next to the new one so a bad build can be rolled back.
        try { fs.rmSync(target + '.old', { force: true }); } catch (e) { }
        fs.renameSync(target, target + '.old');
        fs.renameSync(tmp, target);

        broadcastLog('success', `Installed ${release.tag_name}. Restarting now - reload this page in a few seconds.`, 'SYSTEM');
        broadcastVersion({ latest: release.tag_name, restarting: true });

        // systemd (Restart=always) starts us again on the new binary.
        setTimeout(() => process.exit(0), 600);
    } catch (e) {
        try { fs.rmSync(tmp, { force: true }); } catch (err) { }
        broadcastLog('error', `Update failed: ${e.message}`, 'SYSTEM');
        broadcastVersion({ error: e.message });
    }
}

async function fetchGroups() {
    if (!sock) return;
    broadcastState('FETCHING_GROUPS');
    try {
        const groups = await sock.groupFetchAllParticipating();
        const formattedGroups = Object.values(groups).map(g => ({ id: g.id, name: g.subject, participantCount: g.participants.length, lastMessageTime: new Date(g.creation * 1000) }));
        broadcastGroups(formattedGroups);

        // The bridge form tells users to copy the group ID 'from the logs', so
        // actually put them there. There is no group picker in the UI.
        broadcastLog('success', `Found ${formattedGroups.length} WhatsApp group(s):`, 'WHATSAPP');
        for (const g of formattedGroups) {
            broadcastLog('info', `${g.name}  ->  ${g.id}  (${g.participantCount} members)`, 'WHATSAPP');
        }

        // Leave FETCHING_GROUPS, otherwise the UI sits on that label forever.
        const hasActive = bridgeConfig.bridges.some(b => b.active && b.whatsappGroupId);
        broadcastState(hasActive ? 'BRIDGING' : 'AUTHENTICATED');
    } catch (e) {
        console.error("Error fetching groups:", e);
        broadcastLog('error', `Failed to fetch WhatsApp groups: ${e.message}`, 'WHATSAPP');
        // Still leave FETCHING_GROUPS so the UI is not stuck on a dead state.
        broadcastState('AUTHENTICATED');
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
            // bridgeConfig holds both Slack tokens - log shape, not secrets.
            console.log("Loaded configuration from file:", {
                slackToken: bridgeConfig.slackToken ? '(set)' : '(empty)',
                appToken: bridgeConfig.appToken ? '(set)' : '(empty)',
                bridges: bridgeConfig.bridges.map(b => ({ name: b.name, active: b.active, slackChannelId: b.slackChannelId, whatsappGroupId: b.whatsappGroupId }))
            });
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
function broadcastVersion(extra) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'VERSION', version: VERSION, canSelfUpdate: CAN_SELF_UPDATE, packaged: IS_PACKAGED, ...extra })); }
function broadcastQR(qr) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'QR_CODE', qr })); }
function broadcastGroups(groups) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'GROUPS_LIST', groups })); }
function broadcastBridges(bridges) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'BRIDGES_LIST', bridges })); }
function broadcastTraffic(platform, sender, content) { if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify({ type: 'TRAFFIC', traffic: { id: Date.now().toString(), platform, sender, content, timestamp: new Date() } })); }