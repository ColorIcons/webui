<script setup lang="ts">
import {
  ref,
  onMounted,
  onUnmounted,
  computed,
  shallowRef,
  type ComponentPublicInstance,
} from "vue";

import "@material/web/textfield/outlined-text-field";
import "@material/web/select/filled-select";
import "@material/web/select/select-option";

import { useAPI } from "../composables/useApi";
import { useI18n } from "../composables/useI18n";
import type { Package, Theme } from "../types/package";
import UpdateCard from "../components/UpdateCard.vue";
import AppIconGrid from "../components/AppIconGrid.vue";
import AppToolbar from "../components/AppToolbar.vue";
import type { UpdateInfoRes } from "../types/api";

const { t } = useI18n();
const api = useAPI();

const showUpdateCard = ref(false);
const update = ref<UpdateInfoRes>({
  updated: false,
  old_generated_at: 0,
  new_generated_at: 0,
});

const packageCount = ref<number | null>(null);
const adaptedCount = ref<number | null>(null);
const packageList = ref<Package[]>([]);

const searchQuery = ref("");
const currentTheme = ref<Theme>("monochrome");

const sizeMap: Record<string, { col: number; row: number }> = {
  "1x1": { col: 1, row: 1 },
  "2x1": { col: 2, row: 1 },
  "1x2": { col: 1, row: 2 },
  "2x2": { col: 2, row: 2 },
};

const MAX_CONCURRENT = 6;
let running = 0;
const queue: (() => void)[] = [];

const runTask = async (task: () => Promise<void>) => {
  if (running >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }

  running++;

  try {
    await task();
  } finally {
    running--;
    queue.shift()?.();
  }
};

interface IconState {
  monochrome: Record<string, boolean>;
  light: Record<string, boolean>;
  dark: Record<string, boolean>;
  material: Record<string, boolean>;
  checked: boolean;
}

const iconStatus = shallowRef<Record<string, IconState>>({});

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

const checkImage = (url: string) =>
  new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });

const getImgStyle = (sz: string) =>
  sz === "2x1" || sz === "1x1"
    ? { height: "100%", width: "auto" }
    : { width: "100%", height: "auto" };

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
  if (iconStatus.value[pkg]?.checked) return;

  const cacheKey = `icon-status:${pkg}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      iconStatus.value[pkg] = JSON.parse(cached);
      iconStatus.value = { ...iconStatus.value };
      return;
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  const base = getBaseUrl(app);
  const sizes = ["2x1", "1x1", "2x2", "1x2"];

  const [monochrome, dark, material, light] = await Promise.all([
    checkSet(base, sizes, "monochrome"),
    checkSet(base, sizes, "night"),
    checkSet(base, sizes, "mat"),
    checkLight(base, sizes),
  ]);

  const result: IconState = { monochrome, dark, material, light, checked: true };

  iconStatus.value[pkg] = result;
  iconStatus.value = { ...iconStatus.value };

  localStorage.setItem(cacheKey, JSON.stringify(result));
};

const observed = new Set<string>();

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;

    const pkg = (entry.target as HTMLElement).dataset.pkg!;
    if (observed.has(pkg)) continue;

    observed.add(pkg);

    const app = packageList.value.find((a) => a.packageName === pkg);
    if (app) runTask(() => checkAppIcons(app));
  }
});

const observeItem = (el: Element | ComponentPublicInstance | null, app: Package) => {
  if (!el || !(el instanceof Element)) return;

  const pkg = app.packageName;
  const node = el as HTMLElement;

  node.dataset.pkg = pkg;

  if (!node.dataset.observed) {
    observer.observe(node);
    node.dataset.observed = "1";
  }
};

onUnmounted(() => {
  observer.disconnect();
});

const collator = new Intl.Collator("zh-Hans-u-co-pinyin");

const filteredApps = computed(() => {
  const query = searchQuery.value.toLowerCase();

  return packageList.value
    .filter(
      (app) =>
        app.label?.toLowerCase().includes(query) || app.packageName.toLowerCase().includes(query),
    )
    .sort((a, b) => collator.compare(a.label || "", b.label || ""));
});

const hasAnyIcons = (pkg: string) => {
  const s = iconStatus.value[pkg];
  if (!s) return false;
  return Object.values(s[currentTheme.value] || {}).some(Boolean);
};

const hasIconSize = (pkg: string, sz: string) =>
  iconStatus.value[pkg]?.[currentTheme.value]?.[sz] ?? false;

const handleUpdateEvent = () => {
  iconStatus.value = {};

  Object.keys(localStorage)
    .filter((k) => k.startsWith("icon-status:"))
    .forEach((k) => localStorage.removeItem(k));

  observed.clear();

  getInfo();
};

const getInfo = async () => {
  const packageRes = await api.getAllPackages();
  if (!packageRes.ok) {
    console.error(packageRes.error);
    return;
  }
  packageList.value = packageRes.data;
  packageCount.value = packageRes.data.length;
  adaptedCount.value = packageRes.data.filter((i) => i.isAdapted).length;

  const checkRes = await api.checkUpdate();
  if (!checkRes.ok) {
    console.error(checkRes.error);
    return;
  }
  update.value = checkRes.data;
  showUpdateCard.value = checkRes.data.updated;
};

onMounted(getInfo);
</script>

<template>
  <div class="container">
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

    <UpdateCard v-model:show="showUpdateCard" :data="update" @update="handleUpdateEvent" />

    <AppToolbar v-model="searchQuery" v-model:theme="currentTheme" />

    <main class="list">
      <div
        v-for="app in filteredApps"
        :key="app.packageName"
        class="item"
        :ref="(el) => observeItem(el, app)"
      >
        <div class="meta">
          <span class="title">{{ app.label }}</span>
        </div>

        <AppIconGrid
          v-if="hasAnyIcons(app.packageName)"
          :app="app"
          :theme="currentTheme"
          :size-map="sizeMap"
          :has-icon-size="hasIconSize"
          :get-base-url="getBaseUrl"
          :get-icon-file-name="getIconFileName"
          :get-img-style="getImgStyle"
        />

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

.empty {
  font-size: 13px;
  opacity: 0.6;
  font-style: italic;
}
</style>
