const fs = require('fs');
const path = require('path');

const STORE_FILE = path.join(__dirname, 'message_map.json');

class MessageStore {
    constructor() {
        this.map = {};
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(STORE_FILE)) {
                this.map = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
            }
        } catch (e) {
            console.error("Failed to load message map:", e);
        }
    }

    save() {
        try {
            fs.writeFileSync(STORE_FILE, JSON.stringify(this.map, null, 2));
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
