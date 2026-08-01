import { LineSandboxPlanError, lineSandboxTestCaseKeys, type LineSandboxPlanReasonCode, type LineSandboxTestCaseKey, type LineSandboxTestMatrixResult, type LineSandboxTestRecord } from "./models";

const localCases = Object.freeze(lineSandboxTestCaseKeys.slice(0, 12) as readonly LineSandboxTestCaseKey[]);
const realWorldCases = Object.freeze(lineSandboxTestCaseKeys.slice(12) as readonly LineSandboxTestCaseKey[]);
const referencePattern = /^[a-z][a-z0-9_.:-]{2,99}$/;

export function evaluateLineSandboxTestMatrix(records: readonly LineSandboxTestRecord[], nowBucket: number): LineSandboxTestMatrixResult {
  if (!Number.isSafeInteger(nowBucket) || records.length > lineSandboxTestCaseKeys.length) throw new LineSandboxPlanError("TEST_MATRIX_INVALID");
  const byCase = new Map<LineSandboxTestCaseKey, LineSandboxTestRecord>();
  for (const record of records) {
    const keys = ["testCase", "evidenceClass", "status", "evidenceRef", "verifiedAtBucket", "maximumAgeBuckets", "source"];
    const isLocal = localCases.includes(record.testCase);
    if (Object.keys(record).some((key) => !keys.includes(key)) || !lineSandboxTestCaseKeys.includes(record.testCase) || byCase.has(record.testCase) ||
        record.evidenceClass !== (isLocal ? "local_control" : "real_world_prerequisite") || !["passed", "failed", "not_run", "expired"].includes(record.status) ||
        !referencePattern.test(record.evidenceRef) || !Number.isSafeInteger(record.maximumAgeBuckets) || record.maximumAgeBuckets < 1 || record.maximumAgeBuckets > 24 * 365 ||
        (record.verifiedAtBucket !== null && !Number.isSafeInteger(record.verifiedAtBucket)) || record.source !== (isLocal ? "trusted_repository" : "trusted_provider_sandbox")) {
      throw new LineSandboxPlanError("TEST_MATRIX_INVALID");
    }
    byCase.set(record.testCase, record);
  }
  const missing: LineSandboxTestCaseKey[] = [];
  const stale: LineSandboxTestCaseKey[] = [];
  const failed: LineSandboxTestCaseKey[] = [];
  for (const testCase of lineSandboxTestCaseKeys) {
    const record = byCase.get(testCase);
    if (!record || record.status === "not_run") { missing.push(testCase); continue; }
    if (record.status === "failed") { failed.push(testCase); continue; }
    if (record.status === "expired" || record.verifiedAtBucket === null || record.verifiedAtBucket > nowBucket || nowBucket - record.verifiedAtBucket > record.maximumAgeBuckets) stale.push(testCase);
  }
  const reasonCodes: LineSandboxPlanReasonCode[] = [];
  if (missing.length || failed.length) reasonCodes.push("TEST_MATRIX_INCOMPLETE");
  if (stale.length) reasonCodes.push("TEST_EVIDENCE_STALE");
  const passed = (cases: readonly LineSandboxTestCaseKey[]) => cases.every((key) => byCase.get(key)?.status === "passed" && !stale.includes(key));
  return Object.freeze({ localControlsComplete: passed(localCases), realWorldPrerequisitesComplete: passed(realWorldCases), missing: Object.freeze(missing), stale: Object.freeze(stale), failed: Object.freeze(failed), reasonCodes: Object.freeze(reasonCodes) });
}

export function localLineSandboxTestRecord(testCase: LineSandboxTestCaseKey, nowBucket: number): LineSandboxTestRecord {
  if (!localCases.includes(testCase)) throw new LineSandboxPlanError("TEST_MATRIX_INVALID");
  return Object.freeze({ testCase, evidenceClass: "local_control", status: "passed", evidenceRef: `test.local.${testCase}.v1`, verifiedAtBucket: nowBucket, maximumAgeBuckets: 24 * 30, source: "trusted_repository" });
}

export function pendingProviderSandboxTestRecord(testCase: LineSandboxTestCaseKey): LineSandboxTestRecord {
  if (!realWorldCases.includes(testCase)) throw new LineSandboxPlanError("TEST_MATRIX_INVALID");
  return Object.freeze({ testCase, evidenceClass: "real_world_prerequisite", status: "not_run", evidenceRef: `test.pending.${testCase}.v1`, verifiedAtBucket: null, maximumAgeBuckets: 24 * 30, source: "trusted_provider_sandbox" });
}

export const localLineSandboxTestCases = localCases;
export const realWorldLineSandboxTestCases = realWorldCases;
