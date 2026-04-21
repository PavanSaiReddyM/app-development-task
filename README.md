# Chatroom

A real-time chatroom built with Node.js, Socket.io and SQLite.

## Features
- Real-time messaging
- Image sharing with edge detection compression
- Audio sharing with Opus 64kbps compression
- Bot replies using `/ask` command
- SQLite local database

## Setup

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

## Usage

| Action | How |
|---|---|
| Join | Enter your name and click Join Room |
| Send message | Type and press Enter or click Send |
| Send image | Click `+` button |
| Send audio | Click mic button |
| Ask bot | Type `/ask hello` |

## Tech Stack
- Node.js + Express
- Socket.io
- SQLite (better-sqlite3)
- Sharp (image compression)
- FFmpeg (audio compression)
