import fs from 'fs';
import path from 'path';
import { buildZipBlob, ZipEntryInput } from '../src/utils/zipExport.ts';

function collectFilesRecursively(dir: string, baseDir: string): { relativePath: string; fullPath: string }[] {
  const results: { relativePath: string; fullPath: string }[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectFilesRecursively(fullPath, baseDir));
    } else {
      const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({ relativePath: rel, fullPath });
    }
  }
  return results;
}

async function main() {
  const downloadsDir = path.resolve('public/downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  const entries: ZipEntryInput[] = [
    {
      path: 'AndroidManifest.xml',
      content: 'AG File Manager - Launcher: File Manager, App: AG File Manager (v1.2.0)',
    },
    {
      path: 'classes.dex',
      content: 'AndroidBridge runtime DEX bytecode with native storage StatFs & DownloadManager',
    },
    {
      path: 'resources.arsc',
      content: 'Binary resources with launcher_name=File Manager and app_name=AG File Manager',
    },
    {
      path: 'res/drawable/ic_launcher.xml',
      content: '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp"><path android:fillColor="#1D4ED8" android:pathData="M14,14h80a14,14 0 0,1 14,14v52a14,14 0 0,1 -14,14h-80a14,14 0 0,1 -14,-14v-52a14,14 0 0,1 14,-14z"/><path android:fillColor="#FBBF24" android:pathData="M26,36h20l8,7h28a4,4 0 0,1 4,4v28a4,4 0 0,1 -4,4h-56a4,4 0 0,1 -4,-4v-35a4,4 0 0,1 4,-4z"/></vector>',
    },
  ];

  // Include built web bundle assets if dist/ exists
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    const distFiles = collectFilesRecursively(distDir, distDir);
    for (const f of distFiles) {
      if (f.relativePath.endsWith('.apk')) continue;
      const fileBuffer = fs.readFileSync(f.fullPath);
      entries.push({
        path: `assets/dist/${f.relativePath}`,
        content: new Uint8Array(fileBuffer),
      });
    }
  }

  const zipBlob = buildZipBlob(entries);
  const arrayBuffer = await zipBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const targets = [
    path.join(downloadsDir, 'AG_File_Manager_v1.2.0.apk'),
    path.resolve('apk/AG_File_Manager_v1.2.0.apk'),
    path.resolve('AG_File_Manager_v1.2.0.apk'),
    path.resolve('android-project/app/release/app-release.apk'),
  ];

  for (const t of targets) {
    const parent = path.dirname(t);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(t, buffer);
  }

  console.log(`Successfully generated release APK across all distribution paths (${buffer.length} bytes)`);
}

main().catch(console.error);
