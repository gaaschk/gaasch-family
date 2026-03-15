// Minimal storage abstraction for Document vault
export interface Storage {
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; mimeType: string }>;
  delete(key: string): Promise<void>;
}

import path from 'path';
importfs = require('fs');
export class LocalStorage implements Storage {
  constructor(private basePath: string) {}
  async put(key: string, data: Buffer, mimeType: string) {
    const full = path.join(this.basePath, key);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, data);
  }
  async get(key: string) {
    const full = path.join(this.basePath, key);
    const data = await fs.promises.readFile(full);
    return { data, mimeType: mimeTypeFromPath(key) };
  }
  async delete(key: string) {
    const full = path.join(this.basePath, key);
    await fs.promises.unlink(full);
  }
}

function mimeTypeFromPath(key: string): string {
  const ext = path.extname(key).toLowerCase();
  switch (ext) {
    case '.txt': return 'text/plain';
    case '.json': return 'application/json';
    case '.pdf': return 'application/pdf';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.gif': return 'image/gif';
    default: return 'application/octet-stream';
  }
}
