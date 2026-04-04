import { ref } from "vue";
import type { Config } from "../types/config";
import { useAPI } from "../composables/useApi";
import { DEFAULT_CONFIG } from "../constants";

const config = ref<Config>(structuredClone(DEFAULT_CONFIG));
const loading = ref(false);
const error = ref<string | null>(null);
const initialized = ref(false);

let fetchPromise: Promise<Config> | null = null;

const api = useAPI();

const mergeConfig = (remote: Partial<Config>): Config => ({
  ...DEFAULT_CONFIG,
  ...remote,
  icons: { ...DEFAULT_CONFIG.icons, ...remote.icons },
  network: { ...DEFAULT_CONFIG.network, ...remote.network },
  repo: { ...DEFAULT_CONFIG.repo, ...remote.repo },
});

const getConfig = async (force = false): Promise<Config> => {
  if (!force && initialized.value) return config.value;
  if (!force && fetchPromise) return fetchPromise;

  loading.value = true;
  error.value = null;

  fetchPromise = api
    .loadConfig()
    .then((remote) => {
      const merged = mergeConfig(remote);
      config.value = merged;
      initialized.value = true;
      return merged;
    })
    .catch((e: unknown) => {
      error.value = e instanceof Error ? e.message : "load failed";
      throw e;
    })
    .finally(() => {
      loading.value = false;
      fetchPromise = null;
    });

  return fetchPromise;
};

const setConfig = async (options: {
  baseUrl?: string;
  concurrency?: number;
  light?: boolean;
  dark?: boolean;
  mat?: boolean;
  monochrome?: boolean;
}) => {
  loading.value = true;
  error.value = null;

  try {
    await api.setConfig(options);

    // 同步 store
    if (options.baseUrl !== undefined) {
      config.value.repo.base_url = options.baseUrl;
    }
    if (options.concurrency !== undefined) {
      config.value.network.concurrency = options.concurrency;
    }
    if (options.light !== undefined) config.value.icons.light = options.light;
    if (options.dark !== undefined) config.value.icons.dark = options.dark;
    if (options.mat !== undefined) config.value.icons.mat = options.mat;
    if (options.monochrome !== undefined) config.value.icons.monochrome = options.monochrome;
  } finally {
    loading.value = false;
  }
};

export const useConfigStore = () => ({
  config,
  loading,
  error,
  initialized,
  getConfig,
  setConfig,
});
