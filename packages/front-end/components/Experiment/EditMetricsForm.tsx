import React, { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../services/auth";
import { ExperimentInterfaceStringDates } from "back-end/types/experiment";
import Modal from "../Modal";
import MetricsSelector from "./MetricsSelector";
import MetricsOverridesSelector from "./MetricsOverridesSelector";
import SelectField from "../Forms/SelectField";
import { useDefinitions } from "../../services/DefinitionsContext";
import { useUser } from "../../services/UserContext";
import UpgradeMessage from "../UpgradeMessage";
import UpgradeModal from "../Settings/UpgradeModal";

export interface EditMetricsFormInterface {
  metrics: string[];
  guardrails: string[];
  activationMetric: string;
  metricOverrides: {
    id: string;
    conversionWindowHours?: number;
    conversionDelayHours?: number;
    winRisk?: number;
    loseRisk?: number;
  }[];
}

const EditMetricsForm: FC<{
  experiment: ExperimentInterfaceStringDates;
  cancel: () => void;
  mutate: () => void;
}> = ({ experiment, cancel, mutate }) => {
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [hasMetricOverrideRiskError, setHasMetricOverrideRiskError] = useState(
    false
  );
  const { hasCommercialFeature } = useUser();
  const hasOverrideMetricsFeature = hasCommercialFeature("override-metrics");

  const { metrics: metricDefinitions, getDatasourceById } = useDefinitions();
  const datasource = getDatasourceById(experiment.datasource);
  const filteredMetrics = metricDefinitions.filter(
    (m) => m.datasource === datasource?.id
  );

  const defaultMetricOverrides = structuredClone(
    experiment.metricOverrides || []
  );
  for (let i = 0; i < defaultMetricOverrides.length; i++) {
    for (const key in defaultMetricOverrides[i]) {
      // fix fields with percentage values
      if (
        [
          "winRisk",
          "loseRisk",
          "maxPercentChange",
          "minPercentChange",
        ].includes(key)
      ) {
        defaultMetricOverrides[i][key] *= 100;
      }
    }
  }
  const form = useForm<EditMetricsFormInterface>({
    defaultValues: {
      metrics: experiment.metrics || [],
      guardrails: experiment.guardrails || [],
      activationMetric: experiment.activationMetric || "",
      metricOverrides: defaultMetricOverrides,
    },
  });
  const { apiCall } = useAuth();

  return (
    <>
      {upgradeModal && (
        <UpgradeModal
          close={() => setUpgradeModal(false)}
          reason="Override metric conversion windows."
          source="override-metrics"
        />
      )}
      <Modal
        autoFocusSelector=""
        header="Edit Metrics"
        size="lg"
        open={true}
        close={cancel}
        ctaEnabled={!hasMetricOverrideRiskError}
        submit={form.handleSubmit(async (value) => {
          const payload = structuredClone(value) as EditMetricsFormInterface;
          for (let i = 0; i < payload.metricOverrides.length; i++) {
            for (const key in payload.metricOverrides[i]) {
              if (key === "id") continue;
              const v = payload.metricOverrides[i][key];
              if (v === undefined || v === null || isNaN(v)) {
                delete payload.metricOverrides[i][key];
                continue;
              }
              // fix fields with percentage values
              if (
                [
                  "winRisk",
                  "loseRisk",
                  "maxPercentChange",
                  "minPercentChange",
                ].includes(key)
              ) {
                payload.metricOverrides[i][key] = v / 100;
              }
            }
          }
          await apiCall(`/experiment/${experiment.id}`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          mutate();
        })}
        cta="Save"
      >
        <div className="form-group">
          <label className="font-weight-bold mb-1">Goal Metrics</label>
          <div className="mb-1 font-italic">
            Metrics you are trying to improve with this experiment.
          </div>
          <MetricsSelector
            selected={form.watch("metrics")}
            onChange={(metrics) => form.setValue("metrics", metrics)}
            datasource={experiment.datasource}
            autoFocus={true}
          />
        </div>

        <div className="form-group">
          <label className="font-weight-bold mb-1">Guardrail Metrics</label>
          <div className="mb-1 font-italic">
            Metrics you want to monitor, but are NOT specifically trying to
            improve.
          </div>
          <MetricsSelector
            selected={form.watch("guardrails")}
            onChange={(metrics) => form.setValue("guardrails", metrics)}
            datasource={experiment.datasource}
          />
        </div>

        <div className="form-group">
          <label className="font-weight-bold mb-1">Activation Metric</label>
          <div className="mb-1 font-italic">
            Users must convert on this metric before being included.
          </div>
          <SelectField
            options={filteredMetrics.map((m) => {
              return {
                label: m.name,
                value: m.id,
              };
            })}
            initialOption="None"
            value={form.watch("activationMetric")}
            onChange={(metric) => form.setValue("activationMetric", metric)}
          />
        </div>

        <div className="form-group mb-4">
          <label className="font-weight-bold mb-1">
            Metric Overrides (optional)
          </label>
          <div className="mb-2 font-italic" style={{ fontSize: 12 }}>
            <p className="mb-0">
              Override metric behaviors within this experiment.
            </p>
            <p className="mb-0">
              Leave any fields empty that you do not want to override.
            </p>
          </div>
          <MetricsOverridesSelector
            experiment={experiment}
            form={form}
            disabled={!hasOverrideMetricsFeature}
            setHasMetricOverrideRiskError={(v: boolean) =>
              setHasMetricOverrideRiskError(v)
            }
          />
          {!hasOverrideMetricsFeature && (
            <UpgradeMessage
              showUpgradeModal={() => setUpgradeModal(true)}
              commercialFeature="override-metrics"
              upgradeMessage="override metrics"
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default EditMetricsForm;
