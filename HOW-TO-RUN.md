# WhatsApp-Slack Bridge - How to Run

## Quick Start

**IMPORTANT:** Always use these scripts to avoid running multiple servers!

### Windows:
1. **Start Backend:** Double-click `start-backend.bat` OR run `.\start-backend.bat` in terminal
2. **Start Frontend:** Open a new terminal and run:
   ```bash
   cd frontend
   npm run dev
   ```

### Manual Start (if needed):
If you prefer manual control:

1. **Kill all existing node processes first:**
   ```bash
   taskkill /F /IM node.exe
   ```

2. **Start Backend (Terminal 1):**
   ```bash
   cd backend
   node server.js
   ```

3. **Start Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm run dev
   ```

## Troubleshooting

### Duplicate Messages in Slack?
This means multiple backend processes are running. Fix:
```bash
taskkill /F /IM node.exe
```
Then restart using the scripts above.

### Check Running Processes:
```bash
Get-Process -Name node
```
You should see **exactly 2 processes**: one for backend, one for frontend.
