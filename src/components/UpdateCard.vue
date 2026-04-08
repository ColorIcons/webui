<script setup lang="ts">
import { computed, ref } from "vue";

import "@material/web/button/filled-button";
import "@material/web/progress/circular-progress";
import "@material/web/progress/linear-progress";

import { useI18n } from "../composables/useI18n";
import { useAPI } from "../composables/useApi";
import { ICONS } from "../constants";

import type { UpdateInfoRes } from "../types/api";
import { useCollapseTransition } from "../composables/useCollapseTransition";

const { t } = useI18n();

interface Props {
  data: UpdateInfoRes;
}
const { data } = defineProps<Props>();

interface Emits {
  (e: "update"): void;
}
const emits = defineEmits<Emits>();

const show = defineModel<boolean>("show");

type Stage = "idle" | "fetch" | "download" | "done" | "error";

const updating = ref(false);
const progress = ref(0);
const stage = ref<Stage>("idle");

const isDone = computed(() => stage.value === "done");

const stageText = computed(() => getStageLabel(stage.value));

const oldVersion = computed(() => formatDate(data.old_generated_at * 1000));
const newVersion = computed(() => formatDate(data.new_generated_at * 1000));

const getStageLabel = (key: Stage) => {
  const map: Record<Stage, string> = {
    idle: t("update.preparing"),
    fetch: t("update.fetch"),
    download: t("update.download"),
    done: t("update.done"),
    error: t("update.failed"),
  };
  return map[key];
};

const formatDate = (ts: number) => {
  const d = new Date(ts);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
};

const normalizeProgress = (v: number, current: number) => {
  const next = v <= 1 ? v * 100 : v;
  return Math.max(current, Math.floor(next));
};

const api = useAPI();

const handleUpdate = async () => {
  updating.value = true;
  progress.value = 0;
  stage.value = "idle";

  try {
    await api.updateStream((msg) => {
      switch (msg.type) {
        case "stage": {
          const s = msg.value as Stage;
          stage.value = s;
          break;
        }

        case "progress": {
          const v = msg.value as number;
          progress.value = normalizeProgress(v, progress.value);
          break;
        }

        case "done": {
          stage.value = "done";
          progress.value = 100;
          setTimeout(() => (show.value = false), 500);
          break;
        }

        case "error": {
          stage.value = "error";
          break;
        }
      }
    });
  } catch (e) {
    console.error(e);
    stage.value = "error";
  } finally {
    updating.value = false;
  }

  emits("update");
};

const { onBeforeEnter, onEnter, onAfterEnter, onBeforeLeave, onLeave, onAfterLeave } =
  useCollapseTransition();
</script>

<template>
  <transition
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @before-leave="onBeforeLeave"
    @leave="onLeave"
    @after-leave="onAfterLeave"
  >
    <section v-if="show" class="update-card">
      <h2 class="title">{{ t("update.found") }}</h2>

      <div class="info">
        <div class="row">
          <span>{{ t("update.currentVersion") }}</span>
          <span>{{ oldVersion }}</span>
        </div>

        <div class="row highlight">
          <span>{{ t("update.latestVersion") }}</span>
          <span>{{ newVersion }}</span>
        </div>
      </div>

      <div v-if="updating || isDone" class="progress">
        <div class="stage">{{ stageText }}</div>

        <md-linear-progress :value="progress / 100" />

        <div class="percent">{{ progress }}%</div>
      </div>

      <md-filled-button v-if="!updating && !isDone" class="update-btn" @click="handleUpdate">
        <md-icon slot="icon">
          <svg viewBox="0 0 24 24">
            <path :d="ICONS.update" />
          </svg>
        </md-icon>

        {{ t("update.updateNow") }}
      </md-filled-button>
    </section>
  </transition>
</template>

<style scoped>
.update-card {
  margin-top: 8px;
  padding: 20px;
  border-radius: 16px;
  overflow: hidden;

  background: var(--md-sys-color-secondary-container);
  border: 1px solid rgba(255, 255, 255, 0.08);

  transition:
    height 0.4s cubic-bezier(0.3, 0.8, 0.3, 1),
    opacity 0.3s;
}

.title {
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 600;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  opacity: 0.85;
}

.row span:last-child {
  font-weight: 600;
}

.highlight span:last-child {
  color: var(--md-sys-color-primary);
}

.update-btn {
  width: 100%;
  margin-top: 16px;
}

.progress {
  margin-top: 16px;

  display: flex;
  flex-direction: column;
  gap: 4px;
}

.percent {
  text-align: right;
  font-size: 11px;
  opacity: 0.5;
}
</style>
