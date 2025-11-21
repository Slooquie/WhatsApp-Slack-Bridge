# Git Repository Setup and Push Instructions

## Step 1: Create a New Repository on GitHub

1. Go to https://github.com/new
2. Create a new repository (e.g., "whatsapp-slack-bridge")
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"

## Step 2: Push Your Code to GitHub

After creating the repository, GitHub will show you commands. Use these:

### Option A: If you see the GitHub instructions, use your repository URL:
```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git branch -M main
git push -u origin main
```

### Option B: Run these commands (replace with your actual repo URL):
```bash
# Add the remote repository
git remote add origin https://github.com/YOUR-USERNAME/whatsapp-slack-bridge.git

# Rename branch to main (optional, but GitHub's default)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Verify the Push

1. Refresh your GitHub repository page
2. You should see all your files uploaded

## Step 4: Clone on Your Linux Server

SSH into your Linux server and run:

```bash
# Navigate to your desired directory
cd ~

# Clone the repository
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# Navigate into the project
cd YOUR-REPO-NAME

# Follow the deployment instructions in DEPLOYMENT.md
```

## Important Notes

- **Sensitive Data**: Make sure your `.env` files and WhatsApp auth data are NOT pushed to GitHub (they're in .gitignore)
- **Private Repository**: Consider making your repository private if it contains sensitive configuration
- **SSH Keys**: You may want to set up SSH keys for easier authentication:
  - Generate key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
  - Add to GitHub: Settings → SSH and GPG keys

## Quick Commands Reference

### To update the repository after making changes:
```bash
git add .
git commit -m "Description of changes"
git push
```

### To pull updates on your server:
```bash
cd ~/YOUR-REPO-NAME
git pull
# Then restart services as needed
```

## Security Checklist

Before pushing, verify:
- [ ] No `.env` or `.env.local` files are included
- [ ] No `auth_info_baileys` folder is included
- [ ] No sensitive tokens or passwords in code
- [ ] `.gitignore` is properly configured
- [ ] Consider making the repository private

## Next Steps

1. ✅ Repository initialized and committed locally
2. ⏳ Create GitHub repository
3. ⏳ Push code to GitHub
4. ⏳ Clone on Linux server
5. ⏳ Deploy following DEPLOYMENT.md

---

**Current Status**: Your code is committed locally and ready to push!
**Next Action**: Create a GitHub repository and run the push commands above.
