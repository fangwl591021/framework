import type {
  AiLabBudgetFixture,
  AiLabTimelineEntry,
  AiLabTrustedContext,
} from "./ai-lab-models";

interface EvidenceRow {
  id: string;
  tenant_id: string;
  application_id: string;
  actor_fixture: string;
  task_key: string;
  scenario_key: string;
  input_digest: string;
  idempotency_digest: string;
  status: "completed" | "rejected" | "failed" | "fallback" | "cached";
  support_code: string;
  timeline_json: string;
  summary_json: string;
  created_at: number;
}

const parseEvidence = (row: EvidenceRow) => ({
  requestId: row.id,
  tenantScope: row.tenant_id,
  applicationScope: row.application_id,
  actorFixture: row.actor_fixture,
  taskKey: row.task_key,
  scenario: row.scenario_key,
  status: row.status,
  supportCode: row.support_code,
  timeline: JSON.parse(row.timeline_json) as readonly AiLabTimelineEntry[],
  summary: JSON.parse(row.summary_json) as Readonly<Record<string, unknown>>,
  createdAt: row.created_at,
});

export class LocalAiLabRepository {
  constructor(private readonly db: D1Database) {}

  async catalog() {
    const providers = (
      await this.db
        .prepare(
          `SELECT provider_key,adapter_version,status,capabilities_json,data_region,retention_policy
           FROM ai_provider_catalog ORDER BY provider_key LIMIT 20`,
        )
        .all<{
          provider_key: string;
          adapter_version: string;
          status: string;
          capabilities_json: string;
          data_region: string;
          retention_policy: string;
        }>()
    ).results;
    const models = (
      await this.db
        .prepare(
          `SELECT provider_key,model_key,model_version,status,capabilities_json,
                  quality_score,estimated_cost_micros,max_input_units,max_output_units
           FROM ai_model_catalog ORDER BY provider_key,model_key,model_version LIMIT 50`,
        )
        .all<{
          provider_key: string;
          model_key: string;
          model_version: string;
          status: string;
          capabilities_json: string;
          quality_score: number;
          estimated_cost_micros: number;
          max_input_units: number;
          max_output_units: number;
        }>()
    ).results;
    return providers.map((provider) => ({
      provider: provider.provider_key,
      adapterVersion: provider.adapter_version,
      status: provider.status,
      capabilities: JSON.parse(provider.capabilities_json),
      dataRegion: provider.data_region,
      retentionPolicy: provider.retention_policy,
      models: models
        .filter((model) => model.provider_key === provider.provider_key)
        .map((model) => ({
          model: model.model_key,
          version: model.model_version,
          status: model.status,
          capabilities: JSON.parse(model.capabilities_json),
          qualityScore: model.quality_score,
          latencyScore: model.provider_key === "deterministic_local_adapter" ? 100 : 0,
          estimatedUnitCostMicros: model.estimated_cost_micros,
          structuredOutput: JSON.parse(model.capabilities_json).includes(
            "structured_output",
          ),
          toolCalling: false,
          maxInputUnits: model.max_input_units,
          maxOutputUnits: model.max_output_units,
        })),
    }));
  }

  async tasks() {
    const rows = (
      await this.db
        .prepare(
          `SELECT task_key,task_version,category,sensitivity_class,quality_tier,
                  cache_policy,max_input_units,max_output_units,capabilities_json,status
           FROM ai_task_registry ORDER BY task_key,task_version LIMIT 50`,
        )
        .all<Record<string, unknown>>()
    ).results;
    return rows.map((row) => ({
      ...row,
      capabilities_json: JSON.parse(String(row.capabilities_json)),
    }));
  }

