import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const cacheDir = path.join(process.cwd(), 'public', 'cache');
    
    // Ensure directories exist
    const folders = ['synthetic_data', 'audit_logs', 'certificates'];
    for (const folder of folders) {
      await fs.mkdir(path.join(cacheDir, folder), { recursive: true });
    }

    const result: Record<string, any[]> = {};

    for (const folder of folders) {
      const folderPath = path.join(cacheDir, folder);
      try {
        const files = await fs.readdir(folderPath);
        const fileDetails = await Promise.all(
          files.filter(f => f !== '.gitkeep').map(async (file) => {
            const stat = await fs.stat(path.join(folderPath, file));
            return {
              name: file,
              url: `/cache/${folder}/${file}`,
              size: stat.size,
              createdAt: stat.birthtime,
            };
          })
        );
        result[folder] = fileDetails.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } catch (e) {
        result[folder] = [];
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to read cache directory:', error);
    return NextResponse.json({ error: 'Failed to read cache directory' }, { status: 500 });
  }
}
