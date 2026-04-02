import { ref, readonly } from "vue";
import type { Config } from "../types/config";
import { useAPI } from "../composables/useApi";

const defaultConfig: Config = {
  icons: {
    light: true,
    dark: false,
    mat: false,
    monochrome: true,
  },
  network: {
    concurrency: 4,
  },
  repo: {
    base_url: "https://coloricons.github.io/icons/",
  },
};

const config = ref<Config>({ ...defaultConfig });
const loading = ref(false);
const error = ref<string | null>(null);

let fetchPromise: Promise<Config> | null = null;

const api = useAPI();

const mergeConfig = (remote: Partial<Config>): Config => {
  return {
    ...defaultConfig,
    ...remote,
    icons: {
      ...defaultConfig.icons,
      ...remote.icons,
    },
    network: {
      ...defaultConfig.network,
      ...remote.network,
    },
    repo: {
      ...defaultConfig.repo,
      ...remote.repo,
    },
  };
};

const getConfig = async (): Promise<Config> => {
  if (fetchPromise) return fetchPromise;

  loading.value = true;
  error.value = null;

  fetchPromise = (async () => {
    try {
      const remote = await api.loadConfig();
      const merged = mergeConfig(remote);
      config.value = merged;
      return merged;
    } catch (e: any) {
      error.value = e.message || "Failed to load config";
      throw e;
    } finally {
      loading.value = false;
      fetchPromise = null;
    }
  })();

  return fetchPromise;
};

export const useConfigStore = () => {
  return {
    config: readonly(config),
    loading: readonly(loading),
    error: readonly(error),
    getConfig,
  };
};