  async policies(context: AiLabTrustedContext) {
    const rows = (
      await this.db
        .prepare(
          `SELECT id,scope_type,task_key,task_version,quality_tier,route_chain_json,
                  max_cost_micros,max_latency_ms,cache_allowed,status,version
           FROM ai_route_policies
           WHERE scope_type='platform'
              OR (tenant_id=?1 AND (application_id IS NULL OR application_id=?2))
           ORDER BY task_key,scope_type,version DESC LIMIT 50`,
        )
        .bind(context.tenantId, context.applicationId)
        .all<Record<string, unknown>>()
    ).results;
    return rows.map((row) => ({
      ...row,
      route_chain_json: JSON.parse(String(row.route_chain_json)),
    }));
  }

  async budgets(context: AiLabTrustedContext) {
    return (
      await this.db
        .prepare(
          `SELECT scope_type,window_key,max_requests,max_input_units,max_output_units,
                  max_cost_micros,max_concurrent,used_requests,used_input_units,
                  used_output_units,used_cost_micros,concurrent_claims,window_ends_at,status
           FROM ai_budgets
           WHERE scope_type='platform'
              OR (tenant_id=?1 AND (application_id IS NULL OR application_id=?2))
           ORDER BY CASE scope_type WHEN 'platform' THEN 1 WHEN 'tenant' THEN 2 ELSE 3 END
           LIMIT 10`,
        )
        .bind(context.tenantId, context.applicationId)
        .all<Record<string, unknown>>()
    ).results;
  }

  async applyBudgetFixture(
    context: AiLabTrustedContext,
    fixture: AiLabBudgetFixture,
    now: number,
  ): Promise<void> {
    const values = {
      generous: [1000, 1_000_000, 1_000_000, 1_000_000, 20, 0],
      tight: [1, 4096, 512, 1000, 1, 0],
      exhausted: [0, 0, 0, 0, 1, 0],
      concurrency_limited: [100, 100_000, 100_000, 100_000, 1, 1],
      premium_blocked: [0, 0, 0, 0, 1, 0],
    }[fixture];
    await this.db
      .prepare(
        `UPDATE ai_budgets
         SET max_requests=?1,max_input_units=?2,max_output_units=?3,max_cost_micros=?4,
             max_concurrent=?5,used_requests=0,used_input_units=0,used_output_units=0,
             used_cost_micros=0,concurrent_claims=?6,version=version+1,updated_at=?7
         WHERE tenant_id=?8 AND (application_id IS NULL OR application_id=?9)
           AND status='active'`,
      )
      .bind(...values, now, context.tenantId, context.applicationId)
      .run();
  }

  async usageEvidence(context: AiLabTrustedContext, requestId: string) {
    return this.db
      .prepare(
        `SELECT provider_key,model_key,model_version,input_units,output_units,
                estimated_cost_micros,cache_outcome,outcome,latency_ms,occurred_at
         FROM ai_usage_records
         WHERE tenant_id=?1 AND application_id=?2 AND request_id=?3`,
      )
      .bind(context.tenantId, context.applicationId, requestId)
      .first<Record<string, unknown>>();
  }

