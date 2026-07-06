#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const planningDir = path.join(rootDir, 'docs', 'help-center-planning');
const releaseReadinessPath = path.join(rootDir, 'redirect', 'src', 'content', 'releaseReadiness.js');
const androidWorksheetGeneratorPath = path.join(rootDir, 'scripts', 'create-help-android-verification-worksheet.js');
const androidEvidencePacketGeneratorPath = path.join(rootDir, 'scripts', 'create-help-android-evidence-packet.js');
const externalWorksheetGeneratorPath = path.join(rootDir, 'scripts', 'create-help-external-verification-worksheet.js');
const exceptionDecisionPacketGeneratorPath = path.join(rootDir, 'scripts', 'create-help-release-exception-decision-packet.js');
const coverageApprovalPacketGeneratorPath = path.join(rootDir, 'scripts', 'create-help-coverage-approval-packet.js');
const exceptionReporterPath = path.join(rootDir, 'scripts', 'report-help-exceptions.js');
const gateClosureReadinessReporterPath = path.join(rootDir, 'scripts', 'report-help-gate-closure-readiness.js');
const goalAuditReporterPath = path.join(rootDir, 'scripts', 'report-help-goal-audit.js');
const openGateOwnerHandoffGeneratorPath = path.join(rootDir, 'scripts', 'create-help-open-gate-owner-handoff.js');
const openGateOwnerReporterPath = path.join(rootDir, 'scripts', 'report-help-open-gate-owners.js');
const releaseEvidenceBinderGeneratorPath = path.join(rootDir, 'scripts', 'create-help-release-evidence-binder.js');
const releaseCandidateGeneratorPath = path.join(rootDir, 'scripts', 'create-help-release-candidate.js');
const releasePassChecklistGeneratorPath = path.join(rootDir, 'scripts', 'create-help-release-pass-checklist.js');
const releaseEvidenceStatusReporterPath = path.join(rootDir, 'scripts', 'report-help-release-evidence-status.js');
const accessibilityEnvironmentReporterPath = path.join(rootDir, 'scripts', 'report-help-accessibility-environment.js');
const accessibilityReadinessReporterPath = path.join(rootDir, 'scripts', 'report-help-accessibility-readiness.js');
const accessibilityVerificationPacketGeneratorPath = path.join(rootDir, 'scripts', 'create-help-accessibility-verification-packet.js');
const analyticsApprovalPacketGeneratorPath = path.join(rootDir, 'scripts', 'create-help-analytics-approval-packet.js');
const analyticsReadinessReporterPath = path.join(rootDir, 'scripts', 'report-help-analytics-readiness.js');
const androidDeviceEvidenceReporterPath = path.join(rootDir, 'scripts', 'report-help-android-device-evidence.js');
const androidReadinessReporterPath = path.join(rootDir, 'scripts', 'report-help-android-readiness.js');
const policyApprovalPacketGeneratorPath = path.join(rootDir, 'scripts', 'create-help-policy-approval-packet.js');
const policyReadinessReporterPath = path.join(rootDir, 'scripts', 'report-help-policy-readiness.js');
const readinessReporterPath = path.join(rootDir, 'scripts', 'report-help-readiness.js');
const supportLifecyclePacketGeneratorPath = path.join(rootDir, 'scripts', 'create-help-support-lifecycle-packet.js');
const supportReadinessReporterPath = path.join(rootDir, 'scripts', 'report-help-support-readiness.js');
const supportCleanupScriptPath = path.join(rootDir, 'backend', 'scripts', 'supportCleanupAudit.js');
const visualEvidencePacketGeneratorPath = path.join(rootDir, 'scripts', 'create-help-visual-evidence-packet.js');
const visualReadinessReporterPath = path.join(rootDir, 'scripts', 'report-help-visual-readiness.js');
const visualWorksheetGeneratorPath = path.join(rootDir, 'scripts', 'create-help-visual-evidence-worksheet.js');
const publicRoutesVerifierPath = path.join(rootDir, 'scripts', 'verify-help-public-routes.js');
const rootPackagePath = path.join(rootDir, 'package.json');
const frontendPackagePath = path.join(rootDir, 'redirect', 'package.json');
const backendPackagePath = path.join(rootDir, 'backend', 'package.json');

const errors = [];

const toRelative = (filePath) => path.relative(rootDir, filePath).replace(/\\/g, '/');

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const addError = (message) => {
  errors.push(message);
};

const ensureExists = (filePath, label = toRelative(filePath)) => {
  if (!fs.existsSync(filePath)) {
    addError(`Missing ${label}`);
    return false;
  }
  return true;
};

const ensureContains = (text, token, label) => {
  if (!text.includes(token)) {
    addError(`${label} must contain ${token}`);
  }
};

const ensureAsciiMarkdown = () => {
  const markdownFiles = fs
    .readdirSync(planningDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(planningDir, entry.name));

  markdownFiles.forEach((filePath) => {
    const bytes = fs.readFileSync(filePath);
    const hasNonAscii = bytes.some((byte) => byte > 127);
    if (hasNonAscii) addError(`${toRelative(filePath)} contains non-ASCII text`);
  });

  return markdownFiles;
};

const loadReleaseReadiness = () => {
  const source = readText(releaseReadinessPath)
    .replace(/export const /g, 'const ')
    .concat(`
globalThis.__releaseReadiness = {
  RELEASE_GATE_STATUSES,
  RELEASE_GATE_AREAS,
  RELEASE_EXCEPTION_STATUSES,
  HELP_RELEASE_READINESS_GATES,
  HELP_RELEASE_EXCEPTIONS,
  approvedReleaseReadinessExceptions,
  openReleaseReadinessGates,
  verifiedLocalReleaseReadinessGates,
  openGatesWithoutApprovedExceptions,
  RELEASE_CANDIDATE_CHECKLIST,
};
`);

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: releaseReadinessPath });
  return context.__releaseReadiness;
};

const verifyReadmeLinks = (markdownFiles) => {
  const readmePath = path.join(planningDir, 'README.md');
  const readme = readText(readmePath);
  const linkedFiles = [...readme.matchAll(/\]\(\.\/([^)]+)\)/g)].map((match) => match[1]);
  const numberedDocs = markdownFiles
    .map((filePath) => path.basename(filePath))
    .filter((name) => /^\d{2}-.*\.md$/.test(name));

  linkedFiles.forEach((linkedFile) => {
    ensureExists(path.join(planningDir, linkedFile), `README link ${linkedFile}`);
  });

  numberedDocs.forEach((docName) => {
    if (!linkedFiles.includes(docName)) {
      addError(`README planning pack must link ${docName}`);
    }
  });

  return {
    readme,
    linkedFiles,
    numberedDocs,
  };
};

