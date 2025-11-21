# Linux Server Deployment Guide

## Prerequisites on Linux Server

1. **Install Node.js and npm:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install Git:**
   ```bash
   sudo apt-get update
   sudo apt-get install git
   ```

3. **Install PM2 (Process Manager):**
   ```bash
   sudo npm install -g pm2
   ```

4. **Install Nginx (for serving frontend):**
   ```bash
   sudo apt-get install nginx
   ```

## Deployment Steps

### 1. Clone the Repository

```bash
cd ~
git clone <your-repo-url> whatsapp-bridge
cd whatsapp-bridge
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Configure Environment Variables

Create backend configuration if needed:
```bash
cd backend
# Edit any necessary configuration
cd ..
```

Create frontend configuration:
```bash
cd frontend
nano .env.local
```

Add the following (replace with your server's IP/domain):
```
VITE_API_URL=http://your-server-ip:3000
```

### 4. Build the Frontend

```bash
cd frontend
npm run build
cd ..
```

### 5. Set Up Backend with PM2

```bash
cd backend
pm2 start server.js --name whatsapp-bridge
pm2 save
pm2 startup
```

The last command will give you a command to run with sudo - execute it to ensure PM2 starts on boot.

### 6. Configure Nginx (Optional - for serving frontend)

Create nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/whatsapp-bridge
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your server IP

    # Frontend
    location / {
        root /home/your-username/whatsapp-bridge/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-bridge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Configure Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS (if using SSL)
sudo ufw allow 3000  # Backend (if not using nginx proxy)
sudo ufw enable
```

## Managing the Application

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs whatsapp-bridge

# Restart
pm2 restart whatsapp-bridge

# Stop
pm2 stop whatsapp-bridge

# Delete
pm2 delete whatsapp-bridge
```

### Updating the Application

```bash
cd ~/whatsapp-bridge

# Pull latest changes
git pull

# Update backend
cd backend
npm install
pm2 restart whatsapp-bridge
cd ..

# Update frontend
cd frontend
npm install
npm run build
cd ..

# Restart nginx if needed
sudo systemctl restart nginx
```

## Accessing the Application

- If using Nginx: `http://your-server-ip` or `http://your-domain.com`
- Direct access: `http://your-server-ip:5173` (if running dev server) or serve the build files

## Troubleshooting

1. **Check backend logs:**
   ```bash
   pm2 logs whatsapp-bridge
   ```

2. **Check nginx logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Check if backend is running:**
   ```bash
   pm2 status
   netstat -tulpn | grep 3000
   ```

4. **Restart services:**
   ```bash
   pm2 restart whatsapp-bridge
   sudo systemctl restart nginx
   ```

## Security Considerations

1. **Use environment variables for sensitive data** - never commit tokens to git
2. **Set up SSL/HTTPS** using Let's Encrypt:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```
3. **Keep system updated:**
   ```bash
   sudo apt-get update && sudo apt-get upgrade
   ```
4. **Use strong passwords and SSH keys** for server access
