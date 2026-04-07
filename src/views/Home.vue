<script setup lang="ts">
import { ref, onMounted, computed, reactive, watchEffect } from "vue";

import "@material/web/button/filled-button";
import "@material/web/progress/circular-progress";
import "@material/web/progress/linear-progress";
import "@material/web/textfield/outlined-text-field";
import "@material/web/select/filled-select";
import "@material/web/select/select-option";

import { useAPI } from "../composables/useApi";
import { ICONS } from "../constants";
import { useI18n } from "../composables/useI18n";
import type { Package } from "../types/package";

type Theme = "monet" | "light" | "dark" | "material";

interface UpdateInfo {
  updated: boolean;
  old_version: string;
  new_version: string;
}

const { t } = useI18n();
const api = useAPI();

const showUpdateCard = ref(false);
const update = ref<UpdateInfo | null>(null);

const packageCount = ref<number | null>(null);
const adaptedCount = ref<number | null>(null);
const packageList = ref<Package[]>([]);

const updating = ref(false);
const progress = ref(0);
const stage = ref("");

const searchQuery = ref("");
const currentTheme = ref<Theme>("monet");

const STAGE_LABEL: Record<string, string> = {
  fetch: t("update.fetch"),
  download: t("update.download"),
};

const sizeMap: Record<string, { col: number; row: number }> = {
  "1x1": { col: 1, row: 1 },
  "2x1": { col: 2, row: 1 },
  "1x2": { col: 1, row: 2 },
  "2x2": { col: 2, row: 2 },
};

const iconStatus = reactive<
  Record<
    string,
    {
      monet: Record<string, boolean>;
      light: Record<string, boolean>;
      dark: Record<string, boolean>;
      material: Record<string, boolean>;
      checked: boolean;
    }
  >
>({});

const getBaseUrl = (app: Package) => `/uxicons/${app.packageName}/`;

const getIconFileName = (size: string, type: string) => {
  const suffix = size === "1x1" ? "" : `_${size}`;
  const map: Record<string, string> = {
    monochrome: `monochrome${suffix}.png`,
    bg: `recbg${suffix}.png`,
    fg: `recfg${suffix}.png`,
    night: `rec_night${suffix}.png`,
    mat: `mat${suffix}.png`,
  };
  return map[type];
};

const getImgStyle = (sz: string) =>
  sz === "2x1" || sz === "1x1"
    ? { height: "100%", width: "auto" }
    : { width: "100%", height: "auto" };

const checkImage = (url: string) =>
  new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });

const checkSet = async (base: string, sizes: string[], type: string) => {
  const result: Record<string, boolean> = {};
  await Promise.all(
    sizes.map(async (sz) => {
      result[sz] = await checkImage(base + getIconFileName(sz, type));
    }),
  );
  return result;
};

const checkLight = async (base: string, sizes: string[]) => {
  const result: Record<string, boolean> = {};
  await Promise.all(
    sizes.map(async (sz) => {
      const bg = await checkImage(base + getIconFileName(sz, "bg"));
      const fg = await checkImage(base + getIconFileName(sz, "fg"));
      result[sz] = bg && fg;
    }),
  );
  return result;
};

const checkAppIcons = async (app: Package) => {
  const pkg = app.packageName;
  if (iconStatus[pkg]?.checked) return;

  const base = getBaseUrl(app);
  const sizes = ["2x1", "1x1", "2x2", "1x2"];

  const [monet, dark, material, light] = await Promise.all([
    checkSet(base, sizes, "monochrome"),
    checkSet(base, sizes, "night"),
    checkSet(base, sizes, "mat"),
    checkLight(base, sizes),
  ]);

  iconStatus[pkg] = { monet, dark, material, light, checked: true };
};

const filteredApps = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return packageList.value.filter(
    (app) =>
      app.label?.toLowerCase().includes(query) || app.packageName.toLowerCase().includes(query),
  );
});

const hasAnyIcons = (pkg: string) => {
  const s = iconStatus[pkg];
  if (!s) return false;
  return Object.values(s[currentTheme.value] || {}).some(Boolean);
};

const hasIconSize = (pkg: string, sz: string) =>
  iconStatus[pkg]?.[currentTheme.value]?.[sz] ?? false;

watchEffect(() => {
  filteredApps.value.forEach(checkAppIcons);
});

const formatDate = (iso: number) => new Date(iso).toLocaleString();

