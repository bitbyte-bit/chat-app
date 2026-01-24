
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

app.use(express.static(__dirname));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const DB_PATH = path.join(__dirname, 'zenj.db');

let db;

const initDb = async () => {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      email TEXT,
      password TEXT,
      bio TEXT,
      avatar TEXT,
      role TEXT,
      accountStatus TEXT,
      settings_json TEXT
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT,
      avatar TEXT,
      status TEXT,
      accountStatus TEXT,
      statusBadge TEXT,
      lastMessageSnippet TEXT,
      lastMessageTime TEXT,
      isBlocked INTEGER
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      contact_id TEXT,
      role TEXT,
      content TEXT,
      timestamp TEXT,
      type TEXT,
      mediaUrl TEXT,
      fileName TEXT,
      fileSize TEXT,
      status TEXT,
      reply_to_id TEXT,
      reply_to_text TEXT
    );

    CREATE TABLE IF NOT EXISTS directory_users (
      id TEXT PRIMARY KEY,
      name TEXT,
      bio TEXT,
      avatar TEXT,
      tags TEXT,
      accountStatus TEXT,
      statusBadge TEXT,
      email TEXT,
      phone TEXT,
      status TEXT,
      accountType TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sellerId TEXT,
      sellerName TEXT,
      sellerAvatar TEXT,
      title TEXT,
      description TEXT,
      price TEXT,
      imageUrl TEXT,
      timestamp TEXT,
      likes INTEGER
    );

    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      version TEXT,
      iconUrl TEXT,
      fileUrl TEXT,
      fileName TEXT,
      timestamp TEXT,
      downloads INTEGER
    );

    CREATE TABLE IF NOT EXISTS system_metrics (
      id TEXT PRIMARY KEY,
      val INTEGER
    );
  `);

  // Insert default data if not exists
  const oracleExists = await db.get('SELECT id FROM directory_users WHERE id = ?', 'zenj-main');
  if (!oracleExists) {
    await db.run(`
      INSERT INTO directory_users (id, name, bio, avatar, tags, accountStatus, statusBadge, email, phone, status, accountType)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, 'zenj-main', 'Zenj Oracle', 'The primary consciousness of the Zenj network.', 'https://api.dicebear.com/7.x/bottts/svg?seed=ZenjOracle&backgroundColor=00a884', 'AI, Oracle, Guardian', 'active', '', 'oracle@zenj.ai', '+000000000', 'online', 'member');
  }

  const installsExists = await db.get('SELECT id FROM system_metrics WHERE id = ?', 'installs');
  if (!installsExists) {
    await db.run('INSERT INTO system_metrics (id, val) VALUES (?, ?)', 'installs', 1);
  }
};

initDb();

