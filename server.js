
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
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Password utilities
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Input validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

const validatePassword = (password) => {
  return password && password.length >= 8;
};

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '100mb' }));

app.use(express.static(path.join(__dirname, 'dist')));

// API endpoints
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Validation
  if (!name || !email || !phone || !password) {
    console.log('Registration failed: Missing fields');
    return res.status(400).json({ error: 'All fields required' });
  }
  if (!validateEmail(email)) {
    console.log('Registration failed: Invalid email');
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!validatePhone(phone)) {
    console.log('Registration failed: Invalid phone');
    return res.status(400).json({ error: 'Invalid phone format' });
  }
  if (!validatePassword(password)) {
    console.log('Registration failed: Password too weak');
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existingByEmail = await db.get('SELECT * FROM profile WHERE email = ?', [email]);
    const existingByPhone = await db.get('SELECT * FROM profile WHERE phone = ?', [phone]);

    let userId;
    if (existingByEmail) {
      // If email exists, verify password and login
      const passwordMatch = await verifyPassword(password, existingByEmail.password);
      if (!passwordMatch) {
        return res.status(400).json({ error: 'Account with this email already exists. Please use login instead.' });
      }
      userId = existingByEmail.id;
    } else if (existingByPhone) {
      return res.status(400).json({ error: 'Account with this phone number already exists. Please use a different phone number or login with the existing account.' });
    } else {
      // Create new account
      const hashedPassword = await hashPassword(password);
      userId = `u-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const ip = req.ip || req.connection.remoteAddress;

      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
      const settings = JSON.stringify({ theme: 'dark', wallpaper: '', vibrations: true, notifications: true, fontSize: 'medium', brightness: 'dim', customThemeColor: '#00a884' });
      await db.run(
        "INSERT INTO profile (id, name, phone, email, password, bio, avatar, role, accountStatus, settings_json, accountType, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [userId, name, phone, email, hashedPassword, '', avatar, 'user', 'active', settings, 'member', ip]
      );
      // Also add to directory for discovery
      await db.run(
        "INSERT INTO directory_users (id, name, bio, avatar, tags, accountStatus, statusBadge, email, phone, status, accountType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [userId, name, '', avatar, '', 'active', '', email, phone, 'offline', 'member']
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
    }

    // Return the profile data
    const profile = await db.get('SELECT * FROM profile WHERE id = ?', userId);
    res.json({ success: true, userId, profile });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  console.log('Forgot password attempt:', { email: req.body.email, phone: req.body.phone });
  const { email, phone } = req.body;
  if (!email || !phone) {
    console.log('Forgot password failed: Missing email or phone');
    return res.status(400).json({ error: 'Email and phone required' });
  }
  if (!validateEmail(email) || !validatePhone(phone)) {
    console.log('Forgot password failed: Invalid format');
    return res.status(400).json({ error: 'Invalid email or phone format' });
  }

  try {
    const profiles = await db.all('SELECT * FROM profile WHERE email = ? AND phone = ?', [email, phone]);
    console.log('Profiles found for forgot password:', profiles.length);
    if (profiles.length === 0) {
      console.log('Forgot password failed: Account not found');
      return res.status(404).json({ error: 'Account not found' });
    }

    // Generate reset code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Store reset code
    await db.run(
      'INSERT OR REPLACE INTO password_reset_codes (id, email, code, expires_at) VALUES (?, ?, ?, ?)',
      [`${email}-${Date.now()}`, email, code, expiresAt]
    );

    console.log('Stored reset code for:', email);
    // In real app, send via email/SMS
    res.json({ success: true, message: 'Reset code sent to your email/SMS' }); // For demo, don't return code
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  console.log('Reset password attempt:', { email: req.body.email, phone: req.body.phone });
  const { email, phone, code, newPassword } = req.body;
  if (!email || !phone || !code || !newPassword) {
    console.log('Reset password failed: Missing fields');
    return res.status(400).json({ error: 'All fields required' });
  }
  if (!validateEmail(email) || !validatePhone(phone) || !validatePassword(newPassword)) {
    console.log('Reset password failed: Invalid format');
    return res.status(400).json({ error: 'Invalid email, phone, or password format' });
  }

  try {
    // Verify reset code
    const resetRecord = await db.get(
      'SELECT * FROM password_reset_codes WHERE email = ? AND code = ? AND expires_at > ?',
      [email, code, new Date().toISOString()]
    );

    if (!resetRecord) {
      console.log('Reset password failed: Invalid or expired code');
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    const result = await db.run('UPDATE profile SET password = ? WHERE email = ? AND phone = ?', [hashedPassword, email, phone]);
    console.log('Password reset result:', result.changes);

    // Delete used reset code
    await db.run('DELETE FROM password_reset_codes WHERE id = ?', [resetRecord.id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    console.log('Login failed: Missing email or password');
    return res.status(400).json({ error: 'Email and password required' });
  }
  if (!validateEmail(email)) {
    console.log('Login failed: Invalid email');
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Admin bypass - hash the password for consistency
    if (email === 'bitbyte790@gmail.com' && password === 'zionent.2026') {
      console.log('Admin login attempt');
      let adminUser = await db.get('SELECT * FROM profile WHERE email = ?', [email]);
      if (!adminUser) {
        console.log('Creating admin user');
        const hashedAdminPassword = await hashPassword(password);
        const adminId = `admin-${Date.now()}`;
        await db.run(
          "INSERT INTO profile (id, name, phone, email, password, bio, avatar, role, accountStatus, settings_json, accountType, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [adminId, 'Admin', '', email, hashedAdminPassword, 'System Administrator', `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`, 'admin', 'active', JSON.stringify({ theme: 'dark', wallpaper: '', vibrations: true, notifications: true, fontSize: 'medium', brightness: 'dim', customThemeColor: '#00a884' }), 'admin', req.ip || req.connection.remoteAddress]
        );
        // Add to directory
        await db.run(
          "INSERT INTO directory_users (id, name, bio, avatar, tags, accountStatus, statusBadge, email, phone, status, accountType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [adminId, 'Admin', 'System Administrator', `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`, 'Admin, System', 'active', 'Admin', email, '', 'offline', 'admin']
        );
        adminUser = { id: adminId, name: 'Admin', phone: '', email, password: hashedAdminPassword, bio: 'System Administrator', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`, role: 'admin', accountStatus: 'active', settings_json: JSON.stringify({ theme: 'dark', wallpaper: '', vibrations: true, notifications: true, fontSize: 'medium', brightness: 'dim', customThemeColor: '#00a884' }), accountType: 'admin', ip: req.ip || req.connection.remoteAddress };
      }
      console.log('Admin login successful');
      return res.json(adminUser);
    }

    const user = await db.get('SELECT * FROM profile WHERE email = ?', [email]);
    if (user && await verifyPassword(password, user.password)) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/check-device', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const profiles = await db.all('SELECT * FROM profile WHERE ip = ?', [ip]);
    if (profiles.length > 0) {
      res.json({ registered: true, profile: profiles[0] });
    } else {
      res.json({ registered: false });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to check device' });
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
      status TEXT,
      accountType TEXT,
      ip TEXT
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
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
      user_id TEXT,
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
      user_id TEXT,
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

     CREATE TABLE IF NOT EXISTS password_reset_codes (
       id TEXT PRIMARY KEY,
       email TEXT,
       code TEXT,
       expires_at TEXT
     );
 `);

 // Add ip column if it doesn't exist (for existing databases)
 try {
   await db.run(`ALTER TABLE profile ADD COLUMN ip TEXT;`);
 } catch (err) {
   // Ignore error if column already exists
   if (!err.message.includes('duplicate column name')) {
     console.error('Error adding ip column:', err);
   }
 }

 // No default data insertion

  const installsExists = await db.get('SELECT id FROM system_metrics WHERE id = ?', 'installs');
  if (!installsExists) {
    await db.run('INSERT INTO system_metrics (id, val) VALUES (?, ?)', 'installs', 1);
  }
};

const startServer = async () => {
  await initDb();
 
  const PORT = 3001;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Zenj Relay active on port ${PORT}`);
    // Periodic resource monitoring
    setInterval(() => {
      logResources();
    }, 60000); // Every minute
  });
};

