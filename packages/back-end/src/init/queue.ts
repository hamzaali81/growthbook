import addExperimentResultsJob from "../jobs/updateExperimentResults";
import addWebhooksJob from "../jobs/webhooks";
import addCacheInvalidateJob from "../jobs/cacheInvalidate";
import addMetricUpdateJob from "../jobs/updateMetrics";
import { CRON_ENABLED } from "../util/secrets";
import { getAgendaInstance } from "../services/queueing";

export async function queueInit() {
  if (!CRON_ENABLED) return;

  const agenda = getAgendaInstance();

  addExperimentResultsJob(agenda);
  addMetricUpdateJob(agenda);
  addWebhooksJob(agenda);
  addCacheInvalidateJob(agenda);

  await agenda.start();
}
