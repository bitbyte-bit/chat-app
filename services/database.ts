
/**
 * Zenj Database Service
 * Server-only API bridge.
 */

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;

export let db: any = null;

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
  // Note: db is initialized on server, client uses API
  return true;
};

export const saveDatabase = () => Promise.resolve();

export const dbQuery = async (query: string, params: any[] = []) => {
  if (query.includes("FROM profile")) {
    const data = await safeFetch(`${API_BASE}/api/profile`);
    return Array.isArray(data) ? data : (data ? [data] : []);
  }

  if (query.includes("FROM contacts")) {
    const data = await safeFetch(`${API_BASE}/api/contacts`);
    return data || [];
  }

  if (query.includes("FROM messages")) {
    const data = await safeFetch(`${API_BASE}/api/messages`);
    if (data && params.length > 0) {
      return data.filter((m: any) => m.contact_id === params[0]);
    }
    return data || [];
  }

  if (query.includes("FROM directory_users")) {
    const data = await safeFetch(`${API_BASE}/api/directory`);
    return data || [];
  }

  if (query.includes("FROM products")) {
    const data = await safeFetch(`${API_BASE}/api/products`);
    return data || [];
  }

  if (query.includes("FROM tools")) {
    const data = await safeFetch(`${API_BASE}/api/tools`);
    return data || [];
  }

  if (query.includes("FROM system_metrics")) {
    const data = await safeFetch(`${API_BASE}/api/metrics`);
    return data ? [data] : [{ id: 'installs', val: 1 }];
  }

  return [];
};

export const dbRun = async (query: string, params: any[] = []) => {
  // Handle Full Profile INSERT/UPDATE
  if (query.startsWith("INSERT INTO profile") && params.length >= 10) {
    const profile = {
      id: params[0], name: params[1], phone: params[2], email: params[3],
      password: params[4], bio: params[5], avatar: params[6], role: params[7],
      accountStatus: params[8], settings_json: params[9]
    };
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
    const profileId = params[1];
    // Need to get current profile and update
    const currentProfile = await safeFetch(`${API_BASE}/api/profile`);
    if (currentProfile) {
      currentProfile.settings_json = settingsJson;
      await safeFetch(`${API_BASE}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProfile)
      });
    }
    return;
  }

  // Handle Partial Bio/Name/Phone Update
  if (query.startsWith("UPDATE profile SET name=?")) {
    const currentProfile = await safeFetch(`${API_BASE}/api/profile`);
    if (currentProfile) {
      currentProfile.name = params[0];
      currentProfile.phone = params[1];
      currentProfile.email = params[2];
      currentProfile.bio = params[3];
      currentProfile.avatar = params[4];
      await safeFetch(`${API_BASE}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProfile)
      });
    }
    return;
  }

  if (query.startsWith("UPDATE directory_users SET accountStatus")) {
    const status = params[0];
    const badge = params[1];
    const id = params[2];
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
    await safeFetch(`${API_BASE}/api/tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool)
    });
  }

  if (query.startsWith("UPDATE products SET likes")) {
    // This might need a specific API endpoint
    console.log("UPDATE products SET likes not implemented for server");
  }

  if (query.startsWith("UPDATE tools SET downloads")) {
    // This might need a specific API endpoint
    console.log("UPDATE tools SET downloads not implemented for server");
  }

  if (query.startsWith("DELETE FROM tools")) {
    const id = params[0];
    await safeFetch(`${API_BASE}/api/tools/${id}`, { method: 'DELETE' });
  }

  if (query.startsWith("INSERT INTO contacts") || query.startsWith("UPDATE contacts")) {
    const contact = {
      id: params[0], name: params[1], avatar: params[2], status: params[3],
      accountStatus: params[4] || 'active', statusBadge: params[5] || '',
      lastMessageSnippet: params[6], lastMessageTime: params[7], isBlocked: params[8] === 1
    };
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
    await safeFetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }

  if (query.startsWith("UPDATE messages SET status")) {
    // Local status update, no server call needed
    return;
  }

  if (query.startsWith("DELETE FROM messages")) {
    // Might need API endpoint
    console.log("DELETE FROM messages not implemented for server");
  }

  if (query.startsWith("INSERT INTO moments")) {
    const moment = {
      id: params[0], userId: params[1], userName: params[2], userAvatar: params[3],
      content: params[4], mediaUrl: params[5], timestamp: params[6]
    };
    await safeFetch(`${API_BASE}/api/moments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moment)
    });
  }

  if (query.startsWith("UPDATE moments SET")) {
    // Might need API endpoint
    console.log("UPDATE moments not implemented for server");
  }

  if (query.startsWith("DELETE FROM moments")) {
    // Might need API endpoint
    console.log("DELETE FROM moments not implemented for server");
  }

  // For any unhandled, use /api/run
  await safeFetch(`${API_BASE}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params })
  });
};
