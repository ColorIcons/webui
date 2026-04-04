<script setup lang="ts">
import { ref, onBeforeMount, computed, toRaw } from "vue";
import { useI18n } from "../composables/useI18n";
import { useConfigStore } from "../stores/configStore";
import type { Config } from "../types/config";

import "@material/web/icon/icon.js";
import "@material/web/select/outlined-select.js";
import "@material/web/select/select-option.js";
import "@material/web/fab/fab.js";

import { DEFAULT_CONFIG, ICONS } from "../constants";

const { t } = useI18n();
const { getConfig, setConfig } = useConfigStore();

const config = ref<Config>(DEFAULT_CONFIG);
const original = ref<Config>(DEFAULT_CONFIG);
const saving = ref(false);

const channelOptions = [
  { label: "GitHub", value: "https://coloricons.github.io/icons/" },
  { label: "Cloudflare", value: "https://icons.immort.top/" },
];

interface IconThemeOption {
  key: keyof Config["icons"];
  label: string;
  icon: string;
}

const iconThemeOptions = computed<IconThemeOption[]>(() => [
  { key: "light", label: t("settings.iconThemes.light"), icon: ICONS.light },
  { key: "dark", label: t("settings.iconThemes.dark"), icon: ICONS.dark },
  { key: "mat", label: t("settings.iconThemes.mat"), icon: ICONS.mat },
  { key: "monochrome", label: t("settings.iconThemes.monochrome"), icon: ICONS.mono },
]);

onBeforeMount(async () => {
  const res = await getConfig();
  config.value = structuredClone(toRaw(res));
  original.value = res;
});

const handleChannelChange = (e: Event) => {
  if (!config.value) return;
  config.value.repo.base_url = (e.target as HTMLSelectElement).value;
};

const toggleTheme = (key: keyof Config["icons"]) => {
  config.value.icons[key] = !config.value.icons[key];
};

const isDirty = computed(() => {
  if (!config.value || !original.value) return false;
  return JSON.stringify(config.value) !== JSON.stringify(original.value);
});

const save = async () => {
  if (saving.value || !isDirty.value) return;
  if (!config.value || !original.value) return;

  try {
    saving.value = true;

    const payload: any = {};

    if (config.value.repo.base_url !== original.value.repo.base_url) {
      payload.baseUrl = config.value.repo.base_url;
    }

    if (config.value.network.concurrency !== original.value.network.concurrency) {
      payload.concurrency = config.value.network.concurrency;
    }

    (["light", "dark", "mat", "monochrome"] as const).forEach((k) => {
      if (config.value.icons[k] !== original.value.icons[k]) {
        payload[k] = config.value.icons[k];
      }
    });

    if (!Object.keys(payload).length) return;

    await setConfig(payload);

    original.value = structuredClone(toRaw(config.value));

    toast.value.text = t("settings.saved") || "Saved successfully";
    toast.value.show = true;

    setTimeout(() => {
      toast.value.show = false;
    }, 1500);
  } finally {
    saving.value = false;
  }
};

const toast = ref({
  show: false,
  text: "",
});
</script>

<template>
  <div class="settings-page">
    <div class="settings-panel">
      <section class="settings-section">
        <div class="settings-section__header">
          <div class="settings-section__icon">
            <md-icon>
              <svg viewBox="0 0 24 24"><path :d="ICONS.channel" /></svg>
            </md-icon>
          </div>
          <div class="settings-section__meta">
            <span class="settings-section__title"> {{ t("settings.channel") }} </span>
            <span class="settings-section__desc"> {{ t("settings.channelDesc") }} </span>
          </div>
        </div>
        <md-outlined-select
          class="settings-section__field"
          :label="t('settings.channel')"
          :value="config.repo.base_url"
          @change="handleChannelChange"
        >
          <md-select-option v-for="item in channelOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </md-select-option>
          <md-icon slot="leading-icon">
            <svg viewBox="0 0 24 24"><path :d="ICONS.channel" /></svg>
          </md-icon>
        </md-outlined-select>
      </section>
      <section class="settings-section">
        <div class="settings-section__header">
          <div class="settings-section__icon">
            <md-icon>
              <svg viewBox="0 0 24 24"><path :d="ICONS.iconStyles" /></svg>
            </md-icon>
          </div>
          <div class="settings-section__meta">
            <span class="settings-section__title">{{ t("settings.iconStyle") }}</span>
            <span class="settings-section__desc">{{ t("settings.iconStyleDesc") }}</span>
          </div>
        </div>
        <div class="icon-grid">
          <button
            v-for="item in iconThemeOptions"
            :key="item.key"
            class="icon-tile"
            :class="{ 'is-active': config.icons[item.key] }"
            @click="toggleTheme(item.key)"
          >
            <md-ripple />
            <div class="icon-tile__top">
              <div class="icon-tile__icon">
                <md-icon style="width: 16px">
                  <svg viewBox="0 0 24 24"><path :d="item.icon" /></svg>
                </md-icon>
              </div>
            </div>
            <div class="icon-tile__bottom">
              <span class="icon-tile__label"> {{ item.label }} </span>
            </div>
          </button>
        </div>
      </section>
    </div>
    <md-fab
      v-if="isDirty"
      class="settings-fab"
      :label="t('settings.save')"
      :class="{ 'is-disabled': saving }"
      @click="save"
    >
      <md-icon slot="icon" style="margin-right: 8px">
        <svg viewBox="0 0 24 24"><path :d="ICONS.save" /></svg>
      </md-icon>
    </md-fab>
    <div v-if="toast.show" class="toast">
      {{ toast.text }}
    </div>
  </div>
</template>
<style scoped>
.settings-page {
  position: relative;
  width: 100%;
  height: 100%;
}
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 96px;
  height: 100%;
  overflow-y: auto;
}
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border-radius: 20px;
  background: var(--md-sys-color-surface-container);
}
.settings-section__header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.settings-section__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}
.settings-section__meta {
  display: flex;
  flex-direction: column;
}
.settings-section__title {
  font-size: 16px;
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
}
.settings-section__desc {
  font-size: 12px;
  color: var(--md-sys-color-on-surface-variant);
}
.settings-section__field {
  width: 100%;
  --md-outlined-text-field-container-shape: 16px;
}
.icon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.icon-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  border: none;
  text-align: left;
  cursor: pointer;
  background: var(--md-sys-color-surface-container-low);
  transition:
    transform 0.2s,
    background-color 0.2s;
}
.icon-tile:active {
  transform: scale(0.98);
}
.icon-tile.is-active {
  background: var(--md-sys-color-secondary-container);
}
.icon-tile__top {
  pointer-events: none;
}
.icon-tile__icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}
.icon-tile.is-active .icon-tile__icon {
  background: var(--md-sys-color-secondary);
  color: var(--md-sys-color-on-secondary);
}
.icon-tile__bottom {
  pointer-events: none;
}
.icon-tile__label {
  font-size: 15px;
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
}
.settings-fab {
  position: absolute;
  right: 0;
  bottom: 20px;
}

.settings-fab.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.toast {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  padding: 10px 16px;
  border-radius: 12px;

  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);

  font-size: 14px;
  box-shadow: var(--md-sys-elevation-level3);

  opacity: 0;
  animation: toast-in-out 2s forwards;
}

@keyframes toast-in-out {
  0% {
    opacity: 0;
    transform: translate(-50%, 8px);
  }
  10% {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  90% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, 8px);
  }
}
</style>