const handleThemeChange = (e: Event) => {
  currentTheme.value = (e.target as HTMLSelectElement).value as Theme;
};

const getInfo = async () => {
  try {
    const all = await api.getAllPackages();
    packageList.value = all;
    packageCount.value = all.length;
    adaptedCount.value = all.filter((i) => i.isAdapted).length;

    const res = await api.checkUpdate();
    if (res?.updated) {
      update.value = {
        updated: true,
        old_version: formatDate(res.old_generated_at * 1000),
        new_version: formatDate(res.new_generated_at * 1000),
      };
      showUpdateCard.value = true;
    }
  } catch (e) {
    console.error(e);
  }
};

const handleUpdate = async () => {
  updating.value = true;
  progress.value = 0;
  stage.value = t("update.preparing");

  try {
    await api.updateStream((msg) => {
      if (msg.type === "stage") {
        const s = msg.value as string;
        stage.value = STAGE_LABEL[s] ?? s;
      } else if (msg.type === "progress") {
        const v = msg.value as number;
        progress.value = Math.max(progress.value, Math.floor(v <= 1 ? v * 100 : v));
      } else if (msg.type === "done") {
        stage.value = t("update.done");
        progress.value = 100;
        setTimeout(() => (showUpdateCard.value = false), 2000);
        getInfo();
      } else if (msg.type === "error") {
        stage.value = t("update.failed");
      }
    });
  } catch (e) {
    console.error(e);
  } finally {
    updating.value = false;
  }
};

onMounted(getInfo);

const onBeforeEnter = (el: Element) => {
  const e = el as HTMLElement;
  e.style.height = "0";
  e.style.opacity = "0";
  e.style.overflow = "hidden";
};

const onEnter = (el: Element) => {
  const e = el as HTMLElement;
  void e.offsetHeight;
  e.style.height = `${el.scrollHeight}px`;
  e.style.opacity = "1";
};

const onAfterEnter = (el: Element) => {
  const e = el as HTMLElement;
  e.style.height = "auto";
  e.style.overflow = "";
};

const onBeforeLeave = (el: Element) => {
  const e = el as HTMLElement;
  e.style.height = `${el.scrollHeight}px`;
  e.style.opacity = "1";
  e.style.overflow = "hidden";
};

const onLeave = (el: Element) => {
  const e = el as HTMLElement;
  void e.offsetHeight;
  e.style.height = "0";
  e.style.opacity = "0";
};

const onAfterLeave = (el: Element) => {
  const e = el as HTMLElement;
  e.style.height = "";
  e.style.opacity = "";
};
</script>

