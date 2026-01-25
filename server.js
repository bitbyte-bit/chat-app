
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

app.use(express.static(path.join(__dirname, 'dist')));

// API endpoints
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    const existing = await db.all('SELECT * FROM profile WHERE email = ? OR phone = ?', [email, phone]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Account already exists' });
    }
    const userId = `u-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await db.run(
      "INSERT INTO profile (id, name, phone, email, password, bio, avatar, role, accountStatus, settings_json, accountType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, name, phone, email, password, '', `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`, 'user', 'active', JSON.stringify({ theme: 'dark', wallpaper: '', vibrations: true, notifications: true, fontSize: 'medium', brightness: 'dim', customThemeColor: '#00a884' }), 'member']
    );
    // Also add to directory for discovery
    await db.run(
      "INSERT INTO directory_users (id, name, bio, avatar, tags, accountStatus, statusBadge, email, phone, status, accountType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, name, '', `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`, '', 'active', '', email, phone, 'offline', 'member']
    );

    // Emit to all clients that a new user was added
    io.emit('user_added', {
      id: userId,
      name,
      bio: '',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      tags: '',
      accountStatus: 'active',
      statusBadge: '',
      email,
      phone,
      status: 'offline',
      accountType: 'member'
    });

    res.json({ success: true, userId });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  const { email, phone } = req.body;
  if (!email || !phone) {
    return res.status(400).json({ error: 'Email and phone required' });
  }
  try {
    const profiles = await db.all('SELECT * FROM profile WHERE email = ? AND phone = ?', [email, phone]);
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    // Generate reset code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // In real app, send via email/SMS
    res.json({ success: true, code }); // For demo, return code
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, phone, newPassword } = req.body;
  if (!email || !phone || !newPassword) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    await db.run('UPDATE profile SET password = ? WHERE email = ? AND phone = ?', [newPassword, email, phone]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

app.post('/api/update-status', async (req, res) => {
  const { userId, status } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  try {
    await db.run('UPDATE directory_users SET statusBadge = ? WHERE id = ?', [status || '', userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const DB_PATH = path.join(__dirname, 'zenj.db');

let db;

// Store for chunked messages
const messageChunks = new Map();

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
      settings_json TEXT,
      status TEXT
    );
    ALTER TABLE profile ADD COLUMN status TEXT DEFAULT '';

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

    CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages (contact_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (role, contact_id);

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

    CREATE TABLE IF NOT EXISTS moments (
      id TEXT PRIMARY KEY,
      userId TEXT,
      userName TEXT,
      userAvatar TEXT,
      content TEXT,
      mediaUrl TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS system_metrics (
      id TEXT PRIMARY KEY,
      val INTEGER
    );

    CREATE TABLE IF NOT EXISTS unique_installs (
      ip TEXT PRIMARY KEY,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT,
      message TEXT,
      type TEXT,
      timestamp TEXT,
      active INTEGER
    );

    CREATE TABLE IF NOT EXISTS performance_metrics (
      id TEXT PRIMARY KEY,
      metric_name TEXT,
      value REAL,
      timestamp TEXT,
      user_id TEXT
    );

    CREATE TABLE IF NOT EXISTS moment_likes (
      id TEXT PRIMARY KEY,
      moment_id TEXT,
      user_id TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS moment_comments (
      id TEXT PRIMARY KEY,
      moment_id TEXT,
      user_id TEXT,
      user_name TEXT,
      user_avatar TEXT,
      content TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS user_follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT,
      followed_id TEXT,
      timestamp TEXT
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

    // Emit to all clients that a new user was added
    io.emit('user_added', {
      id: profileData.id,
      name: profileData.name,
      bio: profileData.bio,
      avatar: profileData.avatar,
      tags,
      accountStatus: profileData.accountStatus,
      statusBadge: profileData.statusBadge || '',
      email: profileData.email,
      phone: profileData.phone,
      status,
      accountType: profileData.accountType
    });

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
    const { contact_id, limit = 2000 } = req.query;
    let query = 'SELECT * FROM messages';
    let params = [];
    if (contact_id) {
      query += ' WHERE contact_id = ?';
      params.push(contact_id);
    }
    query += ' ORDER BY timestamp DESC';
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    const messages = await db.all(query, params);
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

app.get('/api/moments', async (req, res) => {
  try {
    const moments = await db.all('SELECT * FROM moments ORDER BY timestamp DESC');
    res.json(moments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/moments', async (req, res) => {
  try {
    const moment = req.body;
    await db.run(`
      INSERT INTO moments (id, userId, userName, userAvatar, content, mediaUrl, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, moment.id, moment.userId, moment.userName, moment.userAvatar, moment.content, moment.mediaUrl, moment.timestamp);
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

