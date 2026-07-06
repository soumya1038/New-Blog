#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const getArgValue = (name, fallback = '') => {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1]) return args[index + 1];
  return fallback;
};

const normalizePath = (value) => (value ? path.normalize(value) : '');

const commandExists = (filePath) => {
  const result = spawnSync(filePath, ['version'], { encoding: 'utf8', stdio: 'pipe' });
  return result.status === 0;
};

const findAdb = () => {
  const platformTools = (base) =>
    base ? path.join(base, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb') : '';

  const candidates = [
    process.env.ADB,
    platformTools(process.env.ANDROID_HOME),
    platformTools(process.env.ANDROID_SDK_ROOT),
    platformTools(process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk')),
    'adb',
  ]
    .map(normalizePath)
    .filter(Boolean);

  const uniqueCandidates = [...new Set(candidates)];
  for (const candidate of uniqueCandidates) {
    if ((candidate === 'adb' || fs.existsSync(candidate)) && commandExists(candidate)) {
      const version = execFileSync(candidate, ['version'], { encoding: 'utf8', stdio: 'pipe' })
        .split(/\r?\n/)
        .filter(Boolean)[0];
      return { path: candidate, version };
    }
  }

  return null;
};

const runAdb = (adb, adbArgs, serial = '') => {
  const commandArgs = serial ? ['-s', serial, ...adbArgs] : adbArgs;
  try {
    return {
      ok: true,
      output: execFileSync(adb.path, commandArgs, {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 15000,
      }).trim(),
    };
  } catch (error) {
    const output = [error.stdout, error.stderr, error.message]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean)
      .join('\n');
    return { ok: false, output };
  }
};

const parseDetails = (tokens) =>
  tokens.reduce((details, token) => {
    const [key, ...rest] = token.split(':');
    if (key && rest.length > 0) details[key] = rest.join(':');
    return details;
  }, {});

const parseDevices = (output) =>
  output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const tokens = line.split(/\s+/);
      const [serial = '', state = '', ...detailTokens] = tokens;
      const details = parseDetails(detailTokens);
      const emulator =
        serial.startsWith('emulator-') ||
        String(details.product || '').includes('sdk_') ||
        String(details.model || '').toLowerCase().includes('sdk');
      return {
        serial,
        state,
        emulator,
        kind: emulator ? 'emulator' : 'physical',
        details,
      };
    });

