<script setup lang="ts">
import { ref, onMounted } from "vue";

import "@material/web/button/filled-button";
import "@material/web/progress/circular-progress";
import "@material/web/progress/linear-progress";

import { useAPI } from "../composables/useApi";
import { ICONS } from "../constants";
import { useI18n } from "../composables/useI18n";

const { t } = useI18n();

interface UpdateInfo {
  updated: boolean;
  old_version: string;
  new_version: string;
}

const api = useAPI();

const loading = ref(true);
const checking = ref(true);
const update = ref<UpdateInfo | null>(null);

const packageCount = ref<number | null>(null);
const adaptedCount = ref<number | null>(null);

const updating = ref(false);
const progress = ref(0);
const stage = ref(t("update.fetch"));

const currentStage = ref<string>("fetch");

const STAGE_LABEL: Record<string, string> = {
  fetch: t("update.fetch"),
  download_global: t("update.download"),
  download_package: t("update.download"),
  download: t("update.download"),
};

onMounted(async () => {
  try {
    const [updateRes, pc, ac] = await Promise.all([
      api.checkUpdate().catch(() => null),
      api.getPackagesCount?.().catch(() => null),
      api.getAdaptedCount?.().catch(() => null),
    ]);

    if (updateRes)
      update.value = {
        updated: updateRes.updated,
        old_version: formatDate(updateRes.old_generated_at * 1000),
        new_version: formatDate(updateRes.new_generated_at * 1000),
      };
    if (typeof pc === "number") packageCount.value = pc;
    if (typeof ac === "number") adaptedCount.value = ac;
  } finally {
    loading.value = false;
    checking.value = false;
  }
});

const formatDate = (iso: number) => new Date(iso).toLocaleString();

const handleUpdate = async () => {
  updating.value = true;
  progress.value = 0;
  stage.value = t("update.preparing");
  currentStage.value = "fetch";

  try {
    await api.updateStream((msg) => {
      console.log("[UI event]", msg);

      switch (msg.type) {
        case "stage": {
          const s = msg.value as string;
          currentStage.value = s;

          stage.value = STAGE_LABEL[s] ?? s;
          break;
        }

        case "progress": {
          const v = msg.value as number;

          const percent = v <= 1 ? v * 100 : v;

          progress.value = Math.max(progress.value, Math.floor(percent));
          break;
        }

        case "info":
          if (msg.message) stage.value = msg.message;
          break;

        case "done":
          stage.value = t("update.done");
          progress.value = 100;
          break;

        case "error":
          stage.value = t("update.failed");
          break;
      }
    });
  } catch (e) {
    console.error("更新失败:", e);
  } finally {
    updating.value = false;
  }
};
</script>

<template>
  <div class="container">
    <div class="info" style="margin-top: 12px">
      <div class="packages-count-card">
        <span>{{ t("label.packagesCount") }}</span>

        <span v-if="packageCount !== null" class="value">{{ packageCount }}</span>
        <span v-else>{{ t("common.calculating") }}</span>
      </div>
      <div class="packages-count-card">
        <span>{{ t("label.adaptedCount") }}</span>

        <span v-if="packageCount !== null" class="value">{{ adaptedCount }}</span>
        <span v-else>{{ t("common.calculating") }}</span>
      </div>
    </div>

    <div class="update-card">
      <div v-if="checking" style="display: flex">
        <div>{{ t("update.checking") }}</div>
        <md-circular-progress indeterminate style="margin-left: auto" />
      </div>

      <template v-else-if="update?.updated">
        <h2 class="title">{{ t("update.found") }}</h2>

        <div class="info">
          <div class="row">
            <span>{{ t("update.currentVersion") }}</span>
            <span>{{ update.new_version }}</span>
          </div>
          <div class="row">
            <span>{{ t("update.latestVersion") }}</span>
            <span class="highlight">{{ update.old_version }}</span>
          </div>
        </div>

        <div v-if="updating" class="progress">
          <div class="stage">{{ stage }}</div>

          <md-linear-progress :value="progress / 100" />

          <div class="percent">{{ progress }}%</div>
        </div>

        <md-filled-button :disabled="updating" @click="handleUpdate" class="update-btn">
          <md-icon slot="icon">
            <svg viewBox="0 0 24 24">
              <path :d="ICONS.update" />
            </svg>
          </md-icon>
          {{ t("update.updateNow") }}
        </md-filled-button>
      </template>

      <div v-else>{{ t("update.upToDate") }}</div>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 100%;
}

.update-card {
  width: 100%;
  border-radius: 16px;
  padding: 20px;

  color: var(--md-sys-color-on-secondary-container);
  background: var(--md-sys-color-secondary-container);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.title {
  margin: 0 0 16px;
  font-size: 20px;
  text-align: center;
}

.info {
  display: flex;
  gap: 8px;
}

.packages-count-card {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  font-size: 14px;
  color: var(--md-sys-color-on-surface-variant);
  width: 100%;
  margin-bottom: 10px;
  padding: 20px;
  background: var(--md-sys-color-surface-container);
  border-radius: 16px;
}

.packages-count-card .value {
  font-size: 20px;
  margin-top: 4px;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  opacity: 0.9;
}

.highlight {
  color: var(--md-sys-color-primary);
  font-weight: 500;
}

.progress {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stage {
  font-size: 13px;
  opacity: 0.7;
}

.percent {
  font-size: 12px;
  text-align: right;
  opacity: 0.6;
}

.notes {
  margin-top: 12px;
  font-size: 13px;
  opacity: 0.75;
}

.update-btn {
  margin-top: 16px;
  width: 100%;
}
</style>