const verifyReleaseGates = ({
  HELP_RELEASE_READINESS_GATES,
  RELEASE_EXCEPTION_STATUSES,
  HELP_RELEASE_EXCEPTIONS,
  approvedReleaseReadinessExceptions,
  RELEASE_CANDIDATE_CHECKLIST,
  openReleaseReadinessGates,
  openGatesWithoutApprovedExceptions,
  verifiedLocalReleaseReadinessGates,
}) => {
  const gateIds = HELP_RELEASE_READINESS_GATES.map((gate) => gate.id);
  const duplicateGateIds = gateIds.filter((id, index) => gateIds.indexOf(id) !== index);
  const exceptionIds = HELP_RELEASE_EXCEPTIONS.map((exception) => exception.id);
  const duplicateExceptionIds = exceptionIds.filter((id, index) => exceptionIds.indexOf(id) !== index);

  if (duplicateGateIds.length > 0) {
    addError(`Duplicate release gate ids: ${[...new Set(duplicateGateIds)].join(', ')}`);
  }

  if (RELEASE_CANDIDATE_CHECKLIST.length !== HELP_RELEASE_READINESS_GATES.length) {
    addError('RELEASE_CANDIDATE_CHECKLIST must include one item per release gate');
  }

  if (duplicateExceptionIds.length > 0) {
    addError(`Duplicate release exception ids: ${[...new Set(duplicateExceptionIds)].join(', ')}`);
  }

  if (verifiedLocalReleaseReadinessGates.length === 0) {
    addError('At least one verified local release gate should be present');
  }

  if (openReleaseReadinessGates.length === 0) {
    addError('Completion audit must not claim complete while external gates still require evidence');
  }

  HELP_RELEASE_READINESS_GATES.forEach((gate) => {
    if (!gate.id || !gate.area || !gate.owner || !gate.status || !gate.protocol) {
      addError(`Release gate ${gate.id || '(missing id)'} is missing required metadata`);
    }

    if (!Array.isArray(gate.evidence) || gate.evidence.length === 0) {
      addError(`Release gate ${gate.id} must include required evidence`);
    }

    if (!ensureExists(path.join(planningDir, gate.protocol), `release gate protocol ${gate.protocol}`)) {
      return;
    }

    if (gate.status === 'verified-local' && (gate.blockers || []).length > 0) {
      addError(`Verified local gate ${gate.id} must not have blockers`);
    }

    if (gate.status !== 'verified-local' && (!Array.isArray(gate.blockers) || gate.blockers.length === 0)) {
      addError(`Open gate ${gate.id} must list blockers`);
    }
  });

  HELP_RELEASE_EXCEPTIONS.forEach((exception) => {
    if (!exception.id || !exception.gateId || !exception.owner || !exception.status) {
      addError(`Release exception ${exception.id || '(missing id)'} is missing required metadata`);
    }

    if (!gateIds.includes(exception.gateId)) {
      addError(`Release exception ${exception.id || '(missing id)'} points to an unknown gate`);
    }

    if (!RELEASE_EXCEPTION_STATUSES.includes(exception.status)) {
      addError(`Release exception ${exception.id || '(missing id)'} has an unknown status`);
    }

    ['scope', 'risk', 'nextReviewDate'].forEach((field) => {
      if (!String(exception[field] || '').trim()) {
        addError(`Release exception ${exception.id || '(missing id)'} must include ${field}`);
      }
    });

    if (!Array.isArray(exception.evidence) || exception.evidence.length === 0) {
      addError(`Release exception ${exception.id || '(missing id)'} must include evidence`);
    }

    if (exception.status === 'approved') {
      ['approvedBy', 'approvedDate', 'expiresOn', 'decisionRecord'].forEach((field) => {
        if (!String(exception[field] || '').trim()) {
          addError(`Approved release exception ${exception.id || '(missing id)'} must include ${field}`);
        }
      });
    }
  });

  if (approvedReleaseReadinessExceptions.length > HELP_RELEASE_EXCEPTIONS.length) {
    addError('Approved release exception count cannot exceed total exception count');
  }

  openGatesWithoutApprovedExceptions.forEach((gate) => {
    if (!openReleaseReadinessGates.some((openGate) => openGate.id === gate.id)) {
      addError(`Unresolved gate ${gate.id} is not in openReleaseReadinessGates`);
    }
  });
};