app.get('/api/profile', async (req, res) => {
  try {
    const profile = await db.get('SELECT * FROM profile LIMIT 1');
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    const profileData = req.body;
    await db.run(`
      INSERT OR REPLACE INTO profile (id, name, phone, email, password, bio, avatar, role, accountStatus, settings_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, profileData.id, profileData.name, profileData.phone, profileData.email, profileData.password, profileData.bio, profileData.avatar, profileData.role, profileData.accountStatus, profileData.settings_json);

    // Upsert into directory_users
    const existing = await db.get('SELECT * FROM directory_users WHERE id = ? OR phone = ?', profileData.id, profileData.phone);
    const status = existing ? existing.status : 'offline';
    const tags = profileData.tags || (profileData.accountType === 'business' ? 'Business, Verified' : 'Member, New Soul');

    await db.run(`
      INSERT OR REPLACE INTO directory_users (id, name, bio, avatar, tags, accountStatus, statusBadge, email, phone, status, accountType)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, profileData.id, profileData.name, profileData.bio, profileData.avatar, tags, profileData.accountStatus, profileData.statusBadge || '', profileData.email, profileData.phone, status, profileData.accountType);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await db.all('SELECT * FROM contacts');
    res.json(contacts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const contact = req.body;
    await db.run(`
      INSERT OR REPLACE INTO contacts (id, name, avatar, status, accountStatus, statusBadge, lastMessageSnippet, lastMessageTime, isBlocked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, contact.id, contact.name, contact.avatar, contact.status, contact.accountStatus, contact.statusBadge, contact.lastMessageSnippet, contact.lastMessageTime, contact.isBlocked ? 1 : 0);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await db.all('SELECT * FROM messages ORDER BY timestamp ASC');
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const message = req.body;
    await db.run(`
      INSERT INTO messages (id, contact_id, role, content, timestamp, type, mediaUrl, fileName, fileSize, status, reply_to_id, reply_to_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, message.id, message.contact_id, message.role, message.content, message.timestamp, message.type, message.mediaUrl, message.fileName, message.fileSize, message.status, message.reply_to_id, message.reply_to_text);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await db.all('SELECT * FROM products ORDER BY timestamp DESC');
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = req.body;
    await db.run(`
      INSERT OR REPLACE INTO products (id, sellerId, sellerName, sellerAvatar, title, description, price, imageUrl, timestamp, likes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, product.id, product.sellerId, product.sellerName, product.sellerAvatar, product.title, product.description, product.price, product.imageUrl, product.timestamp, product.likes || 0);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM products WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tools', async (req, res) => {
  try {
    const tools = await db.all('SELECT * FROM tools ORDER BY timestamp DESC');
    res.json(tools);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tools', async (req, res) => {
  try {
    const tool = req.body;
    await db.run(`
      INSERT OR REPLACE INTO tools (id, name, description, version, iconUrl, fileUrl, fileName, timestamp, downloads)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, tool.id, tool.name, tool.description, tool.version, tool.iconUrl, tool.fileUrl, tool.fileName, tool.timestamp, tool.downloads || 0);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/directory/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus, statusBadge } = req.body;
    await db.run('UPDATE directory_users SET accountStatus = ?, statusBadge = ? WHERE id = ?', accountStatus, statusBadge, id);
    io.emit('user_status', { userId: id, status: accountStatus });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/tools/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM tools WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/directory', async (req, res) => {
  try {
    const users = await db.all('SELECT * FROM directory_users');
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/metrics', async (req, res) => {
  try {
    let metrics = await db.get('SELECT * FROM system_metrics WHERE id = ?', 'installs');
    if (!metrics) {
      await db.run('INSERT INTO system_metrics (id, val) VALUES (?, ?)', 'installs', 1);
      metrics = { id: 'installs', val: 1 };
    } else {
      await db.run('UPDATE system_metrics SET val = val + 1 WHERE id = ?', 'installs');
      metrics.val++;
    }
    res.json(metrics);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const users = new Map(); 
const sockets = new Map();

io.on('connection', (socket) => {
  socket.on('register', async (userId) => {
    users.set(userId, socket.id);
    sockets.set(socket.id, userId);

    // Update directory status
    await db.run('UPDATE directory_users SET status = ? WHERE id = ?', 'online', userId);

    io.emit('user_status', { userId, status: 'online' });
  });

  socket.on('send_message', async (data) => {
    const { recipientId, isGroup } = data;
    await db.run(`
      INSERT INTO messages (id, contact_id, role, content, timestamp, type, mediaUrl, fileName, fileSize, status, reply_to_id, reply_to_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, data.id, data.contact_id, data.role, data.content, data.timestamp, data.type, data.mediaUrl, data.fileName, data.fileSize, data.status, data.reply_to_id, data.reply_to_text);
    if (isGroup) {
      socket.to(recipientId).emit('receive_message', data);
    } else {
      const recipientSocketId = users.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', data);
      }
    }
  });

  socket.on('broadcast', (data) => {
    socket.broadcast.emit('broadcast', data);
  });

  socket.on('disconnect', async () => {
    const userId = sockets.get(socket.id);
    if (userId) {
      users.delete(userId);
      sockets.delete(socket.id);

      await db.run('UPDATE directory_users SET status = ? WHERE id = ?', 'offline', userId);

      io.emit('user_status', { userId, status: 'offline' });
    }
  });

  // WebRTC Signaling
  socket.on('webrtc-offer', (data) => {
    const { to, offer } = data;
    const recipientSocketId = users.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('webrtc-offer', { from: sockets.get(socket.id), offer });
    }
  });

  socket.on('webrtc-answer', (data) => {
    const { to, answer } = data;
    const recipientSocketId = users.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('webrtc-answer', { from: sockets.get(socket.id), answer });
    }
  });

  socket.on('webrtc-ice', (data) => {
    const { to, candidate } = data;
    const recipientSocketId = users.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('webrtc-ice', { from: sockets.get(socket.id), candidate });
    }
  });

  socket.on('webrtc-end', (data) => {
    const { to } = data;
    const recipientSocketId = users.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('webrtc-end', { from: sockets.get(socket.id) });
    }
  });
});

const PORT = 3003;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Zenj Relay active on port ${PORT}`);
});