const shell = (value) => String(value || '').replace(/"/g, '\\"');

const getProp = (adb, serial, property) => {
  const result = runAdb(adb, ['shell', 'getprop', property], serial);
  return result.ok ? result.output : '';
};

const parsePackageInfo = (dumpOutput, packageId) => {
  const permissions = [
    'android.permission.INTERNET',
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS',
  ].map((permission) => ({
    permission,
    declared: dumpOutput.includes(permission),
    granted: new RegExp(`${permission.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: granted=true`).test(
      dumpOutput
    ),
  }));

  return {
    packageId,
    versionName: dumpOutput.match(/versionName=([^\s]+)/)?.[1] || '',
    versionCode: dumpOutput.match(/versionCode=(\d+)/)?.[1] || '',
    targetSdk: dumpOutput.match(/targetSdk=(\d+)/)?.[1] || '',
    firstInstallTime: dumpOutput.match(/firstInstallTime=([^\n]+)/)?.[1]?.trim() || '',
    lastUpdateTime: dumpOutput.match(/lastUpdateTime=([^\n]+)/)?.[1]?.trim() || '',
    requestedPermissions: permissions,
  };
};

const buildReviewerCommands = ({ adbPath, serial, packageId }) => {
  const adbCommand = adbPath === 'adb' ? 'adb' : `"${adbPath}"`;
  const serialArg = `-s ${shell(serial)}`;
  return [
    `${adbCommand} ${serialArg} shell monkey -p ${shell(packageId)} 1`,
    `${adbCommand} ${serialArg} shell dumpsys package ${shell(packageId)}`,
    `${adbCommand} ${serialArg} exec-out screencap -p > output/android-device-home.png`,
    `${adbCommand} ${serialArg} logcat -d -t 300 > output/android-device-logcat.txt`,
  ];
};

const buildEvidence = () => {
  const packageId = getArgValue('--package', 'com.lekhon.app');
  const requestedSerial = getArgValue('--serial', '');
  const includeEmulators = hasFlag('--include-emulators');
  const adb = findAdb();

  if (!adb) {
    return {
      result: 'android device evidence blocked: adb not found',
      packageId,
      adb: null,
      devices: [],
      selectedDevice: null,
      appInstalled: false,
      manualEvidenceStillRequired: [
        'Install Android Studio platform tools or set ADB to the adb executable path.',
        'Connect a real Android phone with USB debugging enabled.',
      ],
    };
  }

  const devicesResult = runAdb(adb, ['devices', '-l']);
  const devices = devicesResult.ok ? parseDevices(devicesResult.output) : [];
  const authorizedDevices = devices.filter((device) => device.state === 'device');
  const eligibleDevices = authorizedDevices.filter((device) => includeEmulators || !device.emulator);
  const selectedDevice = requestedSerial
    ? devices.find((device) => device.serial === requestedSerial)
    : eligibleDevices.length === 1
      ? eligibleDevices[0]
      : null;

  if (!devicesResult.ok) {
    return {
      result: 'android device evidence blocked: adb devices failed',
      packageId,
      adb,
      devices,
      selectedDevice: null,
      appInstalled: false,
      adbError: devicesResult.output,
      manualEvidenceStillRequired: ['Fix adb access before collecting Android device evidence.'],
    };
  }

  if (!selectedDevice) {
    return {
      result:
        eligibleDevices.length === 0
          ? 'physical Android device evidence missing'
          : 'android device evidence needs --serial because multiple eligible devices are connected',
      packageId,
      adb,
      devices,
      selectedDevice: null,
      appInstalled: false,
      manualEvidenceStillRequired: [
        'Connect exactly one authorized physical Android phone, or pass --serial <device-serial>.',
        'Use --include-emulators only for emulator rehearsal; emulator evidence does not close physical-device gates.',
      ],
    };
  }

  const deviceIdentity = {
    serial: selectedDevice.serial,
    kind: selectedDevice.kind,
    manufacturer: getProp(adb, selectedDevice.serial, 'ro.product.manufacturer'),
    brand: getProp(adb, selectedDevice.serial, 'ro.product.brand'),
    model: getProp(adb, selectedDevice.serial, 'ro.product.model'),
    device: getProp(adb, selectedDevice.serial, 'ro.product.device'),
    androidVersion: getProp(adb, selectedDevice.serial, 'ro.build.version.release'),
    sdk: getProp(adb, selectedDevice.serial, 'ro.build.version.sdk'),
  };

  const packagePaths = runAdb(adb, ['shell', 'pm', 'path', packageId], selectedDevice.serial);
  const appInstalled = packagePaths.ok && packagePaths.output.includes('package:');
  const packageDump = appInstalled
    ? runAdb(adb, ['shell', 'dumpsys', 'package', packageId], selectedDevice.serial)
    : { ok: false, output: '' };

  const packageInfo = appInstalled
    ? {
        ...parsePackageInfo(packageDump.output, packageId),
        apkPaths: packagePaths.output
          .split(/\r?\n/)
          .map((line) => line.replace(/^package:/, '').trim())
          .filter(Boolean),
      }
    : null;

  return {
    result: appInstalled
      ? 'physical Android device source evidence captured; manual route, OAuth, permission, and TalkBack checks still required'
      : 'physical Android device found; Lekhon app install evidence missing',
    packageId,
    adb,
    devices,
    selectedDevice,
    deviceIdentity,
    appInstalled,
    packageInfo,
    reviewerCommands: buildReviewerCommands({
      adbPath: adb.path,
      serial: selectedDevice.serial,
      packageId,
    }),
    manualEvidenceStillRequired: [
      'Launch from the app icon and confirm the app opens Home.',
      'Capture Help, article, support form, seller/store back, order/help back, and local-save behavior.',
      'Capture Google, Facebook, X/Twitter, and LinkedIn provider handoff and final app state.',
      'Capture camera, microphone, files/photos, and denied-permission recovery behavior.',
      'Capture TalkBack evidence for Help, footer accordions, support forms, OAuth handoff, permission prompts, and Android back behavior.',
    ],
  };
};

const renderPermissions = (permissions = []) =>
  permissions.length > 0
    ? permissions
        .map(
          (entry) =>
            `- ${entry.permission}: declared=${entry.declared ? 'yes' : 'no'}; granted=${entry.granted ? 'yes' : 'no'}`
        )
        .join('\n')
    : '- None recorded';

const renderDeviceList = (devices) =>
  devices.length > 0
    ? devices
        .map(
          (device) =>
            `- ${device.serial}: ${device.state}; ${device.kind}; model=${device.details.model || 'unknown'}`
        )
        .join('\n')
    : '- None detected';

const renderMarkdown = (evidence) => `# Lekhon Android Device Evidence

Result: ${evidence.result}

## ADB

- Path: ${evidence.adb?.path || 'not found'}
- Version: ${evidence.adb?.version || 'not found'}

## Connected Devices

${renderDeviceList(evidence.devices)}

## Selected Device

- Serial: ${evidence.deviceIdentity?.serial || 'none'}
- Kind: ${evidence.deviceIdentity?.kind || 'none'}
- Manufacturer: ${evidence.deviceIdentity?.manufacturer || 'unknown'}
- Brand: ${evidence.deviceIdentity?.brand || 'unknown'}
- Model: ${evidence.deviceIdentity?.model || 'unknown'}
- Android version: ${evidence.deviceIdentity?.androidVersion || 'unknown'}
- SDK: ${evidence.deviceIdentity?.sdk || 'unknown'}

## App Package

- Package: ${evidence.packageId}
- Installed: ${evidence.appInstalled ? 'yes' : 'no'}
- Version name: ${evidence.packageInfo?.versionName || 'unknown'}
- Version code: ${evidence.packageInfo?.versionCode || 'unknown'}
- Target SDK: ${evidence.packageInfo?.targetSdk || 'unknown'}
- First install time: ${evidence.packageInfo?.firstInstallTime || 'unknown'}
- Last update time: ${evidence.packageInfo?.lastUpdateTime || 'unknown'}

## Runtime Permission Snapshot

${renderPermissions(evidence.packageInfo?.requestedPermissions)}

## Reviewer Commands

${(evidence.reviewerCommands || []).map((command) => `- \`${command}\``).join('\n') || '- Connect one authorized device to show commands.'}

## Manual Evidence Still Required

${(evidence.manualEvidenceStillRequired || []).map((item) => `- ${item}`).join('\n')}

## Completion Rule

This command only captures device and package evidence. Do not mark Android physical-device, OAuth, permission, or TalkBack gates complete until the manual route, provider, permission, and accessibility evidence is captured from the same release candidate.
`;

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:android-device-evidence',
      '  npm run help:android-device-evidence -- --json',
      '  npm run help:android-device-evidence -- --serial <device-serial>',
      '',
      'Options:',
      '  --json               Print machine-readable Android device evidence.',
      '  --serial <value>     Use a specific adb device serial.',
      '  --package <value>    Package id to inspect. Defaults to com.lekhon.app.',
      '  --include-emulators  Allow emulator devices for rehearsal only.',
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const evidence = buildEvidence();
  console.log(hasFlag('--json') ? JSON.stringify(evidence, null, 2) : renderMarkdown(evidence));
};

main();