const verifyReleaseDocuments = ({ HELP_RELEASE_READINESS_GATES }) => {
  const executionChecklistPath = path.join(planningDir, '24-release-candidate-execution-checklist.md');
  const completionAuditPath = path.join(planningDir, '25-goal-completion-audit.md');
  const releaseEvidencePath = path.join(planningDir, '09-release-evidence-record.md');
  const accessibilityProtocolPath = path.join(planningDir, '14-accessibility-verification-protocol.md');
  const supportProtocolPath = path.join(planningDir, '15-support-lifecycle-cleanup-protocol.md');
  const visualInventoryPath = path.join(planningDir, '11-visual-guidance-inventory.md');
  const visualProtocolPath = path.join(planningDir, '21-visual-evidence-capture-protocol.md');
  const androidProtocolPath = path.join(planningDir, '16-android-oauth-permissions-verification-protocol.md');
  const searchFeedbackProtocolPath = path.join(planningDir, '19-search-feedback-operations-protocol.md');
  const policyPublicationProtocolPath = path.join(planningDir, '22-policy-publication-safety-protocol.md');
  const readinessProtocolPath = path.join(planningDir, '23-release-readiness-gate-protocol.md');
  const exceptionRegisterPath = path.join(planningDir, '26-release-exception-register.md');
  const implementationStatusPath = path.join(planningDir, '07-implementation-status.md');

  const executionChecklist = readText(executionChecklistPath);
  const completionAudit = readText(completionAuditPath);
  const releaseEvidence = readText(releaseEvidencePath);
  const accessibilityProtocol = readText(accessibilityProtocolPath);
  const supportProtocol = readText(supportProtocolPath);
  const visualInventory = readText(visualInventoryPath);
  const visualProtocol = readText(visualProtocolPath);
  const androidProtocol = readText(androidProtocolPath);
  const searchFeedbackProtocol = readText(searchFeedbackProtocolPath);
  const policyPublicationProtocol = readText(policyPublicationProtocolPath);
  const readinessProtocol = readText(readinessProtocolPath);
  const exceptionRegister = readText(exceptionRegisterPath);
  const implementationStatus = readText(implementationStatusPath);

  ensureContains(executionChecklist, 'RELEASE_CANDIDATE_CHECKLIST', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'Approved to claim Help Center goal complete', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'release-exception-audit', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:accessibility-environment', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:accessibility-verification', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:android-evidence', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:coverage-approval', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:exception-decision', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:exceptions', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:gate-closure', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:open-gate-handoff', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:open-gate-owners', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:release-pass-checklist', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:release-evidence-binder', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:release-evidence-status', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:support-cleanup', toRelative(executionChecklistPath));
  ensureContains(executionChecklist, 'help:support-lifecycle', toRelative(executionChecklistPath));
  ensureContains(completionAudit, 'Current result: not complete', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:accessibility-environment', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:accessibility-verification', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:coverage-approval', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'openReleaseReadinessGates', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:exception-decision', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:exceptions', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:gate-closure', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:goal-audit', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:open-gate-handoff', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:open-gate-owners', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:analytics-approval', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:android-device-evidence', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:android-evidence', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:policy-approval', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:release-pass-checklist', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:release-evidence-binder', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:release-evidence-status', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:support-cleanup', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:support-lifecycle', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:visual-evidence', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:visual-readiness', toRelative(completionAuditPath));
  ensureContains(completionAudit, 'help:visual-worksheet', toRelative(completionAuditPath));
  ensureContains(releaseEvidence, '24-release-candidate-execution-checklist.md', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:public-routes', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:release-pass-checklist', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:release-evidence-binder', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:release-evidence-status', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:release-candidate', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:external-worksheet', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:accessibility-environment', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:accessibility-readiness', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:accessibility-verification', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:analytics-approval', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:analytics-readiness', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:android-device-evidence', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:android-evidence', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:android-readiness', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:coverage-approval', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:exception-decision', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:exceptions', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:gate-closure', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:goal-audit', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:open-gate-handoff', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:open-gate-owners', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:policy-approval', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:policy-readiness', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:readiness', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:support-cleanup', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:support-lifecycle', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:support-readiness', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:visual-evidence', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'help:visual-readiness', toRelative(releaseEvidencePath));
  ensureContains(releaseEvidence, 'RELEASE_CANDIDATE_CHECKLIST', toRelative(releaseEvidencePath));
  ensureContains(accessibilityProtocol, 'help:external-worksheet', toRelative(accessibilityProtocolPath));
  ensureContains(accessibilityProtocol, 'help:accessibility-environment', toRelative(accessibilityProtocolPath));
  ensureContains(accessibilityProtocol, 'help:accessibility-readiness', toRelative(accessibilityProtocolPath));
  ensureContains(accessibilityProtocol, 'help:accessibility-verification', toRelative(accessibilityProtocolPath));
  ensureContains(supportProtocol, 'help:external-worksheet', toRelative(supportProtocolPath));
  ensureContains(supportProtocol, 'help:support-cleanup', toRelative(supportProtocolPath));
  ensureContains(supportProtocol, 'help:support-lifecycle', toRelative(supportProtocolPath));
  ensureContains(supportProtocol, 'help:support-readiness', toRelative(supportProtocolPath));
  ensureContains(visualInventory, 'help:visual-readiness', toRelative(visualInventoryPath));
  ensureContains(visualInventory, 'help:visual-worksheet', toRelative(visualInventoryPath));
  ensureContains(visualProtocol, 'help:visual-evidence', toRelative(visualProtocolPath));
  ensureContains(visualProtocol, 'help:visual-readiness', toRelative(visualProtocolPath));
  ensureContains(visualProtocol, 'help:visual-worksheet', toRelative(visualProtocolPath));
  ensureContains(androidProtocol, 'help:android-readiness', toRelative(androidProtocolPath));
  ensureContains(androidProtocol, 'help:android-device-evidence', toRelative(androidProtocolPath));
  ensureContains(androidProtocol, 'help:android-evidence', toRelative(androidProtocolPath));
  ensureContains(androidProtocol, 'help:android-worksheet', toRelative(androidProtocolPath));
  ensureContains(searchFeedbackProtocol, 'help:external-worksheet', toRelative(searchFeedbackProtocolPath));
  ensureContains(searchFeedbackProtocol, 'help:analytics-approval', toRelative(searchFeedbackProtocolPath));
  ensureContains(searchFeedbackProtocol, 'help:analytics-readiness', toRelative(searchFeedbackProtocolPath));
  ensureContains(policyPublicationProtocol, 'help:external-worksheet', toRelative(policyPublicationProtocolPath));
  ensureContains(policyPublicationProtocol, 'help:policy-approval', toRelative(policyPublicationProtocolPath));
  ensureContains(policyPublicationProtocol, 'help:policy-readiness', toRelative(policyPublicationProtocolPath));
  ensureContains(readinessProtocol, '24-release-candidate-execution-checklist.md', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:public-routes', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:release-pass-checklist', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:release-evidence-binder', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:release-evidence-status', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:release-candidate', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:external-worksheet', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:accessibility-environment', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:accessibility-readiness', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:accessibility-verification', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:analytics-approval', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:analytics-readiness', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:android-device-evidence', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:android-evidence', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:coverage-approval', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:exception-decision', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:gate-closure', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:policy-approval', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:policy-readiness', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:readiness', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:support-cleanup', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:support-lifecycle', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:support-readiness', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:visual-evidence', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:visual-readiness', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:android-readiness', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:exceptions', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:goal-audit', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:open-gate-handoff', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'help:open-gate-owners', toRelative(readinessProtocolPath));
  ensureContains(readinessProtocol, 'HELP_RELEASE_EXCEPTIONS', toRelative(readinessProtocolPath));
  ensureContains(exceptionRegister, 'Current approved exceptions: none', toRelative(exceptionRegisterPath));
  ensureContains(exceptionRegister, 'HELP_RELEASE_EXCEPTIONS', toRelative(exceptionRegisterPath));
  ensureContains(exceptionRegister, 'help:exception-decision', toRelative(exceptionRegisterPath));
  ensureContains(exceptionRegister, 'help:exceptions', toRelative(exceptionRegisterPath));
  ensureContains(exceptionRegister, 'Do not use expired, draft, or rejected exceptions', toRelative(exceptionRegisterPath));
  ensureContains(implementationStatus, '25-goal-completion-audit.md', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:accessibility-environment', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:android-worksheet', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:accessibility-readiness', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:accessibility-verification', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:analytics-approval', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:analytics-readiness', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:android-device-evidence', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:android-evidence', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:coverage-approval', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:external-worksheet', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:exception-decision', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:exceptions', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:gate-closure', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:goal-audit', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:open-gate-handoff', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:open-gate-owners', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:policy-approval', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:policy-readiness', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:public-routes', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:readiness', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:release-pass-checklist', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:release-evidence-binder', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:release-evidence-status', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:support-cleanup', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:support-lifecycle', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:support-readiness', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:visual-evidence', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:visual-readiness', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:visual-worksheet', toRelative(implementationStatusPath));
  ensureContains(implementationStatus, 'help:android-readiness', toRelative(implementationStatusPath));

  HELP_RELEASE_READINESS_GATES.forEach((gate) => {
    ensureContains(executionChecklist, `### ${gate.id}`, toRelative(executionChecklistPath));
    ensureContains(executionChecklist, `- Protocol: \`${gate.protocol}\``, toRelative(executionChecklistPath));
    ensureContains(completionAudit, `\`${gate.id}\``, toRelative(completionAuditPath));
  });
};

const verifyReleaseCandidateGenerator = () => {
  ensureExists(releaseCandidateGeneratorPath, 'release candidate generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const generator = readText(releaseCandidateGeneratorPath);

  if (rootPackage.scripts['help:release-candidate'] !== 'node scripts/create-help-release-candidate.js') {
    addError('Root package.json must expose help:release-candidate');
  }

  if (
    frontendPackage.scripts['help:release-candidate'] !==
    'node ../scripts/create-help-release-candidate.js'
  ) {
    addError('Frontend package.json must expose help:release-candidate');
  }

  [
    'release-candidates',
    '--dry-run',
    '--force',
    'HELP_RELEASE_READINESS_GATES',
    'HELP_RELEASE_EXCEPTIONS',
    'approvedReleaseReadinessExceptions',
    'openReleaseReadinessGates',
    'openGatesWithoutApprovedExceptions',
    'help:accessibility-environment',
    'help:accessibility-readiness',
    'help:accessibility-verification',
    'help:analytics-approval',
    'help:analytics-readiness',
    'help:android-device-evidence',
    'help:android-evidence',
    'help:coverage-approval',
    'help:exception-decision',
    'help:exceptions',
    'help:gate-closure',
    'help:goal-audit',
    'help:open-gate-handoff',
    'help:open-gate-owners',
    'help:readiness',
    'help:release-pass-checklist',
    'help:release-evidence-binder',
    'help:release-evidence-status',
    'help:policy-approval',
    'help:policy-readiness',
    'help:public-routes',
    'help:android-readiness',
    'help:android-worksheet',
    'help:external-worksheet',
    'help:support-cleanup',
    'help:support-lifecycle',
    'help:support-readiness',
    'help:visual-evidence',
    'help:visual-readiness',
    'help:visual-worksheet',
    'Approved to claim Help Center goal complete',
    'Do not mark the Help Center goal complete',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(releaseCandidateGeneratorPath));
  });
};

const verifyReleaseEvidenceBinderGenerator = () => {
  ensureExists(releaseEvidenceBinderGeneratorPath, 'release evidence binder generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const generator = readText(releaseEvidenceBinderGeneratorPath);

  if (
    rootPackage.scripts['help:release-evidence-binder'] !==
    'node scripts/create-help-release-evidence-binder.js'
  ) {
    addError('Root package.json must expose help:release-evidence-binder');
  }

  if (
    frontendPackage.scripts['help:release-evidence-binder'] !==
    'node ../scripts/create-help-release-evidence-binder.js'
  ) {
    addError('Frontend package.json must expose help:release-evidence-binder');
  }

  [
    'Help Release Evidence Binder',
    'release-evidence-binders',
    '--dry-run',
    'Evidence Packet Index',
    'Gate Coverage Matrix',
    'Required Final Commands',
    'Final Open-Gate Decisions',
    'help:exception-decision',
    'help:open-gate-handoff',
    'help:open-gate-owners',
    'help:coverage-approval',
    'help:gate-closure',
    'help:release-evidence-binder',
    'help:release-candidate',
    'help:android-evidence',
    'help:accessibility-verification',
    'help:support-lifecycle',
    'help:policy-approval',
    'help:visual-evidence',
    'help:analytics-approval',
    'Do not mark the Help Center goal complete from this binder alone',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(releaseEvidenceBinderGeneratorPath));
  });
};

