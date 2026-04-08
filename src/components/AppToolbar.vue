<script setup lang="ts">
import type { Theme } from "../types/package";

const modelValue = defineModel();
const theme = defineModel<Theme>("theme");

const onInput = (e: Event) => {
  modelValue.value = (e.target as HTMLInputElement).value;
};

const onThemeChange = (e: Event) => {
  theme.value = (e.target as HTMLSelectElement).value as Theme;
};
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-inner">
      <input :value="modelValue" @input="onInput" class="search" placeholder="输入关键字" />

      <div class="divider"></div>

      <md-filled-select class="select" @change="onThemeChange">
        <md-select-option value="monochrome" selected
          ><div slot="headline">莫奈</div></md-select-option
        >
        <md-select-option value="light"><div slot="headline">亮色</div></md-select-option>
        <md-select-option value="dark"><div slot="headline">暗色</div></md-select-option>
        <md-select-option value="material"><div slot="headline">材质</div></md-select-option>
      </md-filled-select>
    </div>
  </div>
</template>

<style scoped>
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
</style>
