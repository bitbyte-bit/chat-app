
/**
 * Zenj Database Service
 * Centralized API bridge with LocalStorage fallback.
 */

const API_BASE = 'http://localhost:3001';

// Local Fallback Storage Key
const FALLBACK_KEY = 'zenj_fallback_db';

const getLocalDb = () => {
  const data = localStorage.getItem(FALLBACK_KEY);
  return data ? JSON.parse(data) : { profile: null, contacts: [], messages: [], directory_users: [], products: [], tools: [] };
};

const saveLocalDb = (data: any) => {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(data));
};

const safeFetch = async (url: string, options?: RequestInit) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`API call failed: ${url} - ${res.status} ${res.statusText}`);
      return null;
    }
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    return null;
  } catch (e) {
    console.error(`API call error: ${url} - ${e}`);
    return null;
  }
};

export const initDatabase = async () => {
  safeFetch(`${API_BASE}/api/metrics`);
  return true; 
};

export const saveDatabase = () => Promise.resolve();

export const dbQuery = async (query: string, params: any[] = []) => {
  const local = getLocalDb();

  if (query.includes("FROM profile")) {
    const data = await safeFetch(`${API_BASE}/api/profile`);
    if (data) {
      local.profile = data;
      saveLocalDb(local);
    }
    return local.profile ? [local.profile] : [];
  }
  
  if (query.includes("FROM contacts")) {
    const data = await safeFetch(`${API_BASE}/api/contacts`);
    if (data) {
      local.contacts = data;
      saveLocalDb(local);
    }
    return local.contacts || [];
  }

  if (query.includes("FROM messages")) {
    const data = await safeFetch(`${API_BASE}/api/messages`);
    if (data) {
      local.messages = data;
      saveLocalDb(local);
    }
    const msgs = local.messages || [];
    if (params.length > 0) {
      return msgs.filter((m: any) => m.contact_id === params[0]);
    }
    return msgs;
  }

  if (query.includes("FROM directory_users")) {
    const data = await safeFetch(`${API_BASE}/api/directory`);
    if (data) {
      local.directory_users = data;
      saveLocalDb(local);
    }
    return local.directory_users || [];
  }

  if (query.includes("FROM products")) {
    const data = await safeFetch(`${API_BASE}/api/products`);
    if (data) {
      local.products = data;
      saveLocalDb(local);
    }
    return local.products || [];
  }

  if (query.includes("FROM tools")) {
    const data = await safeFetch(`${API_BASE}/api/tools`);
    if (data) {
      local.tools = data;
      saveLocalDb(local);
    }
    return local.tools || [];
  }

  if (query.includes("FROM system_metrics")) {
    const data = await safeFetch(`${API_BASE}/api/metrics`);
    return data ? [data] : [{ id: 'installs', val: 1 }];
  }

  return [];
};

