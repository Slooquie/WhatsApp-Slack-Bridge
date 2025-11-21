# 🌉 WhatsApp-Slack Bridge

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/Slooquie/WhatsApp-Slack-Bridge?style=social)](https://github.com/Slooquie/WhatsApp-Slack-Bridge/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Slooquie/WhatsApp-Slack-Bridge/pulls)

**The most powerful open-source WhatsApp to Slack integration.**

Seamlessly bridge messages between WhatsApp and Slack with full thread support, media handling, and real-time synchronization.

[⭐ Star this repo](https://github.com/Slooquie/WhatsApp-Slack-Bridge) • [🚀 Quick Start](#-quick-start) • [📖 Documentation](#-table-of-contents) • [🐛 Report Bug](https://github.com/Slooquie/WhatsApp-Slack-Bridge/issues) • [📧 Contact](mailto:ikong.dev@gmail.com)

### 🚀 One-Click Deploy

Deploy instantly to your favorite cloud platform:

<p align="left">
  <a href="https://railway.app/template/whatsapp-slack-bridge?referralCode=bonus">
    <img src="https://railway.app/button.svg" alt="Deploy on Railway" height="40">
  </a>
  <a href="https://render.com/deploy">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" height="40">
  </a>
  <a href="https://heroku.com/deploy?template=https://github.com/Slooquie/WhatsApp-Slack-Bridge">
    <img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy to Heroku" height="40">
  </a>
</p>


Or use Docker:

```bash
docker-compose up -d
```
<hr>
<img width="1182" height="934" alt="image" src="https://github.com/user-attachments/assets/2b099151-58b8-4bf7-a73a-88252f69f093" />

<!-- Add your custom image above this line -->


</div>

---

## 📖 Table of Contents

- [Why WhatsApp-Slack Bridge?](#-why-whatsapp-slack-bridge)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Quick Start](#-quick-start)
  - [Docker (Recommended)](#option-1-docker-recommended)
  - [One-Click Install Script](#option-2-one-click-install-script)
  - [Manual Installation](#option-3-manual-installation)
- [Slack API Setup](#-slack-api-setup-detailed-guide)
- [WhatsApp Setup](#-whatsapp-setup)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Production Deployment](#-production-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [FAQ](#-faq)
- [License](#-license)

---

## ⭐ Why WhatsApp-Slack Bridge?

> **If this project helps you, please give it a ⭐ star!** It helps others discover this tool.

**WhatsApp-Slack Bridge** is a revolutionary open-source integration that connects WhatsApp and Slack, enabling seamless communication across platforms. Perfect for teams, businesses, and communities who need to bridge the gap between WhatsApp groups and Slack channels.

### **Key Benefits:**

✅ **Free & Open Source** - No monthly subscriptions or API costs  
✅ **Self-Hosted** - Complete control over your data and privacy  
✅ **Real-Time Sync** - Messages appear instantly in both platforms  
✅ **Thread Support** - Maintains conversation context with thread mapping  
✅ **Media Support** - Automatically forwards images, videos, and files  
✅ **Easy Setup** - One-click deployment with Docker or install scripts  
✅ **No WhatsApp Business API Required** - Uses your personal WhatsApp account

---

## 🎯 Features

### **Core Features**

- 🔄 **Bi-directional Message Sync** - Messages flow seamlessly between WhatsApp and Slack
- 🧵 **Smart Thread Mapping** - WhatsApp replies map to Slack threads and vice versa
- 📎 **Media Handling** - Images, videos, documents, and audio files sync automatically
- 👥 **Multi-Group Support** - Bridge multiple WhatsApp groups to different Slack channels
- 🔐 **Secure** - End-to-end encryption maintained, self-hosted for privacy
- 🎨 **Beautiful Web UI** - Modern React interface for easy configuration
- 📱 **QR Code Authentication** - Quick and easy WhatsApp linking
- 🔔 **Real-time Status** - Live connection monitoring and logs

### **Advanced Features**

- 💾 **Message Store** - Persistent message mapping for thread continuity
- 🔄 **Auto Reconnect** - Automatically handles disconnections and reconnects
- 📊 **Activity Logs** - Detailed logging for debugging and monitoring
- 🎨 **User Attribution** - Shows sender names from both platforms
- ⚡ **High Performance** - Handles high message volumes efficiently

---

## 📸 Screenshots

*Coming soon - Help us by sharing your screenshots!*

---

## 🚀 Quick Start

Choose your preferred installation method:

### **Option 1: Docker (Recommended)** 🐳

The fastest way to get started! Works on Windows, Mac, and Linux.

```bash
# Clone the repository
git clone https://github.com/Slooquie/WhatsApp-Slack-Bridge.git
cd WhatsApp-Slack-Bridge

# Run with Docker Compose
docker-compose up -d

# Access the web interface
# Open http://localhost:5173 in your browser
```

**That's it!** The bridge is now running. Continue to [Slack API Setup](#-slack-api-setup-detailed-guide).

---

### **Option 2: One-Click Install Script** ⚡

Automated installation for Linux/Ubuntu servers.

```bash
# Download and run the installer
curl -fsSL https://raw.githubusercontent.com/Slooquie/WhatsApp-Slack-Bridge/main/install.sh | bash

# Or with wget
wget -qO- https://raw.githubusercontent.com/Slooquie/WhatsApp-Slack-Bridge/main/install.sh | bash
```

The script will:
- ✅ Install Node.js 20 (if needed)
- ✅ Install all dependencies
- ✅ Build the frontend
- ✅ Set up PM2 process manager
- ✅ Start the backend automatically

---

### **Option 3: Manual Installation** 🛠️

#### **Prerequisites**

- **Node.js 20+** ([Download here](https://nodejs.org))
- **npm** (comes with Node.js)
- **Git** ([Download here](https://git-scm.com))

#### **Installation Steps**

```bash
# 1. Clone the repository
git clone https://github.com/Slooquie/WhatsApp-Slack-Bridge.git
cd WhatsApp-Slack-Bridge

# 2. Install backend dependencies
cd backend
npm install
cd ..

# 3. Install frontend dependencies
cd frontend
npm install
npm run build
cd ..

# 4. Start the backend
cd backend
node server.js
```

The backend will run on port **8080**, and the frontend build will be in `frontend/dist/`.

To serve the frontend, you can use:
```bash
cd frontend/dist
npx http-server -p 5173
```

Then open **http://localhost:5173** in your browser.

---

## 🔑 Slack API Setup (Detailed Guide)

Follow these steps to create and configure your Slack app:

### **Step 1: Create a Slack App**

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Select **"From scratch"**
4. Enter:
   - **App Name**: `WhatsApp Bridge` (or any name you prefer)
   - **Workspace**: Select your Slack workspace
5. Click **"Create App"**

### **Step 2: Enable Socket Mode**

1. In your app settings, go to **"Socket Mode"** (left sidebar)
2. Toggle **"Enable Socket Mode"** to ON
3. Enter a token name: `whatsapp-bridge-socket`
4. Click **"Generate"**
5. **Copy the App Token** (starts with `xapp-`) - you'll need this later
6. Click **"Done"**

### **Step 3: Configure Bot Token Scopes**

1. Go to **"OAuth & Permissions"** (left sidebar)
2. Scroll down to **"Scopes"** → **"Bot Token Scopes"**
3. Click **"Add an OAuth Scope"** and add these scopes:

   **Required Scopes:**
   ```
   channels:history    - Read messages in channels
   channels:read       - View basic channel info
   chat:write          - Send messages
   files:write         - Upload files
   groups:history      - Read messages in private channels
   groups:read         - View private channels
   im:history          - Read direct messages
   im:read             - View direct messages
   im:write            - Send direct messages
   mpim:history        - Read group messages
   mpim:read           - View group direct messages
   users:read          - View users in workspace
   ```

### **Step 4: Install App to Workspace**

1. Scroll to the top of **"OAuth & Permissions"** page
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. **Copy the Bot User OAuth Token** (starts with `xoxb-`) - you'll need this

### **Step 5: Enable Event Subscriptions**

1. Go to **"Event Subscriptions"** (left sidebar)
2. Toggle **"Enable Events"** to ON
3. Under **"Subscribe to bot events"**, click **"Add Bot User Event"** and add:
   ```
   message.channels    - Messages in channels
   message.groups      - Messages in private channels
   message.im          - Direct messages
   message.mpim        - Group direct messages
   ```
4. Click **"Save Changes"**

### **Step 6: Add Your Bot to Channels**

1. In your Slack workspace, go to the channel you want to bridge
2. Type `/invite @WhatsApp Bridge` (or your app name)
3. The bot will join the channel

---

## 📱 WhatsApp Setup

Setting up WhatsApp is simple with QR code authentication:

### **Step 1: Access the Web Interface**

1. Open your browser and go to:
   - **Local**: `http://localhost:5173`
   - **Server**: `http://YOUR-SERVER-IP:5173`

### **Step 2: Enter Slack Tokens**

1. Click on the **"Configuration"** tab
2. Enter your tokens:
   - **Slack Bot Token**: `xoxb-...` (from Step 4 above)
   - **Slack App Token**: `xapp-...` (from Step 2 above)
3. Click **"Save Configuration"**

### **Step 3: Scan QR Code**

1. A QR code will appear in the interface
2. Open **WhatsApp** on your phone
3. Go to **Settings** → **Linked Devices**
4. Tap **"Link a Device"**
5. Scan the QR code from the web interface

✅ **Connected!** You'll see a success message when WhatsApp is linked.

### **Step 4: Configure Group Mappings**

1. Click on the **"Group Selector"** tab
2. Select a WhatsApp group from the dropdown
3. Select the corresponding Slack channel
4. Click **"Add Mapping"**
5. Repeat for all groups you want to bridge

🎉 **You're all set!** Messages will now sync between WhatsApp and Slack.

---

## ⚙️ Configuration

### **Environment Variables**

Create a `.env.local` file in the `frontend` directory:

```bash
# Frontend Configuration
VITE_API_URL=http://localhost:8080
```

For production, update `VITE_API_URL` to your server address:
```bash
VITE_API_URL=http://your-server-ip:8080
```

### **Backend Configuration** (Optional)

You can configure the backend port by editing `backend/server.js`.

---

## 💡 Usage

### **Sending Messages**

#### **WhatsApp → Slack**
- Send any message in a mapped WhatsApp group
- It will appear in the corresponding Slack channel
- Replies to messages create Slack threads

#### **Slack → WhatsApp**
- Send any message in a mapped Slack channel
- It will appear in the corresponding WhatsApp group
- Thread replies are sent as WhatsApp replies

### **Media Support**

✅ **Images** - Automatically uploaded and displayed  
✅ **Videos** - Shared with download links  
✅ **Documents** - Files are transferred and made available  
✅ **Audio** - Voice messages and audio files supported

### **Command Reference**

Access the web interface to:
- 📊 **Monitor Status** - View connection status and activity logs
- ⚙️ **Manage Mappings** - Add/remove group-channel mappings
- 🔄 **Reconnect** - Force reconnection if needed
- 📜 **View Logs** - Real-time logging and debugging

---

## 🌐 Production Deployment

### **Using Docker (Recommended)**

Docker provides the most reliable production deployment:

```bash
# Clone and configure
git clone https://github.com/Slooquie/WhatsApp-Slack-Bridge.git
cd WhatsApp-Slack-Bridge

# Edit docker-compose.yml to set your environment

# Start in production mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### **Using PM2**

For Node.js deployments without Docker:

```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start server.js --name whatsapp-bridge

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```

### **Nginx Configuration** (Optional)

For serving the frontend with Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/WhatsApp-Slack-Bridge/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **Security Best Practices**

- 🔒 Use HTTPS in production (Let's Encrypt recommended)
- 🔑 Keep your tokens secure and never commit them
- 🔥 Configure firewall rules appropriately
- 🔄 Regularly update dependencies
- 💾 Backup your `auth_info_baileys` directory

---

## 🐛 Troubleshooting

### **WhatsApp won't connect**
- Ensure you have a stable internet connection
- Try clearing WhatsApp cache: delete `backend/auth_info_baileys` and re-scan QR
- Make sure you're using WhatsApp on a supported device

### **Slack messages not sending**
- Verify your Bot Token starts with `xoxb-`
- Check that the bot is invited to the channel
- Review the required OAuth scopes in Slack API setup

### **Backend crashes or errors**
- Ensure Node.js 20+ is installed: `node --version`
- Check logs: `pm2 logs whatsapp-bridge`
- Verify all dependencies are installed: `npm install`

### **Port conflicts**
- Backend uses port 8080 by default
- Frontend dev server uses port 5173
- Change ports in configuration if needed

### **Need more help?**
- 📖 [Check the FAQ](#-faq)
- 🐛 [Open an issue](https://github.com/Slooquie/WhatsApp-Slack-Bridge/issues)
- 💬 [Discussions](https://github.com/Slooquie/WhatsApp-Slack-Bridge/discussions)
- 📧 **Email Support**: [ikong.dev@gmail.com](mailto:ikong.dev@gmail.com)

---

## 🤝 Contributing

We love contributions! Here's how you can help:

### **Ways to Contribute**

- ⭐ **Star this repository** - It helps others discover the project!
- 🐛 **Report bugs** - Open an issue with details
- 💡 **Suggest features** - Share your ideas
- 📖 **Improve documentation** - Fix typos, add examples
- 🔧 **Submit pull requests** - Add features or fix bugs

### **Development Setup**

```bash
# Fork and clone the repository
git clone https://github.com/YOUR-USERNAME/WhatsApp-Slack-Bridge.git
cd WhatsApp-Slack-Bridge

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and commit
git commit -m "Add amazing feature"

# Push and create a pull request
git push origin feature/amazing-feature
```

---

## ❓ FAQ

### **Is this legal and safe to use?**
Yes! This project uses official WhatsApp Web protocol (Baileys) and Slack APIs. It's self-hosted, so you maintain full control over your data.

### **Do I need WhatsApp Business API?**
No! This works with your regular WhatsApp account. No business API or special approval needed.

### **Does this work with WhatsApp Business?**
Yes, it works with both regular WhatsApp and WhatsApp Business accounts.

### **Can I bridge multiple groups?**
Absolutely! You can bridge as many WhatsApp groups to Slack channels as you want.

### **What happens if WhatsApp disconnects?**
The bridge automatically tries to reconnect. You may need to re-scan the QR code in some cases.

### **Is my data secure?**
Yes! Everything is self-hosted on your server. Messages are not stored or sent to third parties.

### **Can I use this commercially?**
Yes! This project is MIT licensed, so you can use it for commercial purposes.

### **Does this support voice/video calls?**
No, currently only messages and media files are supported. Calls are not bridged.

---

## 📊 Keywords & SEO

**WhatsApp API** • **Slack Bot** • **WhatsApp Slack Integration** • **WhatsApp to Slack Bridge** • **Slack WhatsApp Connector** • **WhatsApp Business Integration** • **Open Source Slack Integration** • **Self-Hosted WhatsApp Bridge** • **WhatsApp Web API** • **Slack Message Bridge** • **WhatsApp Automation** • **Slack Automation** • **Cross-Platform Messaging** • **Team Communication Tool** • **WhatsApp Group to Slack** • **Real-time Message Sync**

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Star History

If this project helped you, please **⭐ star the repository**!

[![Star History Chart](https://api.star-history.com/svg?repos=Slooquie/WhatsApp-Slack-Bridge&type=Date)](https://star-history.com/#Slooquie/WhatsApp-Slack-Bridge&Date)

---

## 💖 Support the Project

If you find this project useful, please consider:

- ⭐ **Starring the repository**
- 🐦 **Sharing on social media**
- 💡 **Contributing code or documentation**
- 🐛 **Reporting bugs and suggesting features**

## 📧 Contact & Support

Need help or have questions? Feel free to reach out:

- **Email**: [ikong.dev@gmail.com](mailto:ikong.dev@gmail.com)
- **GitHub Issues**: [Report a bug or request a feature](https://github.com/Slooquie/WhatsApp-Slack-Bridge/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/Slooquie/WhatsApp-Slack-Bridge/discussions)

I'm here to help! Whether you're stuck with setup, need customization assistance, or just want to share feedback, don't hesitate to get in touch.

---

<div align="center">

**Made with ❤️ by the open-source community**

[⭐ Star](https://github.com/Slooquie/WhatsApp-Slack-Bridge) • [🐛 Issues](https://github.com/Slooquie/WhatsApp-Slack-Bridge/issues) • [📖 Docs](https://github.com/Slooquie/WhatsApp-Slack-Bridge) • [💬 Discussions](https://github.com/Slooquie/WhatsApp-Slack-Bridge/discussions)

</div>
