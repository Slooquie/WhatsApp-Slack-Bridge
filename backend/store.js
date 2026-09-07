const fs = require('fs');
const path = require('path');

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

    load() {
        try {
            if (fs.existsSync(this.file)) {
                this.map = JSON.parse(fs.readFileSync(this.file, 'utf8'));
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
