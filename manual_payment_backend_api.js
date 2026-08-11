/**
 * Production-Ready Manual Payment Verification Backend (Express + SQLite)
 * 
 * This file contains the complete, standalone server-side implementation
 * for the manual verification workflow. It implements:
 * 1. SQLite Schema Configuration & Migrations
 * 2. Client Submission Endpoint (POST /api/purchases/submit)
 * 3. Fetching Purchases for Admins grouped/sorted by status (GET /api/admin/purchases)
 * 4. Admin updates for approving or rejecting manual orders (POST /api/admin/purchases/action)
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON middleware for request body reading
app.use(express.json());

// Initialize SQLite database
const dbPath = path.resolve(__dirname, 'vortex_store.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite manual verification database.');
    initializeSchema();
  }
});

/**
 * 1. UPDATE SQLITE SCHEMA
 * Creates or modifies the 'purchases' table to support manual status checking & tracking.
 */
function initializeSchema() {
  db.serialize(() => {
    // Create the updated purchases table with sender_number, trx_id, and status
    db.run(`
      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        rank_name TEXT NOT NULL,
        amount_paid INTEGER NOT NULL,
        sender_number TEXT NOT NULL,
        trx_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        purchase_date TEXT NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error('Error establishing purchases schema:', err.message);
      } else {
        console.log('Purchases database schema successfully updated or verified.');
      }
    });
  });
}

/**
 * 2. CLIENT SUBMISSION API
 * POST /api/purchases/submit
 * Handles client checkout submissions by validating, cleaning, and storing them as 'pending'.
 */
app.post('/api/purchases/submit', (req, res) => {
  const { username, rank_name, amount_paid, sender_number, trx_id } = req.body;

  // Basic validation checks
  if (!username || !rank_name || !amount_paid || !sender_number || !trx_id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required field parameters. Please provide username, rank_name, amount_paid, sender_number, and trx_id.' 
    });
  }

  // Clean and normalize inputs
  const cleanUsername = String(username).trim().toLowerCase();
  const cleanRankName = String(rank_name).trim();
  const cleanSenderNumber = String(sender_number).trim();
  const cleanTrxId = String(trx_id).trim().toUpperCase(); // Uppercase TrxIDs
  const bdtAmount = parseInt(amount_paid, 10);

  if (isNaN(bdtAmount) || bdtAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount paid must be a positive integer.' });
  }

  const purchaseId = 'p_' + Math.random().toString(36).substring(2, 11);
  const purchaseDate = new Date().toISOString();

  // Insert statement with status set explicitly to 'pending'
  const sql = `
    INSERT INTO purchases (id, username, rank_name, amount_paid, sender_number, trx_id, status, purchase_date)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `;

  db.run(sql, [purchaseId, cleanUsername, cleanRankName, bdtAmount, cleanSenderNumber, cleanTrxId, purchaseDate], function(err) {
    if (err) {
      console.error('Database write error:', err.message);
      
      // Handle the UNIQUE transaction ID constraint failure gracefully
      if (err.message.includes('NOT UNIQUE') || err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ 
          success: false, 
          error: 'This Transaction ID (TrxID) has already been submitted for evaluation.' 
        });
      }
      return res.status(500).json({ success: false, error: 'An internal error occurred saving your transaction.' });
    }

    res.status(201).json({
      success: true,
      message: 'Transaction successfully submitted for manual validation.',
      purchase: {
        id: purchaseId,
        username: cleanUsername,
        rank_name: cleanRankName,
        amount_paid: bdtAmount,
        sender_number: cleanSenderNumber,
        trx_id: cleanTrxId,
        status: 'pending',
        purchase_date: purchaseDate
      }
    });
  });
});

/**
 * 3. ADMIN ACTION: FETCH ALL PURCHASES
 * GET /api/admin/purchases
 * Fetches all manual receipt submissions grouped or sorted by their verification status so admins can review them.
 */
app.get('/api/admin/purchases', (req, res) => {
  // Sort primarily by pending first, then newest submission date
  const sql = `
    SELECT * FROM purchases 
    ORDER BY 
      CASE status 
        WHEN 'pending' THEN 1 
        WHEN 'approved' THEN 2 
        WHEN 'rejected' THEN 3 
      END ASC,
      purchase_date DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Database query error:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to retrieve manual receipts list.' });
    }

    res.json({
      success: true,
      count: rows.length,
      purchases: rows
    });
  });
});

/**
 * 3. ADMIN ACTION: APPROVE / REJECT TRANSACTION
 * POST /api/admin/purchases/action
 * Accepts parameter purchaseId and action ('approve' or 'reject'). 
 * Updates row status accordingly.
 */
app.post('/api/admin/purchases/action', (req, res) => {
  const { purchaseId, action } = req.body;

  if (!purchaseId || !action) {
    return res.status(400).json({ success: false, error: 'Parameters purchaseId and action are required.' });
  }

  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ success: false, error: "Action must be either 'approve' or 'reject'." });
  }

  const targetStatus = action === 'approve' ? 'approved' : 'rejected';

  const updateSql = `UPDATE purchases SET status = ? WHERE id = ?`;

  db.run(updateSql, [targetStatus, purchaseId], function(err) {
    if (err) {
      console.error('Database update error:', err.message);
      return res.status(500).json({ success: false, error: 'An error occurred updating the transaction status.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: `No purchase record found matching id: ${purchaseId}` });
    }

    res.json({
      success: true,
      message: `Transaction record successfully marked as: ${targetStatus}`,
      updatedId: purchaseId,
      status: targetStatus
    });
  });
});

// Standalone server lifecycle
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running in production with port ${PORT}`);
});
