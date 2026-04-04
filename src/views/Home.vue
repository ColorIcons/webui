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

const checking = ref(true);
const update = ref<UpdateInfo | null>(null);

const packageCount = ref<number | null>(null);
const adaptedCount = ref<number | null>(null);

const updating = ref(false);
const progress = ref(0);
const stage = ref(t("update.fetch"));

const STAGE_LABEL: Record<string, string> = {
  fetch: t("update.fetch"),
  download: t("update.download"),
};

const getInfo = async () => {
  api
    .getPackagesCount?.()
    .then((pc) => {
      if (typeof pc === "number") packageCount.value = pc;
    })
    .catch(() => {});

  api
    .getAdaptedCount?.()
    .then((ac) => {
      if (typeof ac === "number") adaptedCount.value = ac;
    })
    .catch(() => {});

  api
    .checkUpdate()
    .then((updateRes) => {
      if (updateRes) {
        update.value = {
          updated: updateRes.updated,
          old_version: formatDate(updateRes.old_generated_at * 1000),
          new_version: formatDate(updateRes.new_generated_at * 1000),
        };
      }
    })
    .catch(() => {})
    .finally(() => {
      checking.value = false;
    });
};

onMounted(async () => {
  await getInfo();
});

const formatDate = (iso: number) => new Date(iso).toLocaleString();

const handleUpdate = async () => {
  updating.value = true;
  progress.value = 0;
  stage.value = t("update.preparing");

  try {
    await api.updateStream((msg) => {
      console.log("[UI event]", msg);

      switch (msg.type) {
        case "stage": {
          const s = msg.value as string;

          stage.value = STAGE_LABEL[s] ?? s;
          break;
        }

        case "progress": {
          const v = msg.value as number;

          const percent = v <= 1 ? v * 100 : v;

          progress.value = Math.max(progress.value, Math.floor(percent));
          break;
        }

        case "done":
          stage.value = t("update.done");
          progress.value = 100;
          getInfo();
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
  <div class="update-panel">
    <div class="update-panel__stats">
      <div class="stat-card">
        <span class="stat-card__label">{{ t("label.packagesCount") }}</span>
        <span v-if="packageCount !== null" class="stat-card__value">
          {{ packageCount }}
        </span>
        <span v-else class="stat-card__placeholder">
          {{ t("common.calculating") }}
        </span>
      </div>

      <div class="stat-card">
        <span class="stat-card__label">{{ t("label.adaptedCount") }}</span>
        <span v-if="adaptedCount !== null" class="stat-card__value">
          {{ adaptedCount }}
        </span>
        <span v-else class="stat-card__placeholder">
          {{ t("common.calculating") }}
        </span>
      </div>
    </div>

    <div class="update-card">
      <div v-if="checking" class="update-card__checking">
        <span>{{ t("update.checking") }}</span>
        <md-circular-progress indeterminate />
      </div>

      <template v-else-if="update?.updated">
        <h2 class="update-card__title">{{ t("update.found") }}</h2>

        <div class="update-card__info">
          <div class="update-card__row">
            <span>{{ t("update.currentVersion") }}</span>
            <span>{{ update.old_version }}</span>
          </div>
          <div class="update-card__row">
            <span>{{ t("update.latestVersion") }}</span>
            <span class="update-card__value--highlight">
              {{ update.new_version }}
            </span>
          </div>
        </div>

        <div v-if="updating" class="update-progress">
          <div class="update-progress__stage">{{ stage }}</div>

          <md-linear-progress :value="progress / 100" />

          <div class="update-progress__percent">{{ progress }}%</div>
        </div>

        <md-filled-button class="update-card__action" :disabled="updating" @click="handleUpdate">
          <md-icon slot="icon">
            <svg viewBox="0 0 24 24">
              <path :d="ICONS.update" />
            </svg>
          </md-icon>
          {{ t("update.updateNow") }}
        </md-filled-button>
      </template>

      <div v-else class="update-card__empty">
        {{ t("update.upToDate") }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.update-panel {
  width: 100%;
}

.update-panel__stats {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  padding: 20px;
  border-radius: 16px;

  font-size: 14px;
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
}

.stat-card__value {
  margin-top: 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.stat-card__placeholder {
  opacity: 0.6;
}

/* ===== update card ===== */
.update-card {
  padding: 20px;
  border-radius: 16px;

  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);

  border: 1px solid rgba(255, 255, 255, 0.08);
}

.update-card__title {
  margin-bottom: 16px;
  font-size: 20px;
  text-align: center;
}

.update-card__checking {
  display: flex;
  align-items: center;
  gap: 8px;
}

.update-card__checking md-circular-progress {
  margin-left: auto;
}

.update-card__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.update-card__row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  opacity: 0.9;
}

.update-card__value--highlight {
  color: var(--md-sys-color-primary);
  font-weight: 500;
}

.update-card__action {
  margin-top: 16px;
  width: 100%;
}

.update-card__empty {
  text-align: center;
}

/* ===== progress ===== */
.update-progress {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.update-progress__stage {
  font-size: 13px;
  opacity: 0.7;
}

.update-progress__percent {
  font-size: 12px;
  text-align: right;
  opacity: 0.6;
}
</style>
