# Senghong Store - Game Top Up Website

## Current Status: READY FOR USE

Website fully functional. Telegram notifications work on ANY server (direct API calls from browser).

## Tech Stack:
- Node.js server (server.js) on port 5000 for local dev
- Vercel serverless function (api/telegram-notify.js) for Vercel deployment
- Static HTML/CSS/JS frontend
- Bakong KHQR payment integration
- Telegram bot notifications (direct browser API calls)

## Key Files:
- server.js - Node.js server for local dev
- api/telegram-notify.js - Vercel serverless function
- vercel.json - Vercel configuration
- game-payment.js - Frontend payment logic with direct Telegram API calls
- Game pages: mlbb.html, freefire.html, bloodstrike.html, genshin.html, zepeto.html, roblox.html

## Telegram Config (in game-payment.js):
- Bot Token: 8499942561:AAEinTzwCiPuf1fho_f9v_gOxX72kOMjAgg
- MLBB Group: -4911328110
- Other Games Group: -4818925664
- Payment Info Group: -4974993939

## Notification Format:
- MLBB Group: Simple `userid serverid code` (e.g., 123456789 1234 55)
- Other Games Group: Simple `userid code` (e.g., 123456789 Monthly)
- Payment Info Group: Full details with Order ID, Game, User, Zone, Nickname, Item, Price, Date, MD5

## Workflow: Web Server running "node server.js" on port 5000