  async cacheEvidence(
    context: AiLabTrustedContext,
    taskKey: string,
    inputDigest: string,
  ) {
    const row = await this.db
      .prepare(
        `SELECT cache_key,status,expires_at,response_json
         FROM ai_cache_entries
         WHERE tenant_id=?1 AND application_id=?2 AND task_key=?3 AND input_digest=?4
         ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(context.tenantId, context.applicationId, taskKey, inputDigest)
      .first<{
        cache_key: string;
        status: string;
        expires_at: number;
        response_json: string;
      }>();
    return row
      ? {
          keyDigestPrefix: row.cache_key.slice(0, 12),
          scope: "tenant+application",
          status: row.status,
          expiresAt: row.expires_at,
          staleUntil: null,
          payloadSize: row.response_json.length,
        }
      : null;
  }

  async expireCache(
    context: AiLabTrustedContext,
    taskKey: string,
    inputDigest: string,
    now: number,
  ) {
    return this.db
      .prepare(
        `UPDATE ai_cache_entries SET status='expired',version=version+1,updated_at=?1
         WHERE tenant_id=?2 AND application_id=?3 AND task_key=?4
           AND input_digest=?5 AND status='active'`,
      )
      .bind(now, context.tenantId, context.applicationId, taskKey, inputDigest)
      .run();
  }

  async replay(
    context: AiLabTrustedContext,
    taskKey: string,
    idempotencyDigest: string,
  ): Promise<(ReturnType<typeof parseEvidence> & { inputDigest: string }) | null> {
    const row = await this.db
      .prepare(
        `SELECT id,tenant_id,application_id,actor_fixture,task_key,scenario_key,
                input_digest,idempotency_digest,status,support_code,timeline_json,
                summary_json,created_at
         FROM local_ai_lab_evidence
         WHERE tenant_id=?1 AND application_id=?2 AND task_key=?3 AND idempotency_digest=?4`,
      )
      .bind(
        context.tenantId,
        context.applicationId,
        taskKey,
        idempotencyDigest,
      )
      .first<EvidenceRow>();
    return row ? { ...parseEvidence(row), inputDigest: row.input_digest } : null;
  }

  async saveEvidence(values: {
    id: string;
    context: AiLabTrustedContext;
    taskKey: string;
    scenario: string;
    inputDigest: string;
    idempotencyDigest: string;
    status: EvidenceRow["status"];
    supportCode: string;
    timeline: readonly AiLabTimelineEntry[];
    summary: Readonly<Record<string, unknown>>;
    now: number;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO local_ai_lab_evidence(
           id,tenant_id,application_id,actor_fixture,task_key,scenario_key,
           input_digest,idempotency_digest,status,support_code,timeline_json,
           summary_json,created_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)`,
      )
      .bind(
        values.id,
        values.context.tenantId,
        values.context.applicationId,
        values.context.actorFixture,
        values.taskKey,
        values.scenario,
        values.inputDigest,
        values.idempotencyDigest,
        values.status,
        values.supportCode,
        JSON.stringify(values.timeline),
        JSON.stringify(values.summary),
        values.now,
      )
      .run();
  }

  async listRequests(
    context: AiLabTrustedContext,
    before: number,
    limit: number,
  ) {
    const bounded = Math.max(1, Math.min(limit, 50));
    const statement = context.platformAggregateAllowed
      ? this.db
          .prepare(
            `SELECT id,tenant_id,application_id,actor_fixture,task_key,scenario_key,
                    input_digest,idempotency_digest,status,support_code,timeline_json,
                    summary_json,created_at
             FROM local_ai_lab_evidence WHERE created_at<?1
             ORDER BY created_at DESC,id DESC LIMIT ?2`,
          )
          .bind(before, bounded)
      : this.db
          .prepare(
            `SELECT id,tenant_id,application_id,actor_fixture,task_key,scenario_key,
                    input_digest,idempotency_digest,status,support_code,timeline_json,
                    summary_json,created_at
             FROM local_ai_lab_evidence WHERE tenant_id=?1 AND created_at<?2
             ORDER BY created_at DESC,id DESC LIMIT ?3`,
          )
          .bind(context.tenantId, before, bounded);
    return (await statement.all<EvidenceRow>()).results.map(parseEvidence);
  }

  async requestDetail(context: AiLabTrustedContext, requestId: string) {
    const statement = context.platformAggregateAllowed
      ? this.db
          .prepare(
            `SELECT id,tenant_id,application_id,actor_fixture,task_key,scenario_key,
                    input_digest,idempotency_digest,status,support_code,timeline_json,
                    summary_json,created_at
             FROM local_ai_lab_evidence WHERE id=?1`,
          )
          .bind(requestId)
      : this.db
          .prepare(
            `SELECT id,tenant_id,application_id,actor_fixture,task_key,scenario_key,
                    input_digest,idempotency_digest,status,support_code,timeline_json,
                    summary_json,created_at
             FROM local_ai_lab_evidence WHERE tenant_id=?1 AND id=?2`,
          )
          .bind(context.tenantId, requestId);
    const row = await statement.first<EvidenceRow>();
    return row ? parseEvidence(row) : null;
  }