const verifyReleasePassChecklistGenerator = () => {
  ensureExists(releasePassChecklistGeneratorPath, 'release pass checklist generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const generator = readText(releasePassChecklistGeneratorPath);

  if (
    rootPackage.scripts['help:release-pass-checklist'] !==
    'node scripts/create-help-release-pass-checklist.js'
  ) {
    addError('Root package.json must expose help:release-pass-checklist');
  }

  if (
    frontendPackage.scripts['help:release-pass-checklist'] !==
    'node ../scripts/create-help-release-pass-checklist.js'
  ) {
    addError('Frontend package.json must expose help:release-pass-checklist');
  }

  [
    'Help Release Pass Checklist',
    'release-pass-checklists',
    '--dry-run',
    'Phase 1 - Source And Build Checks',
    'Phase 2 - Dry Run Evidence Commands',
    'Phase 3 - Generate Evidence Artifacts',
    'Status Validation Loop',
    'help:coverage-approval',
    'help:gate-closure',
    'help:exception-decision',
    'help:open-gate-handoff',
    'help:open-gate-owners',
    'help:release-evidence-status',
    'help:release-evidence-binder',
    'help:android-evidence',
    'help:accessibility-verification',
    'help:support-lifecycle',
    'help:policy-approval',
    'help:visual-evidence',
    'help:analytics-approval',
    'Do not mark the Help Center goal complete from this checklist',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(releasePassChecklistGeneratorPath));
  });
};

const verifyReleaseEvidenceStatusReporter = () => {
  ensureExists(releaseEvidenceStatusReporterPath, 'release evidence status reporter');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const reporter = readText(releaseEvidenceStatusReporterPath);

  if (
    rootPackage.scripts['help:release-evidence-status'] !==
    'node scripts/report-help-release-evidence-status.js'
  ) {
    addError('Root package.json must expose help:release-evidence-status');
  }

  if (
    frontendPackage.scripts['help:release-evidence-status'] !==
    'node ../scripts/report-help-release-evidence-status.js'
  ) {
    addError('Frontend package.json must expose help:release-evidence-status');
  }

  [
    'Lekhon Release Evidence Status',
    '--json',
    'release evidence artifacts missing',
    'release evidence complete candidate',
    'release-pass-checklists',
    'release-evidence-binders',
    'coverage-approvals',
    'open-gate-owner-handoffs',
    'release-exception-decisions',
    'android-evidence',
    'accessibility-verification',
    'support-lifecycle',
    'policy-approvals',
    'visual-evidence-packets',
    'analytics-approvals',
    'openGatesWithoutApprovedExceptions',
    'Do not mark the Help Center goal complete until this command reports no missing evidence artifacts',
    'help:coverage-approval',
    'help:exception-decision',
    'help:open-gate-handoff',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(releaseEvidenceStatusReporterPath));
  });
};

const verifyAccessibilityReadinessReporter = () => {
  ensureExists(accessibilityReadinessReporterPath, 'accessibility readiness reporter');
  ensureExists(accessibilityEnvironmentReporterPath, 'accessibility environment reporter');
  ensureExists(accessibilityVerificationPacketGeneratorPath, 'accessibility verification packet generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const reporter = readText(accessibilityReadinessReporterPath);
  const environmentReporter = readText(accessibilityEnvironmentReporterPath);
  const generator = readText(accessibilityVerificationPacketGeneratorPath);

  if (
    rootPackage.scripts['help:accessibility-environment'] !==
    'node scripts/report-help-accessibility-environment.js'
  ) {
    addError('Root package.json must expose help:accessibility-environment');
  }

  if (
    rootPackage.scripts['help:accessibility-readiness'] !==
    'node scripts/report-help-accessibility-readiness.js'
  ) {
    addError('Root package.json must expose help:accessibility-readiness');
  }

  if (
    rootPackage.scripts['help:accessibility-verification'] !==
    'node scripts/create-help-accessibility-verification-packet.js'
  ) {
    addError('Root package.json must expose help:accessibility-verification');
  }

  if (
    frontendPackage.scripts['help:accessibility-environment'] !==
    'node ../scripts/report-help-accessibility-environment.js'
  ) {
    addError('Frontend package.json must expose help:accessibility-environment');
  }

  if (
    frontendPackage.scripts['help:accessibility-readiness'] !==
    'node ../scripts/report-help-accessibility-readiness.js'
  ) {
    addError('Frontend package.json must expose help:accessibility-readiness');
  }

  if (
    frontendPackage.scripts['help:accessibility-verification'] !==
    'node ../scripts/create-help-accessibility-verification-packet.js'
  ) {
    addError('Frontend package.json must expose help:accessibility-verification');
  }

  [
    'Accessibility Verification Packet',
    'accessibility-verification',
    '--dry-run',
    'help:gate-closure',
    'Route And Workflow Manual Matrix',
    'buildReadiness',
    'Remaining manual evidence items',
    'Do not mark the manual-screen-reader-verification gate complete',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(accessibilityVerificationPacketGeneratorPath));
  });

  [
    'Lekhon Accessibility Readiness Summary',
    '--json',
    'source accessibility affordances ready; manual assistive-technology evidence required',
    'Remaining Manual Evidence',
    'report-help-accessibility-environment.js',
    'help:accessibility-environment',
    'HelpCenter.css',
    'PublicFooter.js',
    'Do not mark the manual screen-reader verification gate complete',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(accessibilityReadinessReporterPath));
  });

  [
    'Lekhon Accessibility Environment Evidence',
    'NVDA',
    'TalkBack',
    '--serial',
    'manual assistive-technology pass still required',
  ].forEach((token) => {
    ensureContains(environmentReporter, token, toRelative(accessibilityEnvironmentReporterPath));
  });
};

const verifyAnalyticsReadinessReporter = () => {
  ensureExists(analyticsApprovalPacketGeneratorPath, 'analytics approval packet generator');
  ensureExists(analyticsReadinessReporterPath, 'analytics readiness reporter');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const generator = readText(analyticsApprovalPacketGeneratorPath);
  const reporter = readText(analyticsReadinessReporterPath);

  if (
    rootPackage.scripts['help:analytics-approval'] !==
    'node scripts/create-help-analytics-approval-packet.js'
  ) {
    addError('Root package.json must expose help:analytics-approval');
  }

  if (
    rootPackage.scripts['help:analytics-readiness'] !==
    'node scripts/report-help-analytics-readiness.js'
  ) {
    addError('Root package.json must expose help:analytics-readiness');
  }

  if (
    frontendPackage.scripts['help:analytics-approval'] !==
    'node ../scripts/create-help-analytics-approval-packet.js'
  ) {
    addError('Frontend package.json must expose help:analytics-approval');
  }

  if (
    frontendPackage.scripts['help:analytics-readiness'] !==
    'node ../scripts/report-help-analytics-readiness.js'
  ) {
    addError('Frontend package.json must expose help:analytics-readiness');
  }

  [
    'Help Analytics Approval Packet',
    'analytics-approvals',
    '--dry-run',
    'help:gate-closure',
    'Production Decision Matrix',
    'buildReadiness',
    'Production decision blockers',
    'Do not mark the analytics-consent-operations gate complete',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(analyticsApprovalPacketGeneratorPath));
  });

  [
    'Lekhon Analytics Readiness Summary',
    '--json',
    'local analytics safeguards ready; production analytics approval required',
    'Production Decision Blockers',
    'HELP_SEARCH_REVIEW_SIGNALS',
    'lekhon-help-feedback:',
    'D-031',
    'Do not mark the analytics-consent-operations gate complete',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(analyticsReadinessReporterPath));
  });
};

