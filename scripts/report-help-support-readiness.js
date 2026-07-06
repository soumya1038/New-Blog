#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const frontendSupportPath = path.join(rootDir, 'redirect', 'src', 'pages', 'SupportRequest.jsx');
const adminSupportPath = path.join(rootDir, 'redirect', 'src', 'components', 'AdminSupportRequests.jsx');
const controllerPath = path.join(rootDir, 'backend', 'controllers', 'supportController.js');
const routesPath = path.join(rootDir, 'backend', 'routes', 'supportRoutes.js');
const modelPath = path.join(rootDir, 'backend', 'models', 'SupportRequest.js');
const cleanupScriptPath = path.join(rootDir, 'backend', 'scripts', 'supportCleanupAudit.js');
const rootPackagePath = path.join(rootDir, 'package.json');
const frontendPackagePath = path.join(rootDir, 'redirect', 'package.json');
const backendPackagePath = path.join(rootDir, 'backend', 'package.json');

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const extractStringArray = (source, label) => {
  const match = source.match(new RegExp(`${label}\\s*[:=]\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
};

const extractNewSetArray = (source, label) => {
  const match = source.match(new RegExp(`${label}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)`));
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
};

const sourceHasAll = (source, tokens) => tokens.every((token) => source.includes(token));

const supportSources = () => {
  const frontendSupport = readText(frontendSupportPath);
  const adminSupport = readText(adminSupportPath);
  const controller = readText(controllerPath);
  const routes = readText(routesPath);
  const model = readText(modelPath);
  const cleanupScript = readText(cleanupScriptPath);
  const rootPackage = readText(rootPackagePath);
  const frontendPackage = readText(frontendPackagePath);
  const backendPackage = readText(backendPackagePath);

  return {
    frontendSupport,
    adminSupport,
    controller,
    routes,
    model,
    cleanupScript,
    rootPackage,
    frontendPackage,
    backendPackage,
  };
};

const buildReadiness = () => {
  const sources = supportSources();
  const contactCategories = extractStringArray(sources.frontendSupport, 'contact');
  const reportCategories = extractStringArray(sources.frontendSupport, 'report');
  const appealCategories = extractStringArray(sources.frontendSupport, 'appeal');
  const backendTypes = extractNewSetArray(sources.controller, 'ALLOWED_TYPES');
  const controllerStatuses = extractStringArray(sources.controller, 'SUPPORT_STATUSES');
  const adminStatusOptions = extractStringArray(sources.adminSupport, 'statusOptions');
  const adminPriorityOptions = extractStringArray(sources.adminSupport, 'priorityOptions');

  const publicRoutes = [
    { route: '/contact', mode: 'contact', type: 'support', categories: contactCategories.length },
    { route: '/report', mode: 'report', type: 'report', categories: reportCategories.length },
    { route: '/appeals', mode: 'appeal', type: 'appeal', categories: appealCategories.length },
  ];

  const routeChecks = [
    { label: 'public create endpoint', passed: sources.routes.includes("router.post('/requests'") },
    { label: 'rate limited submission', passed: sourceHasAll(sources.routes, ['rateLimit', 'max: 8', 'windowMs: 60 * 60 * 1000']) },
    { label: 'optional public auth', passed: sources.routes.includes('optionalAuth') },
    { label: 'user request history', passed: sources.routes.includes("router.get('/requests/me'") },
    { label: 'admin/co-admin metrics', passed: sources.routes.includes("router.get('/admin/metrics', adminOrCoAdminAuth") },
    { label: 'admin/co-admin queue', passed: sources.routes.includes("router.get('/admin/requests', adminOrCoAdminAuth") },
    { label: 'admin-only updates', passed: sources.routes.includes("router.patch('/admin/requests/:id', adminAuth") },
  ];

  const lifecycleChecks = [
    { label: 'reference number generated', passed: sources.controller.includes('createUniqueReferenceNumber') },
    { label: 'email validation', passed: sources.controller.includes('EMAIL_PATTERN') },
    { label: 'minimum description length', passed: sources.controller.includes('description.length < 20') },
    { label: 'admin email notification attempted', passed: sources.controller.includes('sendContactEmail') },
    { label: 'request metadata captured', passed: sourceHasAll(sources.controller, ['userAgent', 'platform']) },
    { label: 'assignment supported', passed: sourceHasAll(sources.controller, ['assignToMe', 'assignedTo']) },
    { label: 'status updates supported', passed: sources.controller.includes('request.status = status') },
    { label: 'priority updates supported', passed: sources.controller.includes('request.priority = priority') },
    { label: 'admin notes supported', passed: sources.controller.includes('request.adminNotes') },
    { label: 'resolved timestamp supported', passed: sources.controller.includes('resolvedAt') },
  ];

  const metricChecks = [
    'activeTotal',
    'urgentActive',
    'highOrUrgentActive',
    'staleActive',
    'unassignedActive',
    'createdLast24h',
    'waitingForUser',
    'oldestActive',
    'byStatus',
    'byType',
    'byPriority',
  ].map((metric) => ({ label: metric, passed: sources.controller.includes(metric) }));

  const modelChecks = [
    { label: 'type enum', passed: sourceHasAll(sources.model, ["enum: ['support', 'report', 'appeal']", 'required: true']) },
    { label: 'status enum', passed: sourceHasAll(sources.model, ["enum: ['open', 'reviewing', 'waiting_for_user', 'resolved', 'closed']", "default: 'open'"]) },
    { label: 'priority enum', passed: sourceHasAll(sources.model, ["enum: ['normal', 'high', 'urgent']", "default: 'normal'"]) },
    { label: 'reference number unique index', passed: sourceHasAll(sources.model, ['referenceNumber', 'unique: true', 'index: true']) },
    { label: 'admin notes stored separately', passed: sources.model.includes('adminNotes') },
    { label: 'support queue indexes', passed: sourceHasAll(sources.model, ['supportRequestSchema.index({ status: 1', 'supportRequestSchema.index({ type: 1', 'supportRequestSchema.index({ status: 1, priority: 1']) },
  ];

  const cleanupChecks = [
    { label: 'cleanup script exists', passed: sources.cleanupScript.includes('supportCleanupAudit') },
    { label: 'cleanup dry-run default', passed: sourceHasAll(sources.cleanupScript, ['DRY-RUN', '--execute', '--prefix QA-CLEANUP']) },
    { label: 'cleanup subject prefix filter', passed: sourceHasAll(sources.cleanupScript, ['subject:', 'QA-CLEANUP', 'escapeRegExp(prefix)']) },
    { label: 'cleanup delete confirmation guard', passed: sourceHasAll(sources.cleanupScript, ['--confirm-delete-support-cleanup-records', 'Delete mode requires']) },
    { label: 'cleanup close owner guard', passed: sourceHasAll(sources.cleanupScript, ['Closing records requires --owner', 'adminNotes']) },
    { label: 'cleanup masked email preview', passed: sourceHasAll(sources.cleanupScript, ['maskEmail', 'referenceNumber']) },
    { label: 'root cleanup script exposed', passed: sources.rootPackage.includes('"help:support-cleanup": "node backend/scripts/supportCleanupAudit.js --prefix QA-CLEANUP"') },
    { label: 'frontend cleanup script exposed', passed: sources.frontendPackage.includes('"help:support-cleanup": "node ../backend/scripts/supportCleanupAudit.js --prefix QA-CLEANUP"') },
    { label: 'backend cleanup script exposed', passed: sources.backendPackage.includes('"support:cleanup:dry": "node scripts/supportCleanupAudit.js --prefix QA-CLEANUP"') },
  ];

  const remainingEvidence = [
    'Submit support, report, and appeal records in an approved environment.',
    'Capture support, report, and appeal reference numbers.',
    'Confirm each record appears in the admin queue.',
    'Confirm metrics reflect active, urgent/high, stale, unassigned, waiting-for-user, and recent records.',
    'Assign a record, update status, update priority, and add a non-sensitive admin note.',
    'Complete the approved cleanup method.',
    'Run npm run help:support-cleanup in dry-run mode and capture the matched QA-CLEANUP record list before closing, deleting, or retaining records.',
  ];

  const allChecks = [...routeChecks, ...lifecycleChecks, ...metricChecks, ...modelChecks, ...cleanupChecks];
  const failedChecks = allChecks.filter((check) => !check.passed);

  return {
    result: failedChecks.length === 0 ? 'local support implementation ready; live lifecycle evidence required' : 'local support implementation incomplete',
    publicRoutes,
    categoryCounts: {
      contact: contactCategories.length,
      report: reportCategories.length,
      appeal: appealCategories.length,
    },
    backendTypes,
    statuses: {
      controller: controllerStatuses,
      adminUi: adminStatusOptions,
    },
    priorities: adminPriorityOptions,
    priorityRules: {
      urgent: ['child safety', 'threat', 'illegal'],
      high: ['report type', 'payment category', 'fraud category'],
      normal: ['all other requests'],
    },
    routeChecks,
    lifecycleChecks,
    metricChecks,
    modelChecks,
    cleanupChecks,
    failedChecks,
    remainingEvidence,
  };
};

const renderCheckList = (checks) =>
  checks.map((check) => `- ${check.passed ? 'pass' : 'fail'}: ${check.label}`).join('\n');

const renderMarkdown = (readiness) => `# Lekhon Support Readiness Summary

Result: ${readiness.result}

## Counts

- Public support routes: ${readiness.publicRoutes.length}
- Contact categories: ${readiness.categoryCounts.contact}
- Report categories: ${readiness.categoryCounts.report}
- Appeal categories: ${readiness.categoryCounts.appeal}
- Backend request types: ${readiness.backendTypes.length}
- Status values: ${readiness.statuses.controller.length}
- Priority values: ${readiness.priorities.length}
- Local checks: ${readiness.routeChecks.length + readiness.lifecycleChecks.length + readiness.metricChecks.length + readiness.modelChecks.length}
- Cleanup checks: ${readiness.cleanupChecks.length}
- Failed local checks: ${readiness.failedChecks.length}

## Public Routes

${readiness.publicRoutes
  .map((entry) => `- ${entry.route}: ${entry.type}; ${entry.categories} categories`)
  .join('\n')}

## Backend Request Types

${readiness.backendTypes.map((type) => `- ${type}`).join('\n')}

## Status Values

${readiness.statuses.controller.map((status) => `- ${status}`).join('\n')}

## Priority Values

${readiness.priorities.map((priority) => `- ${priority}`).join('\n')}

## Route And Permission Checks

${renderCheckList(readiness.routeChecks)}

## Lifecycle Checks

${renderCheckList(readiness.lifecycleChecks)}

## Metrics Checks

${renderCheckList(readiness.metricChecks)}

## Model Checks

${renderCheckList(readiness.modelChecks)}

## Cleanup Checks

${renderCheckList(readiness.cleanupChecks)}

## Remaining Live Evidence

${readiness.remainingEvidence.map((item) => `- ${item}`).join('\n')}

## Completion Rule

Do not mark the live support, report, and appeal lifecycle gate complete until support, report, appeal, admin queue, metrics, assignment, status, priority, notes, resolution, dry-run cleanup audit, and cleanup evidence are captured from the current release candidate.
`;

const printUsage = () => {
  console.log(
    [
      'Usage:',
      '  npm run help:support-readiness',
      '  npm run help:support-readiness -- --json',
      '',
      'Options:',
      '  --json   Print machine-readable support readiness data.',
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
