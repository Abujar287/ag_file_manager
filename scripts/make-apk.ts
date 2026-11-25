import { execSync } from 'child_process';

console.log('Delegating APK build to scripts/build-android-apk.sh (real Gradle + Android SDK build)...');
execSync('bash scripts/build-android-apk.sh', { stdio: 'inherit' });
