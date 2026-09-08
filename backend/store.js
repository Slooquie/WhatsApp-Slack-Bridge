const fs = require('fs');
const path = require('path');

// A Slack ts is unix seconds with a fractional suffix, e.g. 1757300000.111000.
const SLACK_TS = /^\d{10,}\.\d+$/;

// Every entry carries a Slack ts on one side - forward entries store it as the
// value, reverse entries use it as the key - and a Slack ts is already a unix
// timestamp. So entries can be aged without adding a schema or migrating.
function entryTimestamp(key, value) {
    if (SLACK_TS.test(key)) return parseFloat(key);
    if (typeof value === 'string' && SLACK_TS.test(value)) return parseFloat(value);
    return null;
}

class MessageStore {
    constructor() {
        this.map = {};
        // Default for `node server.js`. The server overrides this via setDataDir so a
        // packaged binary writes beside the executable, not inside itself.
        this.file = path.join(__dirname, 'message_map.json');
        this.load();
    }

    setDataDir(dir) {
        this.file = path.join(dir, 'message_map.json');
        this.load();
    }

    size() {
        return Object.keys(this.map).length;
    }

    // Drop mappings older than maxAgeDays. Replies, deletions and reactions all
    // need a mapping to exist, so this is a deliberate retention window, not a
    // cleanup: past it, those actions stop crossing for that message.
    prune(maxAgeDays) {
        const cutoff = Date.now() / 1000 - maxAgeDays * 86400;
        let removed = 0;
        let undatable = 0;
        // Object.entries snapshots, so deleting while iterating is safe.
        for (const [key, value] of Object.entries(this.map)) {
            const ts = entryTimestamp(key, value);
            if (ts === null) { undatable++; continue; } // never guess an age
            if (ts < cutoff) { delete this.map[key]; removed++; }
        }
        if (removed > 0) this.save();
        return { removed, undatable, remaining: this.size() };
    }

    load() {
        try {
            if (fs.existsSync(this.file)) {
                this.map = JSON.parse(fs.readFileSync(this.file, 'utf8'));
            } else {
                // Reset: setDataDir re-loads, and without this the map would keep
                // whatever the previous path held.
                this.map = {};
            }
        } catch (e) {
            console.error("Failed to load message map:", e);
        }
    }

    save() {
        try {
            fs.writeFileSync(this.file, JSON.stringify(this.map, null, 2));
        } catch (e) {
            console.error("Failed to save message map:", e);
        }
    }

    addMapping(whatsappId, slackTs, participant) {
        if (!whatsappId || !slackTs) return;
        this.map[whatsappId] = slackTs;
        // Store object for Slack -> WhatsApp lookup containing ID and Participant
        this.map[slackTs] = { id: whatsappId, participant };
        this.save();
    }

    getSlackTs(whatsappId) {
        return this.map[whatsappId];
    }

    getWhatsappData(slackTs) {
        const data = this.map[slackTs];
        if (!data) return null;
        // Handle potential legacy string format (just in case)
        if (typeof data === 'string') return { id: data };
        return data;
    }
}

module.exports = new MessageStore();