const verifyAndroidReadinessReporter = () => {
  ensureExists(androidReadinessReporterPath, 'Android readiness reporter');
  ensureExists(androidDeviceEvidenceReporterPath, 'Android device evidence reporter');
  ensureExists(androidEvidencePacketGeneratorPath, 'Android evidence packet generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const reporter = readText(androidReadinessReporterPath);
  const deviceReporter = readText(androidDeviceEvidenceReporterPath);
  const evidenceGenerator = readText(androidEvidencePacketGeneratorPath);

  if (rootPackage.scripts['help:android-readiness'] !== 'node scripts/report-help-android-readiness.js') {
    addError('Root package.json must expose help:android-readiness');
  }

  if (
    rootPackage.scripts['help:android-device-evidence'] !==
    'node scripts/report-help-android-device-evidence.js'
  ) {
    addError('Root package.json must expose help:android-device-evidence');
  }

  if (
    rootPackage.scripts['help:android-evidence'] !==
    'node scripts/create-help-android-evidence-packet.js'
  ) {
    addError('Root package.json must expose help:android-evidence');
  }

  if (
    frontendPackage.scripts['help:android-readiness'] !==
    'node ../scripts/report-help-android-readiness.js'
  ) {
    addError('Frontend package.json must expose help:android-readiness');
  }

  if (
    frontendPackage.scripts['help:android-device-evidence'] !==
    'node ../scripts/report-help-android-device-evidence.js'
  ) {
    addError('Frontend package.json must expose help:android-device-evidence');
  }

  if (
    frontendPackage.scripts['help:android-evidence'] !==
    'node ../scripts/create-help-android-evidence-packet.js'
  ) {
    addError('Frontend package.json must expose help:android-evidence');
  }

  [
    'Lekhon Android Readiness Summary',
    '--json',
    'android source readiness ready; physical-device evidence required',
    'AndroidManifest.xml',
    'report-help-android-device-evidence.js',
    'help:android-device-evidence',
    "CapacitorApp.addListener('backButton'",
    'android-permissions-camera-microphone',
    'Do not mark the physical Android, Android OAuth, or Android permissions gates complete',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(androidReadinessReporterPath));
  });

  [
    'Lekhon Android Device Evidence',
    'adb',
    'com.lekhon.app',
    '--include-emulators',
    'manual route, provider, permission, and accessibility evidence',
  ].forEach((token) => {
    ensureContains(deviceReporter, token, toRelative(androidDeviceEvidenceReporterPath));
  });

  [
    'Android Evidence Packet',
    'android-evidence',
    '--dry-run',
    'help:gate-closure',
    'OAuth Provider Matrix',
    'Permission Matrix',
    'buildReadiness',
    'Do not mark the physical Android, Android OAuth, or Android permissions gates complete',
  ].forEach((token) => {
    ensureContains(evidenceGenerator, token, toRelative(androidEvidencePacketGeneratorPath));
  });
};

const verifyReadinessReporter = () => {
  ensureExists(readinessReporterPath, 'Help readiness reporter');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const reporter = readText(readinessReporterPath);

  if (rootPackage.scripts['help:readiness'] !== 'node scripts/report-help-readiness.js') {
    addError('Root package.json must expose help:readiness');
  }

  if (frontendPackage.scripts['help:readiness'] !== 'node ../scripts/report-help-readiness.js') {
    addError('Frontend package.json must expose help:readiness');
  }

  [
    'Lekhon Help Readiness Summary',
    '--json',
    'openReleaseReadinessGates',
    'verifiedLocalReleaseReadinessGates',
    'HELP_RELEASE_EXCEPTIONS',
    'openGatesWithoutApprovedExceptions',
    'Counts By Exception Status',
    'Open gates without approved exceptions',
    'help:exception-decision',
    'help:exceptions',
    'help:gate-closure',
    'help:goal-audit',
    'help:open-gate-handoff',
    'help:open-gate-owners',
    'Preparation Commands For Open Gates',
    'Worksheet Commands For Open Gates',
    'preparationCommandsForOpenGates',
    'Completion Rule',
    'help:accessibility-environment',
    'help:accessibility-verification',
    'help:analytics-approval',
    'help:android-device-evidence',
    'help:android-evidence',
    'help:coverage-approval',
    'help:policy-approval',
    'help:release-pass-checklist',
    'help:release-evidence-binder',
    'help:release-evidence-status',
    'help:support-cleanup',
    'help:support-lifecycle',
    'not complete',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(readinessReporterPath));
  });
};

const verifyOpenGateOwnerHandoffGenerator = () => {
  ensureExists(openGateOwnerHandoffGeneratorPath, 'open gate owner handoff generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const generator = readText(openGateOwnerHandoffGeneratorPath);

  if (
    rootPackage.scripts['help:open-gate-handoff'] !==
    'node scripts/create-help-open-gate-owner-handoff.js'
  ) {
    addError('Root package.json must expose help:open-gate-handoff');
  }

  if (
    frontendPackage.scripts['help:open-gate-handoff'] !==
    'node ../scripts/create-help-open-gate-owner-handoff.js'
  ) {
    addError('Frontend package.json must expose help:open-gate-handoff');
  }

  [
    'Help Open Gate Owner Handoff',
    'open-gate-owner-handoffs',
    '--dry-run',
    'Owner Handoff Matrix',
    'Owner Evidence Collection Worksheets',
    'Release Evidence Record Updates',
    'Completion Boundary',
    'openGatesWithoutApprovedExceptions',
    'Do not mark the Help Center goal complete from this owner handoff packet',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(openGateOwnerHandoffGeneratorPath));
  });
};

const verifyOpenGateOwnerReporter = () => {
  ensureExists(openGateOwnerReporterPath, 'open gate owner reporter');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const reporter = readText(openGateOwnerReporterPath);

  if (
    rootPackage.scripts['help:open-gate-owners'] !==
    'node scripts/report-help-open-gate-owners.js'
  ) {
    addError('Root package.json must expose help:open-gate-owners');
  }

  if (
    frontendPackage.scripts['help:open-gate-owners'] !==
    'node ../scripts/report-help-open-gate-owners.js'
  ) {
    addError('Frontend package.json must expose help:open-gate-owners');
  }

  [
    'Lekhon Open Gate Owner Summary',
    '--json',
    'Owner Action Matrix',
    'Open Gates Without Approved Exceptions',
    'open release gates require owner evidence',
    'openGatesWithoutApprovedExceptions',
    'Do not mark the Help Center goal complete from this owner summary',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(openGateOwnerReporterPath));
  });
};