  async usage(context: AiLabTrustedContext, from: number, until: number) {
    const scope = context.platformAggregateAllowed ? "" : " AND tenant_id=?3";
    const bind = (sql: string) => {
      const statement = this.db.prepare(sql);
      return context.platformAggregateAllowed
        ? statement.bind(from, until)
        : statement.bind(from, until, context.tenantId);
    };
    const [totals, byTask, byProvider, byOutcome] = await Promise.all([
      bind(
        `SELECT count(*) requests,
                coalesce(sum(CASE WHEN status IN ('completed','cached','fallback') THEN 1 ELSE 0 END),0) succeeded,
                coalesce(sum(CASE WHEN status='cached' THEN 1 ELSE 0 END),0) cached,
                coalesce(sum(CASE WHEN status IN ('rejected','failed') THEN 1 ELSE 0 END),0) rejected,
                coalesce(sum(CASE WHEN status='fallback' THEN 1 ELSE 0 END),0) fallback,
                coalesce(sum(CAST(json_extract(summary_json,'$.usage.input_units') AS INTEGER)),0) input_units,
                coalesce(sum(CAST(json_extract(summary_json,'$.usage.output_units') AS INTEGER)),0) output_units,
                coalesce(sum(CAST(json_extract(summary_json,'$.usage.estimated_cost_micros') AS INTEGER)),0) estimated_cost_micros
         FROM local_ai_lab_evidence WHERE created_at>=?1 AND created_at<?2${scope}`,
      ).first<Record<string, number>>(),
      bind(
        `SELECT task_key label,count(*) requests,
                coalesce(sum(CAST(json_extract(summary_json,'$.usage.estimated_cost_micros') AS INTEGER)),0) estimated_cost_micros
         FROM local_ai_lab_evidence WHERE created_at>=?1 AND created_at<?2${scope}
         GROUP BY task_key ORDER BY requests DESC,task_key LIMIT 20`,
      ).all<Record<string, unknown>>(),
      bind(
        `SELECT coalesce(json_extract(summary_json,'$.route.provider'),'none') label,
                count(*) requests,
                coalesce(sum(CAST(json_extract(summary_json,'$.usage.estimated_cost_micros') AS INTEGER)),0) estimated_cost_micros
         FROM local_ai_lab_evidence WHERE created_at>=?1 AND created_at<?2${scope}
         GROUP BY label ORDER BY requests DESC,label LIMIT 20`,
      ).all<Record<string, unknown>>(),
      bind(
        `SELECT status label,count(*) requests,
                coalesce(sum(CAST(json_extract(summary_json,'$.usage.estimated_cost_micros') AS INTEGER)),0) estimated_cost_micros
         FROM local_ai_lab_evidence WHERE created_at>=?1 AND created_at<?2${scope}
         GROUP BY status ORDER BY requests DESC,status LIMIT 20`,
      ).all<Record<string, unknown>>(),
    ]);
    return {
      range: { from, until },
      scope: context.platformAggregateAllowed ? "platform" : "tenant",
      costLabel: "Estimate - Not Billing",
      totals: totals ?? {},
      byTask: byTask.results,
      byProvider: byProvider.results,
      byOutcome: byOutcome.results,
    };
  }

  async reset(context: AiLabTrustedContext, now: number): Promise<void> {
    await this.db.batch([
      this.db
        .prepare(
          "DELETE FROM local_ai_lab_evidence WHERE tenant_id=?1 AND application_id=?2",
        )
        .bind(context.tenantId, context.applicationId),
      this.db
        .prepare(
          `UPDATE ai_cache_entries SET status='invalidated',version=version+1,updated_at=?1
           WHERE tenant_id=?2 AND application_id=?3 AND status='active'`,
        )
        .bind(now, context.tenantId, context.applicationId),
    ]);
    await this.applyBudgetFixture(context, "generous", now);
  }
}
