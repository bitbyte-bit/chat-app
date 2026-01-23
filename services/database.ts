
import initSqlJs, { Database } from 'sql.js';

let db: Database;

export const initDatabase = async () => {
  const wasmUrl = 'https://sql.js.org/dist/sql-wasm.wasm';
  const response = await fetch(wasmUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch SQL WASM from ${wasmUrl}`);
  }
  const wasmBinary = await response.arrayBuffer();

  const SQL = await initSqlJs({
    wasmBinary: wasmBinary
  });

  const savedDb = localStorage.getItem('zenj_sqlite_db');
  if (savedDb) {
    try {
      const u8 = new Uint8Array(JSON.parse(savedDb));
      db = new SQL.Database(u8);
      
      // Migration for reply features if needed
      try { db.run("ALTER TABLE messages ADD COLUMN reply_to_id TEXT;"); } catch(e){}
      try { db.run("ALTER TABLE messages ADD COLUMN reply_to_text TEXT;"); } catch(e){}
    } catch (e) {
      console.error("Failed to load saved database, starting fresh", e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    // Create Tables
    db.run(`
      CREATE TABLE IF NOT EXISTS profile (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        email TEXT,
        password TEXT,
        bio TEXT,
        avatar TEXT,
        settings_json TEXT
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT,
        avatar TEXT,
        status TEXT,
        lastMessageSnippet TEXT,
        lastMessageTime INTEGER,
        systemInstruction TEXT,
        phone TEXT,
        isInvitePlaceholder INTEGER,
        isGroup INTEGER,
        members_json TEXT,
        ownerId TEXT,
        unreadCount INTEGER,
        isBlocked INTEGER,
        hideDetails INTEGER
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        contact_id TEXT,
        role TEXT,
        content TEXT,
        timestamp INTEGER,
        type TEXT,
        mediaUrl TEXT,
        status TEXT,
        reactions_json TEXT,
        reply_to_id TEXT,
        reply_to_text TEXT
      );

      CREATE TABLE IF NOT EXISTS moments (
        id TEXT PRIMARY KEY,
        userId TEXT,
        userName TEXT,
        userAvatar TEXT,
        content TEXT,
        mediaUrl TEXT,
        timestamp INTEGER,
        type TEXT
      );

      CREATE TABLE IF NOT EXISTS directory_users (
        id TEXT PRIMARY KEY,
        name TEXT,
        bio TEXT,
        avatar TEXT,
        tags TEXT
      );
    `);
    saveDatabase();
  }
  return db;
};

export const saveDatabase = () => {
  if (!db) return;
  try {
    const data = db.export();
    const array = Array.from(data);
    localStorage.setItem('zenj_sqlite_db', JSON.stringify(array));
  } catch (e) {
    console.error("Failed to save database", e);
  }
};

export const getDb = () => db;

const sanitizeParams = (params: any[]) => params.map(p => p === undefined ? null : p);

export const dbQuery = (query: string, params: any[] = []) => {
  if (!db) return [];
  const stmt = db.prepare(query);
  try {
    stmt.bind(sanitizeParams(params));
    const results = [];
    while (stmt.step()) {
      const obj = stmt.getAsObject();
      // Map DB names to interface names
      if (obj.reply_to_id) obj.replyToId = obj.reply_to_id;
      if (obj.reply_to_text) obj.replyToText = obj.reply_to_text;
      results.push(obj);
    }
    return results;
  } finally {
    stmt.free();
  }
};

export const dbRun = (query: string, params: any[] = []) => {
  if (!db) return;
  db.run(query, sanitizeParams(params));
};
