<script setup lang="ts">
import type { Package, Theme } from "../types/package";

interface Props {
  app: Package;
  theme: Theme;
  sizeMap: Record<string, { col: number; row: number }>;
  hasIconSize: (pkg: string, sz: string) => boolean;
  getBaseUrl: (app: Package) => string;
  getIconFileName: (sz: string, type: string) => string;
  getImgStyle: (sz: string) => Record<string, string>;
}

const props = defineProps<Props>();

const sizes = ["2x1", "1x1", "2x2", "1x2"];
</script>

<template>
  <div class="grid">
    <div
      v-for="sz in sizes.filter((sz) => hasIconSize(app.packageName, sz))"
      :key="sz"
      class="icon"
      :style="{
        gridColumn: `span ${sizeMap[sz].col}`,
        gridRow: `span ${sizeMap[sz].row}`,
      }"
    >
      <md-ripple />

      <!-- light -->
      <template v-if="theme === 'light'">
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

      <!-- monet -->
      <img
        v-else-if="theme === 'monochrome'"
        :src="getBaseUrl(app) + getIconFileName(sz, 'monochrome')"
        class="img monet"
        :style="getImgStyle(sz)"
      />

      <!-- dark -->
      <img
        v-else-if="theme === 'dark'"
        :src="getBaseUrl(app) + getIconFileName(sz, 'night')"
        class="img dark"
        :style="getImgStyle(sz)"
      />

      <!-- material -->
      <img
        v-else-if="theme === 'material'"
        :src="getBaseUrl(app) + getIconFileName(sz, 'mat')"
        class="img"
        :style="getImgStyle(sz)"
      />
    </div>
  </div>
</template>

<style scoped>
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

.icon .monet {
  background: var(--md-sys-color-secondary-container);
}

.icon .dark {
  background: radial-gradient(#292929, #202020);
}
</style>
