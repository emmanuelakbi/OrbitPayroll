# Demo Video Upload Checklist

## After Recording

### 1. Video Export Settings
- [ ] Resolution: 1920x1080 (1080p)
- [ ] Frame rate: 30fps
- [ ] Codec: H.264
- [ ] Audio: AAC, 128kbps or higher
- [ ] File format: MP4

### 2. YouTube Upload

1. Go to [YouTube Studio](https://studio.youtube.com)
2. Click "Create" → "Upload videos"
3. Upload your video file

**Video Details:**
```
Title: OrbitPayroll - Web3 Payroll Platform with MNEE | Demo

Description:
OrbitPayroll is a Web3-native payroll platform for distributed teams using MNEE stablecoin.

🔗 Links:
• Live Demo: https://orbitpayroll.vercel.app
• GitHub: https://github.com/emmanuelakbi/OrbitPayroll
• Devpost: https://devpost.com/software/orbitpayroll

✨ Features:
• Wallet-based authentication (SIWE)
• Contractor management
• Non-custodial treasury
• Batch payroll execution
• On-chain transaction verification

🛠️ Tech Stack:
• Frontend: Next.js 14, React, TailwindCSS, RainbowKit
• Backend: Express.js, TypeScript, Prisma
• Blockchain: Solidity, Hardhat, MNEE Token

Built for the MNEE Hackathon 🚀

#Web3 #Payroll #MNEE #Ethereum #DeFi #Hackathon
```

**Tags:**
```
Web3, Payroll, MNEE, Ethereum, DeFi, Stablecoin, DAO, Cryptocurrency, Smart Contracts, Hackathon, Blockchain, Solidity, Next.js, TypeScript
```

**Visibility:** Unlisted (or Public if preferred)

### 3. Copy Video URL

After upload completes, copy the video URL:
```
https://www.youtube.com/watch?v=YOUR_VIDEO_ID
```

### 4. Update README.md

Replace the placeholder in README.md:

**Find this line:**
```markdown
[![Demo Video](https://img.shields.io/badge/video-YouTube-red)](https://youtube.com/watch?v=DEMO_VIDEO_ID)
```

**Replace with:**
```markdown
[![Demo Video](https://img.shields.io/badge/video-YouTube-red)](https://youtube.com/watch?v=YOUR_ACTUAL_VIDEO_ID)
```

**Also update the Links table:**
```markdown
| 🎬 **Demo Video** | [YouTube](https://youtube.com/watch?v=YOUR_ACTUAL_VIDEO_ID) |
```

### 5. Update Devpost

1. Go to your Devpost submission
2. Find the "Video Demo" field
3. Paste the YouTube URL
4. Save changes

### 6. Verify All Links

- [ ] README badge links to correct video
- [ ] README Links table has correct URL
- [ ] Devpost submission shows video embed
- [ ] Video plays correctly on all platforms

## Quick Commands

After getting your video URL, run these to update the README:

```bash
# Replace DEMO_VIDEO_ID with your actual video ID
# Example: if URL is https://youtube.com/watch?v=abc123xyz
# Then VIDEO_ID is abc123xyz

# On macOS:
sed -i '' 's/DEMO_VIDEO_ID/YOUR_VIDEO_ID/g' README.md

# On Linux:
sed -i 's/DEMO_VIDEO_ID/YOUR_VIDEO_ID/g' README.md
```

## Alternative: Vimeo Upload

If using Vimeo instead:

1. Go to [Vimeo](https://vimeo.com)
2. Click "New Video" → "Upload"
3. Use similar title and description
4. Set privacy to "Anyone can see this video"
5. Copy the video URL
6. Update README with Vimeo URL format