<template>
  <div class="container">
    <!-- stats -->
    <section class="stats">
      <div class="stat-card">
        <span class="label">{{ t("label.packagesCount") }}</span>
        <span class="value" v-if="packageCount !== null">{{ packageCount }}</span>
        <span class="placeholder" v-else>--</span>
      </div>

      <div class="stat-card">
        <span class="label">{{ t("label.adaptedCount") }}</span>
        <span class="value" v-if="adaptedCount !== null">{{ adaptedCount }}</span>
        <span class="placeholder" v-else>--</span>
      </div>
    </section>

    <!-- update -->
    <transition
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @leave="onLeave"
      @after-leave="onAfterLeave"
    >
      <section v-if="showUpdateCard" class="update-card">
        <h2 class="title">{{ t("update.found") }}</h2>

        <div class="info">
          <div class="row">
            <span>{{ t("update.currentVersion") }}</span>
            <span>{{ update?.old_version }}</span>
          </div>
          <div class="row highlight">
            <span>{{ t("update.latestVersion") }}</span>
            <span>{{ update?.new_version }}</span>
          </div>
        </div>

        <div v-if="updating || stage === t('update.done')" class="progress">
          <div class="stage">{{ stage }}</div>
          <md-linear-progress :value="progress / 100" />
          <div class="percent">{{ progress }}%</div>
        </div>

        <md-filled-button
          v-if="!updating && stage !== t('update.done')"
          class="update-btn"
          @click="handleUpdate"
        >
          <md-icon slot="icon">
            <svg viewBox="0 0 24 24"><path :d="ICONS.update" /></svg>
          </md-icon>
          {{ t("update.updateNow") }}
        </md-filled-button>
      </section>
    </transition>

    <!-- toolbar -->
    <div class="toolbar">
      <div class="toolbar-inner">
        <input v-model="searchQuery" class="search" placeholder="输入关键字" />

        <div class="divider"></div>

        <md-filled-select class="select" @change="handleThemeChange">
          <md-select-option value="monet" selected
            ><div slot="headline">莫奈</div></md-select-option
          >
          <md-select-option value="light"><div slot="headline">亮色</div></md-select-option>
          <md-select-option value="dark"><div slot="headline">暗色</div></md-select-option>
          <md-select-option value="material"><div slot="headline">材质</div></md-select-option>
        </md-filled-select>
      </div>
    </div>

    <!-- list -->
    <main class="list">
      <div v-for="app in filteredApps" :key="app.packageName" class="item">
        <div class="meta">
          <span class="title">{{ app.label }}</span>
        </div>

        <div v-if="hasAnyIcons(app.packageName)" class="grid">
          <div
            v-for="sz in ['2x1', '1x1', '2x2', '1x2'].filter((sz) =>
              hasIconSize(app.packageName, sz),
            )"
            :key="sz"
            class="icon"
            :style="{
              gridColumn: `span ${sizeMap[sz].col}`,
              gridRow: `span ${sizeMap[sz].row}`,
            }"
          >
            <md-ripple />

            <!-- 统一渲染 -->
            <template v-if="currentTheme === 'light'">
              <img
                :src="getBaseUrl(app) + getIconFileName(sz, 'bg')"
                class="img"
                :style="getImgStyle(sz)"
              />
              <img
                :src="getBaseUrl(app) + getIconFileName(sz, 'fg')"
                class="img fg"
                :style="getImgStyle(sz)"
              />
            </template>

            <img
              v-else
              :src="
                getBaseUrl(app) +
                getIconFileName(
                  sz,
                  currentTheme === 'monet'
                    ? 'monochrome'
                    : currentTheme === 'dark'
                      ? 'night'
                      : 'mat',
                )
              "
              class="img dark"
              :style="getImgStyle(sz)"
            />
          </div>
        </div>

        <div v-else class="empty">暂未适配</div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.container {
  width: 100%;
  padding-top: 24px;

  --scale: 0.21;
  --size: calc(240px * var(--scale));
  --gap: 12px;
}

/* stats */
.stats {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.stat-card {
  flex: 1;
  padding: 20px;
  border-radius: 16px;
  background: var(--md-sys-color-surface-container);
  display: flex;
  flex-direction: column;
}

.stat-card .value {
  margin-top: 4px;
  font-size: 20px;
  font-weight: 700;
}

/* update */
.update-card {
  margin-top: 8px;
  padding: 20px;
  border-radius: 16px;
  background: var(--md-sys-color-secondary-container);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;

  transition:
    height 0.4s cubic-bezier(0.3, 0.8, 0.3, 1),
    opacity 0.3s;
}

.update-card .title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.update-card .info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.update-card .row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  opacity: 0.85;
}

.update-card .highlight span:last-child {
  color: var(--md-sys-color-primary);
  font-weight: 600;
}

.update-card .update-btn {
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
  font-size: 11px;
  text-align: right;
  opacity: 0.5;
}

/* toolbar */
.toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 16px;
  background: var(--md-sys-color-surface-container-lower);
  display: flex;
  justify-content: center;
}

.toolbar-inner {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 900px;
  height: 50px;

  border-radius: 28px;
  background: var(--md-sys-color-surface-container-high);
  overflow: hidden;
}

.search {
  flex: 1;
  border: none;
  outline: none;
  padding: 0 16px;
  background: transparent;
  font-size: 16px;
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--md-sys-color-outline-variant);
}

.select {
  width: 120px;
}

/* list */
.list {
  display: flex;
  flex-direction: column;
}

.item {
  padding: 16px 12px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.meta {
  margin-bottom: 8px;
}

/* grid */
.grid {
  display: grid;
  grid-template-columns: repeat(3, var(--size));
  grid-auto-rows: var(--size);
  gap: var(--gap);
}

.icon {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: var(--md-sys-color-surface-variant);

  display: flex;
  align-items: center;
  justify-content: center;
}

.img {
  width: 100%;
  height: 100%;
}

.img.fg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.dark {
  background: radial-gradient(#292929, #202020);
}

.empty {
  font-size: 13px;
  opacity: 0.6;
  font-style: italic;
}
</style>
