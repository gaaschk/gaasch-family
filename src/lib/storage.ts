import path from 'path';
import fs from 'fs';

// ── Storage abstraction ───────────────────────────────────────────────────────

export interface IStorage {
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; mimeType: string }>;
  delete(key: string): Promise<void>;
}

export class LocalStorage implements IStorage {
  constructor(private basePath: string) {}

  async put(key: string, data: Buffer, _mimeType: string) {
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
    case '.pdf':  return 'application/pdf';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png':  return 'image/png';
    case '.gif':  return 'image/gif';
    case '.txt':  return 'text/plain';
    case '.json': return 'application/json';
    default:      return 'application/octet-stream';
  }
}

// Default local storage instance — uploads go to .uploads/ in the project root
export const storage: IStorage = new LocalStorage(
  path.join(process.cwd(), '.uploads')
);