startServer();

app.get('/api/profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const profile = await db.get('SELECT * FROM profile WHERE id = ?', userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    console.log('DEBUG: /api/profile returning profile for user', userId);
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    const profileData = req.body;
    await db.run(`
      INSERT OR REPLACE INTO profile (id, name, phone, email, password, bio, avatar, role, accountStatus, settings_json, accountType)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, profileData.id, profileData.name, profileData.phone, profileData.email, profileData.password, profileData.bio, profileData.avatar, profileData.role, profileData.accountStatus, profileData.settings_json, profileData.accountType);

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
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const contacts = await db.all('SELECT * FROM contacts WHERE user_id = ?', userId);
    res.json(contacts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const contact = req.body;
    await db.run(`
      INSERT OR REPLACE INTO contacts (id, user_id, name, avatar, status, accountStatus, statusBadge, lastMessageSnippet, lastMessageTime, isBlocked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, contact.id, userId, contact.name, contact.avatar, contact.status, contact.accountStatus, contact.statusBadge, contact.lastMessageSnippet, contact.lastMessageTime, contact.isBlocked ? 1 : 0);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { contact_id, limit = 2000 } = req.query;
    let query = 'SELECT * FROM messages WHERE user_id = ?';
    let params = [userId];
    if (contact_id) {
      query += ' AND contact_id = ?';
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
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const message = req.body;
    await db.run(`
      INSERT INTO messages (id, user_id, contact_id, role, content, timestamp, type, mediaUrl, fileName, fileSize, status, reply_to_id, reply_to_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, message.id, userId, message.contact_id, message.role, message.content, message.timestamp, message.type, message.mediaUrl, message.fileName, message.fileSize, message.status, message.reply_to_id, message.reply_to_text);
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
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const moments = await db.all('SELECT * FROM moments WHERE user_id = ? ORDER BY timestamp DESC', userId);
    res.json(moments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/moments', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const moment = req.body;
    await db.run(`
      INSERT INTO moments (id, user_id, userId, userName, userAvatar, content, mediaUrl, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, moment.id, userId, moment.userId, moment.userName, moment.userAvatar, moment.content, moment.mediaUrl, moment.timestamp);
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

app.post('/api/run', async (req, res) => {
  try {
    const { query, params } = req.body;
    // Only allow INSERT, UPDATE, DELETE for security
    const upperQuery = query.toUpperCase().trim();
    if (!upperQuery.startsWith('INSERT') && !upperQuery.startsWith('UPDATE') && !upperQuery.startsWith('DELETE')) {
      return res.status(400).json({ error: 'Only INSERT, UPDATE, DELETE allowed' });
    }
    await db.run(query, params);
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

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const users = new Map();
const sockets = new Map();
// Logging function for resource monitoring
const logResources = () => {
  const memUsage = process.memoryUsage();
  console.log(`Active connections: ${sockets.size}, Users: ${users.size}, Message chunks: ${messageChunks.size}`);
  console.log(`Memory usage - RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)}MB, Heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
};
 
io.on('connection', (socket) => {
  console.log(`New WebSocket connection: ${socket.id}`);
  console.log(`Connection details - IP: ${socket.handshake.address}, User-Agent: ${socket.handshake.headers['user-agent']}`);
  logResources();
  socket.on('error', (error) => {
    console.error(`WebSocket error for ${socket.id}:`, error);
  });
  socket.on('register', async (userId) => {
    users.set(userId, socket.id);
    sockets.set(socket.id, userId);
    console.log(`User registered: ${userId}, Socket: ${socket.id}`);
    logResources();
    // Update directory status
    await db.run('UPDATE directory_users SET status = ? WHERE id = ?', 'online', userId);
 
    io.emit('user_status', { userId, status: 'online' });
  });

  socket.on('disconnect', async () => {
    console.log(`WebSocket disconnected: ${socket.id}`);
    const userId = sockets.get(socket.id);
    if (userId) {
      await db.run('UPDATE directory_users SET status = ? WHERE id = ?', 'offline', userId);
      io.emit('user_status', { userId, status: 'offline' });
      users.delete(userId);
      sockets.delete(socket.id);
    }
    logResources();
  });

  socket.on('send_message', async (data) => {
    console.log(`Message sent from ${sockets.get(socket.id)} to ${data.recipientId}, type: ${data.type}`);
    const recipientId = data.recipientId;
    const senderId = sockets.get(socket.id);
    const isGroup = data.isGroup || false;
    await db.run(`
      INSERT OR IGNORE INTO messages (id, user_id, contact_id, role, content, timestamp, type, mediaUrl, fileName, fileSize, status, reply_to_id, reply_to_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, data.id, senderId, data.recipientId, data.role, data.content, data.timestamp, data.type, data.mediaUrl, data.fileName, data.fileSize, data.status, data.reply_to_id, data.reply_to_text);
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
    const recipientId = data.recipientId;
    const senderId = sockets.get(socket.id);
    const isGroup = data.isGroup || false;
    const { id, chunk, chunkIndex, totalChunks } = data;
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
        INSERT OR IGNORE INTO messages (id, user_id, contact_id, role, content, timestamp, type, mediaUrl, fileName, fileSize, status, reply_to_id, reply_to_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, fullData.id, senderId, fullData.recipientId, fullData.role, fullData.content, fullData.timestamp, fullData.type, fullData.mediaUrl, fullData.fileName, fullData.fileSize, fullData.status, fullData.reply_to_id, fullData.reply_to_text);
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
