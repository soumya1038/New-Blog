#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
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

const run = (command, commandArgs, options = {}) => {
  try {
    return {
      ok: true,
      output: execFileSync(command, commandArgs, {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: options.timeout || 10000,
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

const commandWorks = (command, commandArgs = ['--version']) =>
  spawnSync(command, commandArgs, { encoding: 'utf8', stdio: 'pipe' }).status === 0;

const windowsFileVersion = (filePath) => {
  if (process.platform !== 'win32' || !filePath || !fs.existsSync(filePath)) return '';
  const escapedPath = String(filePath).replace(/'/g, "''");
  const result = run('powershell', [
    '-NoProfile',
    '-Command',
    `(Get-Item -LiteralPath '${escapedPath}').VersionInfo.ProductVersion`,
  ]);
  return result.ok ? result.output.split(/\r?\n/).filter(Boolean)[0] || '' : '';
};

const browserCandidates = () => {
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.ProgramFiles || '';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || '';

  if (process.platform === 'win32') {
    return [
      { name: 'Chrome', path: path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe') },
      { name: 'Chrome', path: path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe') },
      { name: 'Chrome', path: path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe') },
      { name: 'Edge', path: path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe') },
      { name: 'Edge', path: path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe') },
      { name: 'Firefox', path: path.join(programFiles, 'Mozilla Firefox', 'firefox.exe') },
      { name: 'Firefox', path: path.join(programFilesX86, 'Mozilla Firefox', 'firefox.exe') },
    ];
  }

  return [
    { name: 'Chrome', path: 'google-chrome' },
    { name: 'Chrome', path: 'chromium' },
    { name: 'Edge', path: 'microsoft-edge' },
    { name: 'Firefox', path: 'firefox' },
  ];
};

const detectBrowsers = () =>
  browserCandidates()
    .filter((candidate, index, candidates) =>
      candidate.path && candidates.findIndex((entry) => entry.path === candidate.path) === index
    )
    .map((candidate) => {
      const exists = candidate.path.includes(path.sep) ? fs.existsSync(candidate.path) : true;
      if (!exists) return null;
      const version = windowsFileVersion(candidate.path);
      if (version) {
        return {
          name: candidate.name,
          path: candidate.path,
          version,
        };
      }
      const result = run(candidate.path, ['--version']);
      if (!result.ok) return null;
      return {
        name: candidate.name,
        path: candidate.path,
        version: result.output.split(/\r?\n/)[0],
      };
    })
    .filter(Boolean);

const detectNvda = () => {
  const programFiles = process.env.ProgramFiles || '';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || '';
  const candidates = [
    path.join(programFiles, 'NVDA', 'nvda.exe'),
    path.join(programFilesX86, 'NVDA', 'nvda.exe'),
  ];

  const installedPaths = candidates.filter((candidate) => candidate && fs.existsSync(candidate));
  const tasklist = process.platform === 'win32' ? run('tasklist', ['/FI', 'IMAGENAME eq nvda.exe']) : null;
  const running = Boolean(tasklist?.ok && /nvda\.exe/i.test(tasklist.output));
  const version = installedPaths.length > 0 ? windowsFileVersion(installedPaths[0]) : '';

  return {
    supportedPlatform: process.platform === 'win32',
    installed: installedPaths.length > 0,
    installedPaths,
    running,
    version,
  };
};

const platformTools = (base) =>
  base ? path.join(base, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb') : '';

const findAdb = () => {
  const candidates = [
    process.env.ADB,
    platformTools(process.env.ANDROID_HOME),
    platformTools(process.env.ANDROID_SDK_ROOT),
    platformTools(process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk')),
    'adb',
  ]
    .filter(Boolean)
    .map((candidate) => path.normalize(candidate));

  for (const candidate of [...new Set(candidates)]) {
    const exists = candidate === 'adb' || fs.existsSync(candidate);
    if (exists && commandWorks(candidate, ['version'])) {
      return {
        path: candidate,
        version: run(candidate, ['version']).output.split(/\r?\n/).filter(Boolean)[0],
      };
    }
  }

  return null;
};

const runAdb = (adb, adbArgs, serial = '') => {
  if (!adb) return { ok: false, output: 'adb not found' };
  const fullArgs = serial ? ['-s', serial, ...adbArgs] : adbArgs;
  return run(adb.path, fullArgs, { timeout: 15000 });
};

const parseDeviceDetails = (tokens) =>
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
      const [serial = '', state = '', ...detailTokens] = line.split(/\s+/);
      const details = parseDeviceDetails(detailTokens);
      const emulator =
        serial.startsWith('emulator-') ||
        String(details.product || '').includes('sdk_') ||
        String(details.model || '').toLowerCase().includes('sdk');
      return {
        serial,
        state,
        kind: emulator ? 'emulator' : 'physical',
        model: details.model || '',
      };
    });

const detectTalkBack = (adb, requestedSerial) => {
  if (!adb) {
    return {
      adb: null,
      devices: [],
      selectedDevice: null,
      talkBackPackages: [],
      enabledServices: '',
      manualStatus: 'adb not found',
    };
  }

  const devicesResult = runAdb(adb, ['devices', '-l']);
  const devices = devicesResult.ok ? parseDevices(devicesResult.output) : [];
  const authorizedPhysical = devices.filter((device) => device.state === 'device' && device.kind === 'physical');
  const selectedDevice = requestedSerial
    ? devices.find((device) => device.serial === requestedSerial)
    : authorizedPhysical.length === 1
      ? authorizedPhysical[0]
      : null;

  if (!selectedDevice) {
    return {
      adb,
      devices,
      selectedDevice: null,
      talkBackPackages: [],
      enabledServices: '',
      manualStatus:
        authorizedPhysical.length === 0
          ? 'physical Android TalkBack evidence missing'
          : 'pass --serial because multiple physical devices are connected',
    };
  }

  const packageOutput = runAdb(adb, ['shell', 'pm', 'list', 'packages'], selectedDevice.serial);
  const enabledServices = runAdb(
    adb,
    ['shell', 'settings', 'get', 'secure', 'enabled_accessibility_services'],
    selectedDevice.serial
  );
  const touchExploration = runAdb(
    adb,
    ['shell', 'settings', 'get', 'secure', 'touch_exploration_enabled'],
    selectedDevice.serial
  );
  const talkBackPackages = (packageOutput.output.match(/package:[^\r\n]*(talkback|marvin)[^\r\n]*/gi) || [])
    .map((entry) => entry.replace(/^package:/, '').trim())
    .filter(Boolean);

  return {
    adb,
    devices,
    selectedDevice,
    talkBackPackages,
    enabledServices: enabledServices.ok ? enabledServices.output : '',
    touchExplorationEnabled: touchExploration.ok ? touchExploration.output : '',
    manualStatus: 'TalkBack environment snapshot captured; manual TalkBack route pass still required',
  };
};

const buildEvidence = () => {
  const requestedSerial = getArgValue('--serial', '');
  const browsers = detectBrowsers();
  const nvda = detectNvda();
  const adb = findAdb();
  const talkBack = detectTalkBack(adb, requestedSerial);

  const manualEvidenceStillRequired = [
    'Keyboard route pass for Help, policies, Safety, support/report/appeal forms, public footer, and contextual Help links.',
    'NVDA desktop pass with browser and NVDA versions recorded.',
    'TalkBack physical-device pass with Android device, TalkBack version or package, app build, and route evidence recorded.',
    'Text zoom, display size, focus restoration, contrast, and reduced-motion evidence.',
  ];

  return {
    result:
      nvda.running && talkBack.selectedDevice
        ? 'accessibility environment snapshot captured; manual assistive-technology pass still required'
        : 'accessibility environment evidence incomplete; manual assistive-technology pass still required',
    system: {
      platform: process.platform,
      osType: os.type(),
      osRelease: os.release(),
      architecture: os.arch(),
    },
    browsers,
    nvda,
    talkBack,
    manualEvidenceStillRequired,
  };
};

const renderList = (items, fallback = '- None detected') =>
  items && items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : fallback;

const renderBrowserList = (browsers) =>
  browsers.length > 0
    ? browsers.map((browser) => `- ${browser.name}: ${browser.version} (${browser.path})`).join('\n')
    : '- No supported desktop browser detected by common executable paths';

const renderDeviceList = (devices) =>
  devices.length > 0
    ? devices.map((device) => `- ${device.serial}: ${device.state}; ${device.kind}; model=${device.model || 'unknown'}`).join('\n')
    : '- None detected';

const renderMarkdown = (evidence) => `# Lekhon Accessibility Environment Evidence

Result: ${evidence.result}

## System

- Platform: ${evidence.system.platform}
- OS: ${evidence.system.osType} ${evidence.system.osRelease}
- Architecture: ${evidence.system.architecture}

## Desktop Browsers

${renderBrowserList(evidence.browsers)}

## NVDA

- Windows platform: ${evidence.nvda.supportedPlatform ? 'yes' : 'no'}
- Installed: ${evidence.nvda.installed ? 'yes' : 'no'}
- Running: ${evidence.nvda.running ? 'yes' : 'no'}
- Version: ${evidence.nvda.version || 'unknown'}
- Installed paths:
${renderList(evidence.nvda.installedPaths)}

## Android TalkBack Environment

- ADB path: ${evidence.talkBack.adb?.path || 'not found'}
- ADB version: ${evidence.talkBack.adb?.version || 'not found'}
- Selected device: ${evidence.talkBack.selectedDevice?.serial || 'none'}
- Status: ${evidence.talkBack.manualStatus}

Connected devices:

${renderDeviceList(evidence.talkBack.devices)}

TalkBack packages:

${renderList(evidence.talkBack.talkBackPackages)}

- Enabled accessibility services: ${evidence.talkBack.enabledServices || 'unknown'}
- Touch exploration enabled: ${evidence.talkBack.touchExplorationEnabled || 'unknown'}

## Manual Evidence Still Required

${evidence.manualEvidenceStillRequired.map((item) => `- ${item}`).join('\n')}

## Completion Rule

This command only records the test environment. Do not mark the manual screen-reader gate complete until keyboard, NVDA, TalkBack, text zoom, contrast, focus restoration, and reduced-motion route evidence is captured from the current release candidate.
`;

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:accessibility-environment',
      '  npm run help:accessibility-environment -- --json',
      '  npm run help:accessibility-environment -- --serial <android-device-serial>',
      '',
      'Options:',
      '  --json            Print machine-readable environment evidence.',
      '  --serial <value>  Use a specific adb serial for TalkBack environment checks.',
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