app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await db.all('SELECT * FROM notifications WHERE active = 1 ORDER BY timestamp DESC');
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const { title, message, type } = req.body;
    const id = `notif-${Date.now()}`;
    await db.run('INSERT INTO notifications (id, title, message, type, timestamp, active) VALUES (?, ?, ?, ?, ?, ?)', [id, title, message, type || 'info', Date.now(), 1]);
    const notification = { id, title, message, type: type || 'info', timestamp: Date.now(), active: 1 };
    io.emit('new_notification', notification);
    res.json({ success: true, notification });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, type, active } = req.body;
    await db.run('UPDATE notifications SET title = ?, message = ?, type = ?, active = ? WHERE id = ?', [title, message, type, active ? 1 : 0, id]);
    const updated = { id, title, message, type, active: active ? 1 : 0 };
    io.emit('update_notification', updated);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('UPDATE notifications SET active = 0 WHERE id = ?', [id]);
    io.emit('delete_notification', { id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/broadcast', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }
    io.emit('broadcast', { content });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus, statusBadge } = req.body;
    await db.run('UPDATE directory_users SET accountStatus = ?, statusBadge = ? WHERE id = ?', accountStatus, statusBadge || '', id);
    io.emit('user_status', { userId: id, status: accountStatus });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tools', async (req, res) => {
  try {
    const { name, description, version, iconUrl, fileUrl, fileName } = req.body;
    const id = `tool-${Date.now()}`;
    await db.run('INSERT INTO tools (id, name, description, version, iconUrl, fileUrl, fileName, timestamp, downloads) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, description, version, iconUrl, fileUrl, fileName, Date.now(), 0]);
    res.json({ success: true, id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/tools/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, version, iconUrl, fileUrl, fileName } = req.body;
    await db.run('UPDATE tools SET name = ?, description = ?, version = ?, iconUrl = ?, fileUrl = ?, fileName = ? WHERE id = ?',
      [name, description, version, iconUrl, fileUrl, fileName, id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/tools/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM tools WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/metrics', async (req, res) => {
  try {
    const { metric_name, value, user_id } = req.body;
    const id = uuidv4();
    await db.run('INSERT INTO performance_metrics (id, metric_name, value, timestamp, user_id) VALUES (?, ?, ?, ?, ?)', [id, metric_name, value, Date.now(), user_id || 'anonymous']);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/metrics', async (req, res) => {
  try {
    const { metric_name, days = 7 } = req.query;
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    let query = 'SELECT * FROM performance_metrics WHERE timestamp > ?';
    let params = [cutoff];
    if (metric_name) {
      query += ' AND metric_name = ?';
      params.push(metric_name);
    }
    query += ' ORDER BY timestamp DESC';
    const metrics = await db.all(query, params);
    res.json(metrics);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Moment interactions
app.post('/api/moments/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const likeId = uuidv4();
    await db.run('INSERT OR IGNORE INTO moment_likes (id, moment_id, user_id, timestamp) VALUES (?, ?, ?, ?)', [likeId, id, user_id, Date.now()]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/moments/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    await db.run('DELETE FROM moment_likes WHERE moment_id = ? AND user_id = ?', [id, user_id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/moments/:id/likes', async (req, res) => {
  try {
    const likes = await db.all('SELECT * FROM moment_likes WHERE moment_id = ?', [req.params.id]);
    res.json(likes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/moments/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_name, user_avatar, content } = req.body;
    const commentId = uuidv4();
    await db.run('INSERT INTO moment_comments (id, moment_id, user_id, user_name, user_avatar, content, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)', [commentId, id, user_id, user_name, user_avatar, content, Date.now()]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/moments/:id/comments', async (req, res) => {
  try {
    const comments = await db.all('SELECT * FROM moment_comments WHERE moment_id = ? ORDER BY timestamp DESC', [req.params.id]);
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users/:id/follow', async (req, res) => {
  try {
    const { id } = req.params;
    const { follower_id } = req.body;
    const followId = uuidv4();
    await db.run('INSERT OR IGNORE INTO user_follows (id, follower_id, followed_id, timestamp) VALUES (?, ?, ?, ?)', [followId, follower_id, id, Date.now()]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id/follow', async (req, res) => {
  try {
    const { id } = req.params;
    const { follower_id } = req.query;
    await db.run('DELETE FROM user_follows WHERE follower_id = ? AND followed_id = ?', [follower_id, id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/moments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, mediaUrl } = req.body;
    await db.run('UPDATE moments SET content = ?, mediaUrl = ? WHERE id = ?', [content, mediaUrl, id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/moments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM moments WHERE id = ?', [id]);
    await db.run('DELETE FROM moment_likes WHERE moment_id = ?', [id]);
    await db.run('DELETE FROM moment_comments WHERE moment_id = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/metrics', async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    // Check if this IP has already been recorded
    const existingInstall = await db.get('SELECT * FROM unique_installs WHERE ip = ?', clientIP);

    if (!existingInstall) {
      // New unique install, record it and increment counter
      await db.run('INSERT INTO unique_installs (ip, timestamp) VALUES (?, ?)', clientIP, new Date().toISOString());

      let metrics = await db.get('SELECT * FROM system_metrics WHERE id = ?', 'installs');
      if (!metrics) {
        await db.run('INSERT INTO system_metrics (id, val) VALUES (?, ?)', 'installs', 1);
        metrics = { id: 'installs', val: 1 };
      } else {
        await db.run('UPDATE system_metrics SET val = val + 1 WHERE id = ?', 'installs');
        metrics.val++;
      }
      res.json(metrics);
    } else {
      // Already recorded, just return current count
      const metrics = await db.get('SELECT * FROM system_metrics WHERE id = ?', 'installs');
      res.json(metrics || { id: 'installs', val: 0 });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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

  socket.on('disconnect', async () => {
    const userId = sockets.get(socket.id);
    if (userId) {
      await db.run('UPDATE directory_users SET status = ? WHERE id = ?', 'offline', userId);
      io.emit('user_status', { userId, status: 'offline' });
      users.delete(userId);
      sockets.delete(socket.id);
    }
  });

  socket.on('send_message', async (data) => {
    const { recipientId, isGroup } = data;
    await db.run(`
      INSERT OR IGNORE INTO messages (id, contact_id, role, content, timestamp, type, mediaUrl, fileName, fileSize, status, reply_to_id, reply_to_text)
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

  socket.on('send_message_chunk', async (data) => {
    const { id, chunk, chunkIndex, totalChunks, recipientId, isGroup } = data;
    if (!messageChunks.has(id)) {
      messageChunks.set(id, { chunks: [], received: 0, data });
    }
    const msgData = messageChunks.get(id);
    msgData.chunks[chunkIndex] = chunk;
    msgData.received++;
    if (msgData.received === totalChunks) {
      // Assemble
      const fullMediaUrl = msgData.chunks.join('');
      const fullData = { ...msgData.data, mediaUrl: fullMediaUrl };
      // Process as normal
      await db.run(`
        INSERT OR IGNORE INTO messages (id, contact_id, role, content, timestamp, type, mediaUrl, fileName, fileSize, status, reply_to_id, reply_to_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, fullData.id, fullData.contact_id, fullData.role, fullData.content, fullData.timestamp, fullData.type, fullData.mediaUrl, fullData.fileName, fullData.fileSize, fullData.status, fullData.reply_to_id, fullData.reply_to_text);
      if (isGroup) {
        socket.to(recipientId).emit('receive_message', fullData);
      } else {
        const recipientSocketId = users.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('receive_message', fullData);
        }
      }
      messageChunks.delete(id);
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

const PORT = 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Zenj Relay active on port ${PORT}`);
});
