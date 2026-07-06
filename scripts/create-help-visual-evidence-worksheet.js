#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const outputDir = path.join(planningDir, 'visual-evidence');
const helpContentPath = path.join(rootDir, 'redirect', 'src', 'content', 'helpCenterContent.js');

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const getArgValue = (name) => {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(name);
  if (index !== -1) return args[index + 1];
  return '';
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const sanitizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const shellValue = (command) => {
  try {
    return execSync(command, { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    return 'unknown';
  }
};

const loadHelpContent = () => {
  const source = fs
    .readFileSync(helpContentPath, 'utf8')
    .replace(/export const /g, 'const ')
    .concat(`
globalThis.__helpContent = {
  HELP_VISUAL_REQUIREMENTS,
  HELP_VISUAL_STATUSES,
  helpArticles,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: helpContentPath });
  return context.__helpContent;
};

const formatList = (items) =>
  items && items.length > 0
    ? items.map((item) => `  - ${item}`).join('\n')
    : '  - None recorded';

const groupCount = (requirements, predicate) => requirements.filter(predicate).length;

const articleTitleBySlug = (articles) =>
  new Map(articles.map((article) => [article.slug, article.title]));

const renderRequirement = (requirement, titleMap) => `### ${requirement.id}

| Field | Value |
|---|---|
| Article | ${requirement.articleSlug} - ${titleMap.get(requirement.articleSlug) || 'Unknown article'} |
| Priority | ${requirement.priority} |
| Visual type | ${requirement.visualType} |
| Platforms | ${requirement.platforms.join(', ')} |
| Owner | ${requirement.owner} |
| Source status | ${requirement.status} |
| Purpose | ${requirement.purpose} |
| Next step | ${requirement.nextStep} |

Source evidence:

${formatList(requirement.evidence ? [requirement.evidence] : [])}

Current blocker:

${formatList(requirement.blocker ? [requirement.blocker] : [])}

Replacement triggers:

${formatList(requirement.replacementTriggers)}

Capture fields:

| Field | Value |
|---|---|
| Route | TBD |
| Platform captured | TBD |
| Device/browser | TBD |
| Viewport or Android version | TBD |
| Build or commit | TBD |
| Capture date | TBD |
| Seeded account/data | TBD |
| Private-data review owner | TBD |
| Alt text or transcript | TBD |
| Replacement triggers reviewed | TBD |
| Approval | pending |

Evidence files:

- Screenshot/clip/diagram:
- Evidence note:
- Transcript or text equivalent:

Reviewer result: approved / blocked / exception

Notes:

- 
`;

const renderWorksheet = ({ worksheetName, worksheetDate, helpContent }) => {
  const branch = shellValue('git rev-parse --abbrev-ref HEAD');
  const commit = shellValue('git rev-parse --short HEAD');
  const requirements = helpContent.HELP_VISUAL_REQUIREMENTS;
  const titleMap = articleTitleBySlug(helpContent.helpArticles);
  const openP0 = requirements.filter(
    (requirement) => requirement.priority === 'P0' && requirement.status !== 'implemented'
  );

  return `# Help Visual Evidence Worksheet - ${worksheetName}

Status: Draft visual evidence worksheet  
Generated: ${worksheetDate}  
Branch: ${branch}  
Commit: ${commit}

## 1. Purpose

Use this worksheet to capture, review, and approve screenshots, clips, diagrams, transcripts, alt text, privacy review, and replacement checks for Lekhon Help Center visual guidance.

This file is generated from \`HELP_VISUAL_REQUIREMENTS\` in \`redirect/src/content/helpCenterContent.js\`. Do not mark the P0 visual evidence gate complete from this file alone; update source visual requirement statuses and the release evidence record only after current evidence exists and owners approve it.

## 2. Summary

| Metric | Count |
|---|---:|
| Visual requirements | ${requirements.length} |
| P0 requirements | ${groupCount(requirements, (item) => item.priority === 'P0')} |
| P0 open requirements | ${openP0.length} |
| Implemented requirements | ${groupCount(requirements, (item) => item.status === 'implemented')} |
| Pending requirements | ${groupCount(requirements, (item) => item.status === 'pending')} |
| Blocked requirements | ${groupCount(requirements, (item) => item.status === 'blocked')} |

Open P0 requirement ids:

${formatList(openP0.map((requirement) => requirement.id))}

## 3. Required Local Commands

Run and record current output before capture:

- \`npm run help:governance\` from repository root.
- \`npm run help:visual-evidence -- --name <visual-pass-name> --dry-run\` from repository root.
- \`npm run test:help -- --runInBand\` from \`redirect\`.
- \`npm run help:public-routes\` from repository root or \`redirect\`.
- \`npm run help:exceptions\` from repository root.
- \`npm run help:gate-closure -- --json\` from repository root before promoting the visual evidence gate.
- \`npm run help:goal-audit\` from repository root.
- \`npm run build\` from \`redirect\`.

## 4. Privacy Rules

- Use seeded accounts, orders, products, messages, reports, and payouts.
- Do not show emails, phone numbers, addresses, payment identifiers, payout details, tokens, API keys, private messages, legal identity files, or sensitive report descriptions.
- If a ticket, order, product, or username is visible, confirm it belongs to seeded test data and has a cleanup method.

## 5. Accessibility Rules

- Screenshots and diagrams require alt text.
- Clips require a transcript or step list.
- Workflow strips require a text equivalent.
- Labels in visuals must match article and policy terminology.

## 6. Requirement Worksheets

${requirements.map((requirement) => renderRequirement(requirement, titleMap)).join('\n')}
## 7. Final Visual Decision

Visual evidence packet:

| Field | Value |
|---|---|
| Packet command | \`npm run help:visual-evidence -- --name <visual-pass-name>\` |
| Packet path | TBD |
| QA owner | TBD |
| Mobile owner | TBD |

| Decision | Result | Owner | Date | Notes |
|---|---|---|---|---|
| P0 visuals ready for web release | no | QA + feature owners | ${worksheetDate} | Keep no until every unblocked P0 requirement has evidence and approval |
| P0 visuals ready for Android release | no | Mobile + QA | ${worksheetDate} | Physical-device visuals remain required where listed |
| Visual privacy review complete | no | Privacy reviewer | ${worksheetDate} | Keep no until every captured visual passes privacy review |
| Visual accessibility text complete | no | Accessibility reviewer | ${worksheetDate} | Keep no until every captured visual has alt text, transcript, or equivalent |

## 8. Completion Rule

Do not mark \`p0-visual-evidence-capture\` complete until every unblocked P0 visual requirement has current evidence, privacy review, accessibility text, replacement-trigger review, and owner approval.
`;
};

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:visual-worksheet -- --name visual-pass-name',
      '  npm run help:visual-worksheet -- --name visual-pass-name --date 2026-06-26',
      '  npm run help:visual-worksheet -- --name visual-pass-name --dry-run',
      '',
      'Options:',
      '  --name <value>   Visual evidence pass label. Defaults to help-visuals-YYYY-MM-DD.',
      '  --date <value>   ISO date for the generated file. Defaults to today.',
      '  --dry-run        Print target and summary without writing a file.',
      '  --force          Overwrite an existing generated worksheet.'
    ].join('\n')
  );
};

const main = () => {
  if (hasFlag('--help') || hasFlag('-h')) {
    printUsage();
    return;
  }

  const worksheetDate = getArgValue('--date') || todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(worksheetDate)) {
    console.error(`Invalid --date value: ${worksheetDate}`);
    process.exit(1);
  }

  const worksheetName = getArgValue('--name') || `help-visuals-${worksheetDate}`;
  const slug = sanitizeSlug(worksheetName);
  if (!slug) {
    console.error('Visual worksheet name must contain at least one letter or number.');
    process.exit(1);
  }

  const helpContent = loadHelpContent();
  const content = renderWorksheet({ worksheetName, worksheetDate, helpContent });
  const outputPath = path.join(outputDir, `${worksheetDate}-${slug}.md`);
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');
  const requirements = helpContent.HELP_VISUAL_REQUIREMENTS;
  const openP0 = requirements.filter(
    (requirement) => requirement.priority === 'P0' && requirement.status !== 'implemented'
  );

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (fs.existsSync(outputPath) && !force) {
      console.error(`Visual worksheet already exists: ${path.relative(rootDir, outputPath)}`);
      console.error('Use --force to overwrite it.');
      process.exit(1);
    }
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  console.log(dryRun ? 'Help visual worksheet dry run passed.' : 'Help visual worksheet created.');
  console.log(`Target: ${path.relative(rootDir, outputPath).replace(/\\/g, '/')}`);
  console.log(`Visual requirements: ${requirements.length}`);
  console.log(`P0 requirements: ${groupCount(requirements, (item) => item.priority === 'P0')}`);
  console.log(`P0 open requirements: ${openP0.length}`);
  console.log(`Implemented requirements: ${groupCount(requirements, (item) => item.status === 'implemented')}`);
  console.log(`Pending requirements: ${groupCount(requirements, (item) => item.status === 'pending')}`);
  console.log(`Blocked requirements: ${groupCount(requirements, (item) => item.status === 'blocked')}`);
};

main();
