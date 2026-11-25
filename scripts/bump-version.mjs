import fs from 'fs';
import path from 'path';

const REPO = process.env.GITHUB_REPOSITORY || 'Abujar287/ag_file_manager';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--code' && argv[i + 1]) {
      args.code = argv[++i];
    } else if (a === '--name' && argv[i + 1]) {
      args.name = argv[++i];
    } else if (a === '--no-bump') {
      args.noBump = true;
    } else if (a === '--clean-apks') {
      args.cleanApks = true;
    }
  }
  return args;
}

function incrementPatch(versionName) {
  const clean = versionName.replace(/^v/i, '').trim();
  const parts = clean.split('.').map((p) => parseInt(p, 10));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n) && n >= 0)) {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n) && n >= 0)) {
    return `${parts[0]}.${parts[1]}.1`;
  }
  return '1.2.1';
}

function removeOldVersionApks(keepFilename) {
  const dirs = ['.', 'apk', 'public/downloads'];
  for (const dir of dirs) {
    const absDir = path.resolve(dir);
    if (!fs.existsSync(absDir)) continue;
    for (const entry of fs.readdirSync(absDir)) {
      if (/^AG_File_Manager_v.*\.apk$/i.test(entry) && entry !== keepFilename) {
        fs.rmSync(path.join(absDir, entry), { force: true });
      }
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const versionPath = path.resolve('version.json');
  const publicVersionPath = path.resolve('public/version.json');
  const tsVersionPath = path.resolve('src/versionInfo.ts');
  const gradlePath = path.resolve('android-project/app/build.gradle.kts');

  const current = {
    versionCode: 3,
    versionName: '1.2.0',
    apkUrl: `https://github.com/${REPO}/releases/download/v1.2.0/AG_File_Manager_v1.2.0.apk`,
  };

  if (fs.existsSync(versionPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      if (typeof parsed.versionCode === 'number') current.versionCode = parsed.versionCode;
      if (typeof parsed.versionName === 'string') current.versionName = parsed.versionName;
    } catch {
      // fall back to defaults
    }
  }

  let nextCode = current.versionCode;
  let nextName = current.versionName;

  if (typeof args.code === 'string' && parseInt(args.code, 10) > 0) {
    nextCode = parseInt(args.code, 10);
  } else if (!args.noBump) {
    nextCode = current.versionCode + 1;
  }

  if (typeof args.name === 'string' && args.name.trim()) {
    nextName = args.name.replace(/^v/i, '').trim();
  } else if (!args.noBump) {
    nextName = incrementPatch(current.versionName);
  }

  const apkFilename = `AG_File_Manager_v${nextName}.apk`;
  const apkUrl = `https://github.com/${REPO}/releases/download/v${nextName}/${apkFilename}`;

  const manifest = {
    versionCode: nextCode,
    versionName: nextName,
    apkUrl,
  };

  const jsonBody = JSON.stringify(manifest, null, 2) + '\n';
  fs.writeFileSync(versionPath, jsonBody, 'utf8');
  fs.mkdirSync(path.dirname(publicVersionPath), { recursive: true });
  fs.writeFileSync(publicVersionPath, jsonBody, 'utf8');

  const tsBody = `export const APP_VERSION_CODE = ${nextCode};
export const APP_VERSION_NAME = '${nextName}';
export const GITHUB_REPO = '${REPO}';
export const REMOTE_VERSION_JSON_URL = \`https://raw.githubusercontent.com/\${GITHUB_REPO}/main/version.json\`;
export const REMOTE_DOWNLOADS_BASE_URL = \`https://raw.githubusercontent.com/\${GITHUB_REPO}/main/public/downloads\`;
export const GITHUB_RELEASE_DOWNLOAD_BASE = \`https://github.com/\${GITHUB_REPO}/releases/download\`;
`;
  fs.writeFileSync(tsVersionPath, tsBody, 'utf8');

  if (fs.existsSync(gradlePath)) {
    let gradle = fs.readFileSync(gradlePath, 'utf8');
    gradle = gradle.replace(
      /(versionCode\s*=\s*\(project\.findProperty\("VERSION_CODE"\)\s+as\?\s+String\)\?\.toIntOrNull\(\)\s+\?:\s+)\d+/,
      `$1${nextCode}`
    );
    gradle = gradle.replace(
      /(versionName\s*=\s*\(project\.findProperty\("VERSION_NAME"\)\s+as\?\s+String\)\s+\?:\s+)"[^"]+"/,
      `$1"${nextName}"`
    );
    fs.writeFileSync(gradlePath, gradle, 'utf8');
  }

  if (args.cleanApks) {
    removeOldVersionApks(apkFilename);
  }

  console.log(`VERSION_CODE=${nextCode}`);
  console.log(`VERSION_NAME=${nextName}`);
  console.log(`APK_FILENAME=${apkFilename}`);
  console.log(`APK_URL=${apkUrl}`);
}

main();