const verifyExceptionDecisionPacketGenerator = () => {
  ensureExists(exceptionDecisionPacketGeneratorPath, 'release exception decision packet generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const generator = readText(exceptionDecisionPacketGeneratorPath);

  if (
    rootPackage.scripts['help:exception-decision'] !==
    'node scripts/create-help-release-exception-decision-packet.js'
  ) {
    addError('Root package.json must expose help:exception-decision');
  }

  if (
    frontendPackage.scripts['help:exception-decision'] !==
    'node ../scripts/create-help-release-exception-decision-packet.js'
  ) {
    addError('Frontend package.json must expose help:exception-decision');
  }

  [
    'Help Release Exception Decision Packet',
    'release-exception-decisions',
    '--dry-run',
    'Exception Decision Matrix',
    'Gate Exception Worksheets',
    'Required Approved Exception Fields',
    'Validation And Release Evidence Updates',
    'Completion Boundary',
    'HELP_RELEASE_EXCEPTIONS',
    'Do not mark the Help Center goal complete from this exception decision packet',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(exceptionDecisionPacketGeneratorPath));
  });
};

const verifyCoverageApprovalPacketGenerator = () => {
  ensureExists(coverageApprovalPacketGeneratorPath, 'coverage approval packet generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const generator = readText(coverageApprovalPacketGeneratorPath);

  if (
    rootPackage.scripts['help:coverage-approval'] !==
    'node scripts/create-help-coverage-approval-packet.js'
  ) {
    addError('Root package.json must expose help:coverage-approval');
  }

  if (
    frontendPackage.scripts['help:coverage-approval'] !==
    'node ../scripts/create-help-coverage-approval-packet.js'
  ) {
    addError('Frontend package.json must expose help:coverage-approval');
  }

  [
    'Help Coverage Approval Packet',
    'coverage-approvals',
    '--dry-run',
    'Coverage Source Index',
    'Objective Coverage Matrix',
    'Open Gate Impact',
    'Approval Checklist',
    'Completion Boundary',
    'Do not mark the Help Center goal complete from this coverage approval packet',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(coverageApprovalPacketGeneratorPath));
  });
};

const verifyGoalAuditReporter = () => {
  ensureExists(goalAuditReporterPath, 'Help goal audit reporter');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const reporter = readText(goalAuditReporterPath);

  if (rootPackage.scripts['help:goal-audit'] !== 'node scripts/report-help-goal-audit.js') {
    addError('Root package.json must expose help:goal-audit');
  }

  if (
    frontendPackage.scripts['help:goal-audit'] !== 'node ../scripts/report-help-goal-audit.js'
  ) {
    addError('Frontend package.json must expose help:goal-audit');
  }

  [
    'Lekhon Help Goal Audit Summary',
    '--json',
    'feature-workflow-audit',
    'controlled-release-verification',
    'openReleaseReadinessGates',
    'create-help-coverage-approval-packet.js',
    'create-help-release-exception-decision-packet.js',
    'create-help-open-gate-owner-handoff.js',
    'report-help-open-gate-owners.js',
    'Requirements waiting on external evidence',
    'Do not mark the Help Center goal complete unless this command reports no source gaps and no open release gates without approved exceptions',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(goalAuditReporterPath));
  });
};

const verifyExceptionReporter = () => {
  ensureExists(exceptionReporterPath, 'Help release exception reporter');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const reporter = readText(exceptionReporterPath);

  if (rootPackage.scripts['help:exceptions'] !== 'node scripts/report-help-exceptions.js') {
    addError('Root package.json must expose help:exceptions');
  }

  if (frontendPackage.scripts['help:exceptions'] !== 'node ../scripts/report-help-exceptions.js') {
    addError('Frontend package.json must expose help:exceptions');
  }

  [
    'Lekhon Release Exception Summary',
    '--json',
    'HELP_RELEASE_EXCEPTIONS',
    'no approved exceptions recorded; open gates still require evidence',
    'Open Gates Without Valid Approved Exceptions',
    'Approved exceptions require owner, risk, scope, evidence, expiration, decision record, and next review date',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(exceptionReporterPath));
  });
};

const verifyGateClosureReadinessReporter = () => {
  ensureExists(gateClosureReadinessReporterPath, 'gate closure readiness reporter');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const reporter = readText(gateClosureReadinessReporterPath);

  if (
    rootPackage.scripts['help:gate-closure'] !==
    'node scripts/report-help-gate-closure-readiness.js'
  ) {
    addError('Root package.json must expose help:gate-closure');
  }

  if (
    frontendPackage.scripts['help:gate-closure'] !==
    'node ../scripts/report-help-gate-closure-readiness.js'
  ) {
    addError('Frontend package.json must expose help:gate-closure');
  }

  [
    'Lekhon Gate Closure Readiness Summary',
    '--json',
    'source-verified-local',
    'approved-exception-ready',
    'invalid-source-record',
    'not-closable',
    'Gate Closure Matrix',
    'Gate Closure Details',
    'notClosableGateIds',
    'Do not promote a release gate to closed',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(gateClosureReadinessReporterPath));
  });
};

const verifyPolicyReadinessReporter = () => {
  ensureExists(policyReadinessReporterPath, 'policy readiness reporter');
  ensureExists(policyApprovalPacketGeneratorPath, 'policy approval packet generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const reporter = readText(policyReadinessReporterPath);
  const approvalPacketGenerator = readText(policyApprovalPacketGeneratorPath);

  if (
    rootPackage.scripts['help:policy-approval'] !==
    'node scripts/create-help-policy-approval-packet.js'
  ) {
    addError('Root package.json must expose help:policy-approval');
  }

  if (rootPackage.scripts['help:policy-readiness'] !== 'node scripts/report-help-policy-readiness.js') {
    addError('Root package.json must expose help:policy-readiness');
  }

  if (
    frontendPackage.scripts['help:policy-approval'] !==
    'node ../scripts/create-help-policy-approval-packet.js'
  ) {
    addError('Frontend package.json must expose help:policy-approval');
  }

  if (
    frontendPackage.scripts['help:policy-readiness'] !==
    'node ../scripts/report-help-policy-readiness.js'
  ) {
    addError('Frontend package.json must expose help:policy-readiness');
  }

  [
    'Lekhon Policy Readiness Summary',
    '--json',
    'binding publication blocked',
    'Source Decision Blockers',
    'help:policy-approval',
    'POLICY_REQUIRED_APPROVALS',
    'Do not publish draft policy text as binding',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(policyReadinessReporterPath));
  });

  [
    'Policy Approval Packet',
    'policy-approvals',
    '--dry-run',
    'help:gate-closure',
    'POLICY_REQUIRED_APPROVALS',
    'Do not mark `policy-specialist-approvals` complete',
  ].forEach((token) => {
    ensureContains(approvalPacketGenerator, token, toRelative(policyApprovalPacketGeneratorPath));
  });
};

