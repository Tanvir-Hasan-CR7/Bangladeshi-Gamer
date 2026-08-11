# Minecraft ajLeaderboards External Synchronization Service

An external Node.js backend synchronization service that bridges your Minecraft server's **ajLeaderboards** MySQL database with your **Supabase** backend and web leaderboard interface.

---

## 🏗 Architecture Overview

```
Minecraft Server
    ↓ (ajLeaderboards plugin saves stats)
MySQL Database (`ajlb_*` tables)
    ↓
External Node.js Sync Service (`src/index.js`)
    ↓ (Authenticated HTTP POST with x-sync-token)
Supabase Edge Function (`minecraft-leaderboard-sync`)
    ↓ (Upserts into `minecraft_leaderboards` table)
Supabase PostgreSQL Database
    ↓ (Public SELECT queries using anon key)
Website Leaderboard UI
```

---

## 🚀 Key Features

- **Server-Side Only**: Protects all MySQL credentials and secret synchronization tokens from browser code.
- **Auto-Reconnect**: Resilient MySQL connection pooling with automated error handling and reconnection.
- **Configurable Adapter**: Read-only MySQL queries adapt dynamically to `ajLeaderboards` table structures.
- **60-Second Recurring Daemon**: Performs instant sync on startup, followed by automated periodic synchronization every 60 seconds (configurable).
- **Graceful Shutdown**: Listens to `SIGINT` and `SIGTERM` signals to cleanly release MySQL connection pools before exiting.

---

## 📦 Installation & Setup

### 1. Install Dependencies
Ensure Node.js (v18+) is installed, then run:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your MySQL database details and Supabase secret sync token:
```env
# ajLeaderboards MySQL Credentials
MYSQL_HOST=168.119.102.138
MYSQL_PORT=3306
MYSQL_USER=u168_50U0Rj2EOa
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=s168_MainStore
MYSQL_TABLE_PREFIX=ajlb_

# Supabase Edge Function Target & Secret Token
SUPABASE_FUNCTION_URL=https://feyonbiluperwjnqpyqf.supabase.co/functions/v1/minecraft-leaderboard-sync
AJLB_SYNC_TOKEN=fxcdr5ffdrhhythgytyhttf

# Synchronization Settings
SYNC_INTERVAL_SECONDS=60
TOP_LIMIT=100

# Configurable Metric-to-Table Mapping
LEADERBOARD_MAP=kills=ajlb_statistic_player_kills,deaths=ajlb_statistic_deaths,money=ajlb_vault_eco_balance_commas,playtime=ajlb_statistic_hours_played,blocks_broken=ajlb_statistic_mine_block,mob_kills=ajlb_statistic_mob_kills,votes=ajlb_votes
```

---

## 🔍 Database Inspection Tool

Before running synchronization, inspect your MySQL database schema to verify table names and column layouts:

```bash
npm run inspect
```

This command will:
1. Connect securely to your MySQL database.
2. Search for all tables matching the `MYSQL_TABLE_PREFIX` (e.g. `ajlb_`).
3. Output column definitions, data types, and 3 sample rows.
4. Mask all sensitive credentials in the console log output.

---

## ⚡ Running the Synchronization Service

### Start the Service
```bash
npm run sync
```

Sample output:
```
[SYNC] Starting sync cycle at 2026-08-10T20:28:00.000Z...
[MYSQL] Connected
[SYNC] kills: 8 players formatted
[SUPABASE] kills synchronized successfully (8 records)
[SYNC] deaths: 3 players formatted
[SUPABASE] deaths synchronized successfully (3 records)
[SYNC] money: 4 players formatted
[SUPABASE] money synchronized successfully (4 records)
[SYNC] Sync cycle completed (3 succeeded, 0 failed)
```

---

## 🔐 Security Principles

- **No Browser Exposure**: Neither `MYSQL_PASSWORD` nor `AJLB_SYNC_TOKEN` are exported to or accessible by client-side React code.
- **Read-Only MySQL**: The sync service requires only `SELECT` permissions on `ajlb_*` MySQL tables.
- **Token Authorization**: The Supabase Edge Function validates incoming requests using the `x-sync-token` header.
