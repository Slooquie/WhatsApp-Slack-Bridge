# WhatsApp-Slack Bridge

A bridge application that connects WhatsApp and Slack, allowing messages to be synced between the two platforms.

## Project Structure

```
├── backend/       # Node.js backend with WhatsApp integration (Baileys)
├── frontend/      # React frontend with Vite
└── README.md
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Slack workspace and bot token
- WhatsApp account for linking

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd whatsappbridge
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## Configuration

### Backend Configuration

1. Create a `.env` file in the `backend` directory (optional, can be configured via frontend UI)
2. The backend runs on port 3000 by default

### Frontend Configuration

1. Create a `.env.local` file in the `frontend` directory:
   ```
   VITE_API_URL=http://localhost:3000
   ```

2. For production, update the API URL to your server's address

## Running the Application

### Development Mode (Local)

1. **Start the Backend:**
   ```bash
   cd backend
   node server.js
   ```

2. **Start the Frontend (in a new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

### Production Mode (Linux Server)

1. **Backend:**
   ```bash
   cd backend
   node server.js
   ```
   Consider using PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name whatsapp-bridge
   ```

2. **Frontend:**
   Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
   Serve the `dist` folder using nginx, Apache, or any static file server.

## Features

- Real-time WhatsApp to Slack message bridging
- Thread mapping between platforms
- QR code authentication for WhatsApp
- Web-based configuration interface
- Message history support

## Usage

1. Access the frontend interface
2. Enter your Slack Bot Token and App Token
3. Scan the QR code with your WhatsApp mobile app
4. Configure channel mappings
5. Start bridging messages!

## Technology Stack

- **Backend:** Node.js, Express, Baileys (WhatsApp), @slack/bolt
- **Frontend:** React, TypeScript, Vite

## License

MIT