export const dbRun = async (query: string, params: any[] = []) => {
  const local = getLocalDb();

  // Handle Full Profile INSERT/UPDATE
  if (query.startsWith("INSERT INTO profile") && params.length >= 10) {
    const profile = {
      id: params[0], name: params[1], phone: params[2], email: params[3],
      password: params[4], bio: params[5], avatar: params[6], role: params[7],
      accountStatus: params[8], settings_json: params[9]
    };
    local.profile = profile;
    saveLocalDb(local);
    await safeFetch(`${API_BASE}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    return;
  }

  // Handle Partial Settings Update
  if (query.startsWith("UPDATE profile SET settings_json")) {
    const settingsJson = params[0];
    if (local.profile) {
      local.profile.settings_json = settingsJson;
      saveLocalDb(local);
      await safeFetch(`${API_BASE}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local.profile)
      });
    }
    return;
  }

  // Handle Partial Bio/Name/Phone Update
  if (query.startsWith("UPDATE profile SET name=?")) {
    if (local.profile) {
      local.profile.name = params[0];
      local.profile.phone = params[1];
      local.profile.email = params[2];
      local.profile.bio = params[3];
      local.profile.avatar = params[4];
      saveLocalDb(local);
      await safeFetch(`${API_BASE}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local.profile)
      });
    }
    return;
  }

  if (query.startsWith("UPDATE directory_users SET accountStatus")) {
    const status = params[0];
    const badge = params[1];
    const id = params[2];
    const idx = (local.directory_users || []).findIndex((u: any) => u.id === id);
    if (idx >= 0) {
      local.directory_users[idx].accountStatus = status;
      local.directory_users[idx].statusBadge = badge;
      saveLocalDb(local);
    }
    await safeFetch(`${API_BASE}/api/directory/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountStatus: status, statusBadge: badge })
    });
  }

  if (query.startsWith("INSERT INTO products")) {
    const product = {
      id: params[0], sellerId: params[1], sellerName: params[2], sellerAvatar: params[3],
      title: params[4], description: params[5], price: params[6], imageUrl: params[7],
      timestamp: params[8], likes: params[9]
    };
    if (!local.products) local.products = [];
    local.products.push(product);
    saveLocalDb(local);
    await safeFetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
  }

  if (query.startsWith("INSERT INTO tools")) {
    const tool = {
      id: params[0], name: params[1], description: params[2], version: params[3],
      iconUrl: params[4], fileUrl: params[5], fileName: params[6], 
      timestamp: params[7], downloads: params[8]
    };
    if (!local.tools) local.tools = [];
    local.tools.push(tool);
    saveLocalDb(local);
    await safeFetch(`${API_BASE}/api/tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool)
    });
  }

  if (query.startsWith("UPDATE products SET likes")) {
    const id = params[1];
    const newLikes = params[0];
    const idx = local.products.findIndex((p: any) => p.id === id);
    if (idx >= 0) {
      local.products[idx].likes = newLikes;
      saveLocalDb(local);
    }
  }

  if (query.startsWith("UPDATE tools SET downloads")) {
    const id = params[1];
    const newDownloads = params[0];
    const idx = local.tools.findIndex((t: any) => t.id === id);
    if (idx >= 0) {
      local.tools[idx].downloads = newDownloads;
      saveLocalDb(local);
    }
  }

  if (query.startsWith("DELETE FROM tools")) {
    const id = params[0];
    local.tools = local.tools.filter((t: any) => t.id !== id);
    saveLocalDb(local);
    await safeFetch(`${API_BASE}/api/tools/${id}`, { method: 'DELETE' });
  }

  if (query.startsWith("INSERT INTO contacts") || query.startsWith("UPDATE contacts")) {
    const contact = {
      id: params[0], name: params[1], avatar: params[2], status: params[3],
      accountStatus: params[4] || 'active', statusBadge: params[5] || '',
      lastMessageSnippet: params[6], lastMessageTime: params[7], isBlocked: params[8] === 1
    };
    const idx = local.contacts.findIndex((c: any) => c.id === contact.id);
    if (idx >= 0) local.contacts[idx] = { ...local.contacts[idx], ...contact };
    else local.contacts.push(contact);
    saveLocalDb(local);
    await safeFetch(`${API_BASE}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact)
    });
  }

  if (query.startsWith("INSERT INTO messages")) {
    const message = {
      id: params[0], contact_id: params[1], role: params[2], content: params[3],
      timestamp: params[4], type: params[5], mediaUrl: params[6], fileName: params[7],
      fileSize: params[8], status: params[9], reply_to_id: params[10], reply_to_text: params[11]
    };
    local.messages.push(message);
    saveLocalDb(local);
    await safeFetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }

  if (query.startsWith("UPDATE messages SET status")) {
    const status = params[0];
    const id = params[1];
    const idx = local.messages.findIndex((m: any) => m.id === id);
    if (idx >= 0) {
      local.messages[idx].status = status;
      saveLocalDb(local);
    }
  }

  if (query.startsWith("DELETE FROM messages")) {
    const id = params[0];
    local.messages = local.messages.filter((m: any) => m.id !== id);
    saveLocalDb(local);
  }

  if (query.startsWith("INSERT INTO moments")) {
    const moment = {
      id: params[0], userId: params[1], userName: params[2], userAvatar: params[3],
      content: params[4], mediaUrl: params[5], timestamp: params[6]
    };
    if (!local.moments) local.moments = [];
    local.moments.push(moment);
    saveLocalDb(local);
    await safeFetch(`${API_BASE}/api/moments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moment)
    });
  }

  if (query.startsWith("UPDATE moments SET")) {
    const id = params[2];
    const content = params[0];
    const mediaUrl = params[1];
    const idx = local.moments.findIndex((m: any) => m.id === id);
    if (idx >= 0) {
      local.moments[idx].content = content;
      local.moments[idx].mediaUrl = mediaUrl;
      saveLocalDb(local);
    }
  }

  if (query.startsWith("DELETE FROM moments")) {
    const id = params[0];
    local.moments = local.moments.filter((m: any) => m.id !== id);
    saveLocalDb(local);
  }

  // For any unhandled, use /api/run
  await safeFetch(`${API_BASE}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params })
  });
};