const verifySupportReadinessReporter = () => {
  ensureExists(supportLifecyclePacketGeneratorPath, 'support lifecycle packet generator');
  ensureExists(supportReadinessReporterPath, 'support readiness reporter');
  ensureExists(supportCleanupScriptPath, 'support cleanup audit script');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');
  ensureExists(backendPackagePath, 'backend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const backendPackage = JSON.parse(readText(backendPackagePath));
  const generator = readText(supportLifecyclePacketGeneratorPath);
  const reporter = readText(supportReadinessReporterPath);
  const cleanupScript = readText(supportCleanupScriptPath);

  if (rootPackage.scripts['help:support-readiness'] !== 'node scripts/report-help-support-readiness.js') {
    addError('Root package.json must expose help:support-readiness');
  }

  if (
    rootPackage.scripts['help:support-cleanup'] !==
    'node backend/scripts/supportCleanupAudit.js --prefix QA-CLEANUP'
  ) {
    addError('Root package.json must expose help:support-cleanup');
  }

  if (
    rootPackage.scripts['help:support-lifecycle'] !==
    'node scripts/create-help-support-lifecycle-packet.js'
  ) {
    addError('Root package.json must expose help:support-lifecycle');
  }

  if (
    frontendPackage.scripts['help:support-readiness'] !==
    'node ../scripts/report-help-support-readiness.js'
  ) {
    addError('Frontend package.json must expose help:support-readiness');
  }

  if (
    frontendPackage.scripts['help:support-cleanup'] !==
    'node ../backend/scripts/supportCleanupAudit.js --prefix QA-CLEANUP'
  ) {
    addError('Frontend package.json must expose help:support-cleanup');
  }

  if (
    frontendPackage.scripts['help:support-lifecycle'] !==
    'node ../scripts/create-help-support-lifecycle-packet.js'
  ) {
    addError('Frontend package.json must expose help:support-lifecycle');
  }

  if (backendPackage.scripts['support:cleanup:dry'] !== 'node scripts/supportCleanupAudit.js --prefix QA-CLEANUP') {
    addError('Backend package.json must expose support:cleanup:dry');
  }

  [
    'Support Lifecycle Verification Packet',
    'support-lifecycle',
    '--dry-run',
    'help:gate-closure',
    'Submission Matrix',
    'buildReadiness',
    'Remaining live evidence items',
    'Do not mark the live-support-report-appeal-lifecycle gate complete',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(supportLifecyclePacketGeneratorPath));
  });

  [
    'Lekhon Support Readiness Summary',
    '--json',
    'local support implementation ready; live lifecycle evidence required',
    'Remaining Live Evidence',
    'Cleanup Checks',
    'supportCleanupAudit.js',
    'dry-run cleanup audit',
    'help:support-cleanup',
    'SupportRequest.jsx',
    'AdminSupportRequests.jsx',
    'Do not mark the live support, report, and appeal lifecycle gate complete',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(supportReadinessReporterPath));
  });

  [
    'QA-CLEANUP',
    '--execute',
    '--confirm-delete-support-cleanup-records',
    'Closing records requires --owner',
    'maskEmail',
    'subject: { $regex',
  ].forEach((token) => {
    ensureContains(cleanupScript, token, toRelative(supportCleanupScriptPath));
  });
};

const verifyVisualReadinessReporter = () => {
  ensureExists(visualEvidencePacketGeneratorPath, 'visual evidence packet generator');
  ensureExists(visualReadinessReporterPath, 'visual readiness reporter');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const generator = readText(visualEvidencePacketGeneratorPath);
  const reporter = readText(visualReadinessReporterPath);

  if (rootPackage.scripts['help:visual-evidence'] !== 'node scripts/create-help-visual-evidence-packet.js') {
    addError('Root package.json must expose help:visual-evidence');
  }

  if (rootPackage.scripts['help:visual-readiness'] !== 'node scripts/report-help-visual-readiness.js') {
    addError('Root package.json must expose help:visual-readiness');
  }

  if (
    frontendPackage.scripts['help:visual-evidence'] !==
    'node ../scripts/create-help-visual-evidence-packet.js'
  ) {
    addError('Frontend package.json must expose help:visual-evidence');
  }

  if (
    frontendPackage.scripts['help:visual-readiness'] !==
    'node ../scripts/report-help-visual-readiness.js'
  ) {
    addError('Frontend package.json must expose help:visual-readiness');
  }

  [
    'P0 Visual Evidence Packet',
    'visual-evidence-packets',
    '--dry-run',
    'help:gate-closure',
    'Open P0 Visual Requirements',
    'buildReadiness',
    'Owner Sign-Off Matrix',
    'Do not mark the p0-visual-evidence-capture gate complete',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(visualEvidencePacketGeneratorPath));
  });

  [
    'Lekhon Visual Readiness Summary',
    '--json',
    'visual source registry ready; P0 visual evidence capture required',
    'Open P0 Requirements',
    'HELP_VISUAL_REQUIREMENTS',
    'p0-visual-evidence-capture',
    'Do not mark the p0-visual-evidence-capture gate complete',
  ].forEach((token) => {
    ensureContains(reporter, token, toRelative(visualReadinessReporterPath));
  });
};

const verifyAndroidWorksheetGenerator = () => {
  ensureExists(androidWorksheetGeneratorPath, 'Android verification worksheet generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const generator = readText(androidWorksheetGeneratorPath);

  if (
    rootPackage.scripts['help:android-worksheet'] !==
    'node scripts/create-help-android-verification-worksheet.js'
  ) {
    addError('Root package.json must expose help:android-worksheet');
  }

  if (
    frontendPackage.scripts['help:android-worksheet'] !==
    'node ../scripts/create-help-android-verification-worksheet.js'
  ) {
    addError('Frontend package.json must expose help:android-worksheet');
  }

  [
    'android-verification',
    '--dry-run',
    '--force',
    'help:android-device-evidence',
    'help:android-evidence',
    'help:android-readiness',
    'help:exceptions',
    'help:gate-closure',
    'help:goal-audit',
    'physical-android-device',
    'android-oauth-provider-return',
    'android-permissions-camera-microphone',
    'manual-screen-reader-verification',
    'OAuth Provider Matrix',
    'Permission Matrix',
    'Android evidence packet',
    'TalkBack And Mobile Accessibility',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(androidWorksheetGeneratorPath));
  });
};

const verifyAndroidGateWorksheetEvidence = ({ HELP_RELEASE_READINESS_GATES }) => {
  [
    'physical-android-device',
    'android-oauth-provider-return',
    'android-permissions-camera-microphone',
  ].forEach((gateId) => {
    const gate = HELP_RELEASE_READINESS_GATES.find((entry) => entry.id === gateId);
    if (!gate) {
      addError(`Missing Android gate ${gateId}`);
      return;
    }

    if (!gate.evidence.includes('npm run help:android-worksheet -- --name <android-pass-name> --dry-run')) {
      addError(`Android gate ${gateId} must include the Android worksheet dry-run command`);
    }

    if (!gate.evidence.includes('npm run help:android-device-evidence')) {
      addError(`Android gate ${gateId} must include the Android device evidence command`);
    }

    if (!gate.evidence.includes('npm run help:android-evidence -- --name <android-pass-name> --dry-run')) {
      addError(`Android gate ${gateId} must include the Android evidence packet dry-run command`);
    }
  });
};

const verifyExternalWorksheetGenerator = () => {
  ensureExists(externalWorksheetGeneratorPath, 'external verification worksheet generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const generator = readText(externalWorksheetGeneratorPath);

  if (
    rootPackage.scripts['help:external-worksheet'] !==
    'node scripts/create-help-external-verification-worksheet.js'
  ) {
    addError('Root package.json must expose help:external-worksheet');
  }

  if (
    frontendPackage.scripts['help:external-worksheet'] !==
    'node ../scripts/create-help-external-verification-worksheet.js'
  ) {
    addError('Frontend package.json must expose help:external-worksheet');
  }

  [
    'external-verification',
    '--dry-run',
    '--force',
    'help:accessibility-environment',
    'help:accessibility-verification',
    'help:analytics-approval',
    'help:analytics-readiness',
    'help:exceptions',
    'help:gate-closure',
    'help:goal-audit',
    'help:policy-approval',
    'help:support-cleanup',
    'help:support-lifecycle',
    'manual-screen-reader-verification',
    'live-support-report-appeal-lifecycle',
    'policy-specialist-approvals',
    'analytics-consent-operations',
    'Manual Accessibility Worksheet',
    'Support, Report, Appeal Lifecycle Worksheet',
    'Policy Approval Worksheet',
    'Support lifecycle packet',
    'Analytics And Operations Worksheet',
    'Accessibility verification packet',
    'Analytics approval packet',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(externalWorksheetGeneratorPath));
  });
};

