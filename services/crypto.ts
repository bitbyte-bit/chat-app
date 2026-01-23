
/**
 * Zenj Cryptography Service
 * Uses Web Crypto API for AES-GCM 256-bit encryption.
 */

let masterKey: CryptoKey | null = null;

export const deriveKeyFromPassword = async (password: string, saltStr: string = 'zenj-default-salt') => {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  masterKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(saltStr),
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return masterKey;
};

export const encryptContent = async (text: string): Promise<string> => {
  if (!masterKey) return text;
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    encoder.encode(text)
  );

  const result = {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  };

  return `zenj_v1:${JSON.stringify(result)}`;
};

export const decryptContent = async (encryptedData: string): Promise<string> => {
  if (!masterKey || !encryptedData.startsWith('zenj_v1:')) return encryptedData;
  
  try {
    const { iv, data } = JSON.parse(encryptedData.replace('zenj_v1:', ''));
    const ivArray = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));
    const dataArray = new Uint8Array(atob(data).split('').map(c => c.charCodeAt(0)));

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArray },
      masterKey,
      dataArray
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e);
    return '🔒 [Encrypted Message]';
  }
};
