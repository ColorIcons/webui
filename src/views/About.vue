<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAPI } from "../composables/useApi";
import { useI18n } from "../composables/useI18n";
import { ICONS } from "../constants";
import "@material/web/button/filled-button";
import "@material/web/ripple/ripple.js";

const { t } = useI18n();

const api = useAPI();

const version = ref("");
const name = ref("");

onMounted(async () => {
  const res = await api.getVersion();
  version.value = res.version;
  name.value = res.name;
});

const toGithub = () => {
  api.openLink("https://github.com/ColorIcons/module");
};
</script>

<template>
  <div class="container">
    <div class="module-info">
      <h4 class="title">{{ name }}</h4>
      <div class="version" id="version">
        <md-ripple />
        {{ version }}
      </div>
    </div>
    <md-filled-button @click="toGithub" class="github-btn">
      <md-icon slot="icon">
        <svg viewBox="0 0 24 24">
          <path :d="ICONS.github" />
        </svg>
      </md-icon>
      {{ t("about.github") }}
    </md-filled-button>
  </div>
</template>

<style scoped>
.container {
  padding-top: 24px;
}

.module-info {
  background: var(--md-sys-color-surface-container);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin-bottom: 20px;
}

.title {
  font-weight: 400;
  line-height: 32px;
  font-size: 2rem;
  color: var(--md-sys-color-on-surface-container);
}

.version {
  margin-top: 20px;
  background: var(--md-sys-color-surface-container-high);
  padding: 4px 12px;
  border-radius: 16px;
  cursor: default;
  position: relative;
  overflow: hidden;
}

.github-btn {
  width: 100%;
}
</style>