const verifyExternalGateWorksheetEvidence = ({ HELP_RELEASE_READINESS_GATES }) => {
  [
    'manual-screen-reader-verification',
    'live-support-report-appeal-lifecycle',
    'policy-specialist-approvals',
    'analytics-consent-operations',
  ].forEach((gateId) => {
    const gate = HELP_RELEASE_READINESS_GATES.find((entry) => entry.id === gateId);
    if (!gate) {
      addError(`Missing external verification gate ${gateId}`);
      return;
    }

    if (!gate.evidence.includes('npm run help:external-worksheet -- --name <external-pass-name> --dry-run')) {
      addError(`External verification gate ${gateId} must include the external worksheet dry-run command`);
    }
  });
};

const verifyOpenGateReadinessEvidence = ({ HELP_RELEASE_READINESS_GATES }) => {
  [
    'physical-android-device',
    'android-oauth-provider-return',
    'android-permissions-camera-microphone',
  ].forEach((gateId) => {
    const gate = HELP_RELEASE_READINESS_GATES.find((entry) => entry.id === gateId);
    if (!gate) {
      addError(`Missing Android gate ${gateId}`);
      return;
    }

    if (!gate.evidence.includes('npm run help:android-readiness')) {
      addError(`Android gate ${gateId} must include the Android readiness command`);
    }

    if (!gate.evidence.includes('npm run help:android-device-evidence')) {
      addError(`Android gate ${gateId} must include the Android device evidence command`);
    }

    if (!gate.evidence.includes('npm run help:android-evidence -- --name <android-pass-name> --dry-run')) {
      addError(`Android gate ${gateId} must include the Android evidence packet dry-run command`);
    }
  });

  [
    ['manual-screen-reader-verification', 'npm run help:accessibility-readiness'],
    ['manual-screen-reader-verification', 'npm run help:accessibility-environment'],
    ['manual-screen-reader-verification', 'npm run help:accessibility-verification -- --name <accessibility-pass-name> --dry-run'],
    ['live-support-report-appeal-lifecycle', 'npm run help:support-readiness'],
    ['live-support-report-appeal-lifecycle', 'npm run help:support-cleanup'],
    ['live-support-report-appeal-lifecycle', 'npm run help:support-lifecycle -- --name <support-pass-name> --dry-run'],
    ['policy-specialist-approvals', 'npm run help:policy-approval -- --name <policy-pass-name> --dry-run'],
    ['policy-specialist-approvals', 'npm run help:policy-readiness'],
    ['p0-visual-evidence-capture', 'npm run help:visual-readiness'],
    ['p0-visual-evidence-capture', 'npm run help:visual-evidence -- --name <visual-pass-name> --dry-run'],
    ['analytics-consent-operations', 'npm run help:analytics-approval -- --name <analytics-pass-name> --dry-run'],
    ['analytics-consent-operations', 'npm run help:analytics-readiness'],
  ].forEach(([gateId, command]) => {
    const gate = HELP_RELEASE_READINESS_GATES.find((entry) => entry.id === gateId);
    if (!gate) {
      addError(`Missing open readiness gate ${gateId}`);
      return;
    }

    if (!gate.evidence.includes(command)) {
      addError(`Open gate ${gateId} must include ${command}`);
    }
  });
};

const verifyVisualWorksheetGenerator = () => {
  ensureExists(visualWorksheetGeneratorPath, 'visual evidence worksheet generator');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const generator = readText(visualWorksheetGeneratorPath);

  if (
    rootPackage.scripts['help:visual-worksheet'] !==
    'node scripts/create-help-visual-evidence-worksheet.js'
  ) {
    addError('Root package.json must expose help:visual-worksheet');
  }

  if (
    frontendPackage.scripts['help:visual-worksheet'] !==
    'node ../scripts/create-help-visual-evidence-worksheet.js'
  ) {
    addError('Frontend package.json must expose help:visual-worksheet');
  }

  [
    'visual-evidence',
    '--dry-run',
    '--force',
    'help:visual-evidence',
    'help:exceptions',
    'help:gate-closure',
    'help:goal-audit',
    'HELP_VISUAL_REQUIREMENTS',
    'P0 open requirements',
    'p0-visual-evidence-capture',
    'Visual privacy review complete',
    'Visual accessibility text complete',
  ].forEach((token) => {
    ensureContains(generator, token, toRelative(visualWorksheetGeneratorPath));
  });
};

const verifyPublicRoutesVerifier = () => {
  ensureExists(publicRoutesVerifierPath, 'public route verifier');
  ensureExists(rootPackagePath, 'root package.json');
  ensureExists(frontendPackagePath, 'frontend package.json');

  const rootPackage = JSON.parse(readText(rootPackagePath));
  const frontendPackage = JSON.parse(readText(frontendPackagePath));
  const verifier = readText(publicRoutesVerifierPath);

  if (rootPackage.scripts['help:public-routes'] !== 'node scripts/verify-help-public-routes.js') {
    addError('Root package.json must expose help:public-routes');
  }

  if (frontendPackage.scripts['help:public-routes'] !== 'node ../scripts/verify-help-public-routes.js') {
    addError('Frontend package.json must expose help:public-routes');
  }

  [
    'publicRouteChecks',
    'footerRequiredTargets',
    'Help public route verification passed.',
    '/help/article/:slug',
    '/policies/:slug',
    '/report',
    '/appeals',
    'PUBLIC_FOOTER_PREFIXES',
  ].forEach((token) => {
    ensureContains(verifier, token, toRelative(publicRoutesVerifierPath));
  });
};

const main = () => {
  ensureExists(planningDir, 'Help Center planning directory');
  ensureExists(releaseReadinessPath, 'release readiness source registry');
  if (errors.length > 0) return;

  const markdownFiles = ensureAsciiMarkdown();
  const { linkedFiles, numberedDocs } = verifyReadmeLinks(markdownFiles);
  const releaseReadiness = loadReleaseReadiness();

  verifyReleaseGates(releaseReadiness);
  verifyAndroidGateWorksheetEvidence(releaseReadiness);
  verifyExternalGateWorksheetEvidence(releaseReadiness);
  verifyOpenGateReadinessEvidence(releaseReadiness);
  verifyReleaseDocuments(releaseReadiness);
  verifyAndroidWorksheetGenerator();
  verifyExternalWorksheetGenerator();
  verifyReleaseCandidateGenerator();
  verifyReleasePassChecklistGenerator();
  verifyReleaseEvidenceBinderGenerator();
  verifyReleaseEvidenceStatusReporter();
  verifyAccessibilityReadinessReporter();
  verifyAnalyticsReadinessReporter();
  verifyAndroidReadinessReporter();
  verifyExceptionDecisionPacketGenerator();
  verifyCoverageApprovalPacketGenerator();
  verifyExceptionReporter();
  verifyGateClosureReadinessReporter();
  verifyGoalAuditReporter();
  verifyOpenGateOwnerHandoffGenerator();
  verifyOpenGateOwnerReporter();
  verifyPolicyReadinessReporter();
  verifyReadinessReporter();
  verifySupportReadinessReporter();
  verifyVisualReadinessReporter();
  verifyVisualWorksheetGenerator();
  verifyPublicRoutesVerifier();

  if (errors.length > 0) {
    console.error('Help governance verification failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('Help governance verification passed.');
  console.log(`Planning docs: ${markdownFiles.length}`);
  console.log(`README planning links: ${linkedFiles.length}`);
  console.log(`Numbered planning docs: ${numberedDocs.length}`);
  console.log(`Release gates: ${releaseReadiness.HELP_RELEASE_READINESS_GATES.length}`);
  console.log(`Verified local gates: ${releaseReadiness.verifiedLocalReleaseReadinessGates.length}`);
  console.log(`Open gates: ${releaseReadiness.openReleaseReadinessGates.length}`);
  console.log(
    `Open gate ids: ${releaseReadiness.openReleaseReadinessGates.map((gate) => gate.id).join(', ')}`
  );
};

main();
