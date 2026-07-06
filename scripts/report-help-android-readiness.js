#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');

const sourcePaths = {
  capacitorConfig: path.join(rootDir, 'redirect', 'capacitor.config.ts'),
  androidManifest: path.join(rootDir, 'redirect', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
  appSource: path.join(rootDir, 'redirect', 'src', 'App.js'),
  nativeApp: path.join(rootDir, 'redirect', 'src', 'utils', 'nativeApp.js'),
  helpContent: path.join(rootDir, 'redirect', 'src', 'content', 'helpCenterContent.js'),
  androidProtocol: path.join(rootDir, 'docs', 'help-center-planning', '16-android-oauth-permissions-verification-protocol.md'),
  androidWorksheetGenerator: path.join(rootDir, 'scripts', 'create-help-android-verification-worksheet.js'),
  androidDeviceEvidenceReporter: path.join(rootDir, 'scripts', 'report-help-android-device-evidence.js'),
  releaseReadiness: path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js'),
  rootPackage: path.join(rootDir, 'package.json'),
  frontendPackage: path.join(rootDir, 'redirect', 'package.json'),
};

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const sourceHasAll = (source, tokens) => tokens.every((token) => source.includes(token));

const countBy = (items, key) =>
  items.reduce((counts, item) => {
    const value = item[key] || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});

const check = (area, label, passed, source) => ({ area, label, passed, source });

const loadHelpContent = (source) => {
  const transformed = source.replace(/export const /g, 'const ').concat(`
globalThis.__helpContent = {
  helpArticles,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(transformed, context, { filename: sourcePaths.helpContent });
  return context.__helpContent;
};

const loadReleaseReadiness = (source) => {
  const transformed = source.replace(/export const /g, 'const ').concat(`
globalThis.__releaseReadiness = {
  HELP_RELEASE_READINESS_GATES,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(transformed, context, { filename: sourcePaths.releaseReadiness });
  return context.__releaseReadiness;
};

const buildReadiness = () => {
  const sources = Object.fromEntries(
    Object.entries(sourcePaths).map(([key, filePath]) => [key, readText(filePath)])
  );
  const rootPackage = JSON.parse(sources.rootPackage);
  const frontendPackage = JSON.parse(sources.frontendPackage);
  const helpContent = loadHelpContent(sources.helpContent);
  const releaseReadiness = loadReleaseReadiness(sources.releaseReadiness);
  const androidArticles = helpContent.helpArticles.filter((article) => article.category === 'android');
  const androidGateIds = [
    'android-debug-packaging-emulator',
    'physical-android-device',
    'android-oauth-provider-return',
    'android-permissions-camera-microphone',
  ];
  const androidGates = releaseReadiness.HELP_RELEASE_READINESS_GATES.filter((gate) =>
    androidGateIds.includes(gate.id)
  );
  const openAndroidGates = androidGates.filter((gate) => gate.status !== 'verified-local');

  const sourceChecks = [
    check(
      'capacitor',
      'Capacitor app identity and web bundle directory are configured',
      sourceHasAll(sources.capacitorConfig, ["appId: 'com.lekhon.app'", "appName: 'Lekhon'", "webDir: 'build'", "androidScheme: 'https'"]),
      'capacitor.config.ts'
    ),
    check(
      'manifest',
      'Android manifest declares required runtime permissions',
      sourceHasAll(sources.androidManifest, ['android.permission.INTERNET', 'android.permission.CAMERA', 'android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS']),
      'AndroidManifest.xml'
    ),
    check(
      'manifest',
      'Camera and microphone hardware are optional',
      sourceHasAll(sources.androidManifest, ['android.hardware.camera" android:required="false"', 'android.hardware.microphone" android:required="false"']),
      'AndroidManifest.xml'
    ),
    check(
      'manifest',
      'Main activity uses singleTask launch mode for WebView navigation state',
      sources.androidManifest.includes('android:launchMode="singleTask"'),
      'AndroidManifest.xml'
    ),
    check(
      'scripts',
      'Frontend Android sync and run scripts are present',
      frontendPackage.scripts['android:sync']?.includes('npx cap sync android') &&
        frontendPackage.scripts['android:run']?.includes('npx cap run android'),
      'redirect/package.json'
    ),
    check(
      'scripts',
      'Android device evidence reporter is exposed at root and frontend',
      rootPackage.scripts['help:android-device-evidence'] ===
        'node scripts/report-help-android-device-evidence.js' &&
        frontendPackage.scripts['help:android-device-evidence'] ===
          'node ../scripts/report-help-android-device-evidence.js' &&
        sourceHasAll(sources.androidDeviceEvidenceReporter, [
          'Lekhon Android Device Evidence',
          'adb',
          'com.lekhon.app',
          'manual route, provider, permission, and accessibility evidence',
        ]),
      'report-help-android-device-evidence.js'
    ),
    check(
      'native-routing',
      'Native app mode skips landing page and starts at Home',
      sources.appSource.includes('runningNativeApp ? <Navigate to="/home" replace /> : <LandingPage />'),
      'App.js'
    ),
    check(
      'native-routing',
      'Android hardware back navigates in-app history before minimizing',
      sourceHasAll(sources.appSource, ["CapacitorApp.addListener('backButton'", 'navigate(-1)', 'CapacitorApp.minimizeApp']),
      'App.js'
    ),
    check(
      'native-detection',
      'Native platform detection covers Android and iOS',
      sourceHasAll(sources.nativeApp, ['isNativePlatform', "platform === 'android'", "platform === 'ios'"]),
      'nativeApp.js'
    ),
    check(
      'oauth',
      'OAuth callback routes are registered for Google, Facebook, X/Twitter, and LinkedIn',
      sourceHasAll(sources.appSource, ['path="/auth/google/callback"', 'path="/auth/facebook/callback"', 'path="/auth/twitter/callback"', 'path="/auth/linkedin/callback"']),
      'App.js'
    ),
    check(
      'help-content',
      'Android Help articles cover install, OAuth/permissions, and back/offline guidance',
      ['install-and-update-android-test-app', 'android-permissions-and-oauth', 'android-navigation-and-offline-limits'].every((slug) =>
        androidArticles.some((article) => article.slug === slug)
      ),
      'helpCenterContent.js'
    ),
    check(
      'protocol',
      'Android protocol names physical device, OAuth, permissions, and TalkBack evidence',
      sourceHasAll(sources.androidProtocol, ['Physical-Device Test Matrix', 'OAuth Provider Test Matrix', 'Permission Test Matrix', 'TalkBack and Accessibility']),
      '16-android-oauth-permissions-verification-protocol.md'
    ),
    check(
      'worksheet',
      'Android worksheet generator includes provider, permission, navigation, and TalkBack matrices',
      sourceHasAll(sources.androidWorksheetGenerator, ['OAuth Provider Matrix', 'Permission Matrix', 'Navigation And Storage Matrix', 'TalkBack And Mobile Accessibility']),
      'create-help-android-verification-worksheet.js'
    ),
    check(
      'release-gate',
      'Android release gates remain open for physical phone, OAuth return, and permission evidence',
      ['physical-android-device', 'android-oauth-provider-return', 'android-permissions-camera-microphone'].every((gateId) => {
        const gate = androidGates.find((entry) => entry.id === gateId);
        return (
          gate &&
          gate.status === 'pending-external' &&
          gate.evidence.includes('npm run help:android-device-evidence') &&
          gate.evidence.includes('npm run help:android-worksheet -- --name <android-pass-name> --dry-run')
        );
      }),
      'releaseReadiness.js'
    ),
  ];

  const failedSourceChecks = sourceChecks.filter((entry) => !entry.passed);
  const remainingEvidence = [
    'Physical Android phone install, launch, route, back-navigation, and local-save behavior.',
    'ADB device and installed package evidence from npm run help:android-device-evidence.',
    'Google, Facebook, X/Twitter, and LinkedIn provider handoff, callback domain, and final app state.',
    'Camera, microphone, files/photos, and denied-permission recovery on a real device.',
    'TalkBack pass on Help, articles, footer accordions, support forms, OAuth handoff, permission prompts, and Android back behavior.',
    'Release artifact identity, APK hash, signature, device model, Android version, tester, evidence folder, and cleanup owner.',
  ];

  return {
    result:
      failedSourceChecks.length === 0
        ? 'android source readiness ready; physical-device evidence required'
        : 'android source readiness incomplete',
    gateCounts: {
      androidRelated: androidGates.length,
      verifiedLocalAndroid: androidGates.filter((gate) => gate.status === 'verified-local').length,
      openAndroid: openAndroidGates.length,
      byStatus: countBy(androidGates, 'status'),
    },
    androidArticles: androidArticles.map((article) => article.slug),
    sourceChecks,
    checksByArea: countBy(sourceChecks, 'area'),
    failedSourceChecks,
    remainingEvidence,
  };
};

const renderChecks = (checks) =>
  checks.map((entry) => `- ${entry.passed ? 'pass' : 'fail'}: ${entry.label} (${entry.source})`).join('\n');

const renderKeyValueCounts = (counts) =>
  Object.entries(counts)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

const renderMarkdown = (readiness) => `# Lekhon Android Readiness Summary

Result: ${readiness.result}

## Counts

- Android-related gates: ${readiness.gateCounts.androidRelated}
- Verified local Android gates: ${readiness.gateCounts.verifiedLocalAndroid}
- Open Android gates: ${readiness.gateCounts.openAndroid}
- Android Help articles: ${readiness.androidArticles.length}
- Source checks: ${readiness.sourceChecks.length}
- Failed source checks: ${readiness.failedSourceChecks.length}

## Android Gate Counts By Status

${renderKeyValueCounts(readiness.gateCounts.byStatus)}

## Android Help Articles

${readiness.androidArticles.map((slug) => `- ${slug}`).join('\n')}

## Source Checks

${renderChecks(readiness.sourceChecks)}

## Checks By Area

${renderKeyValueCounts(readiness.checksByArea)}

## Remaining Physical-Device Evidence

${readiness.remainingEvidence.map((item) => `- ${item}`).join('\n')}

## Completion Rule

Do not mark the physical Android, Android OAuth, or Android permissions gates complete until current physical-device evidence exists. Emulator checks, source readiness, and worksheet dry runs prepare testing, but do not replace real-phone evidence.
`;

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:android-readiness',
      '  npm run help:android-readiness -- --json',
      '',
      'Options:',
      '  --json   Print machine-readable Android readiness data.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const readiness = buildReadiness();
  console.log(hasFlag('--json') ? JSON.stringify(readiness, null, 2) : renderMarkdown(readiness));
};

if (require.main === module) {
  main();
}

module.exports = {
  buildReadiness,
  renderMarkdown,
};
