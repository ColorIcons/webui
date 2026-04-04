import type { Config } from "../types/config";

export const PATHS = {
  VERSION: "0.2.1",
  CONFIG: "/data/adb/ColorOSIconsPatch/config.toml",
  MODULE_DIR: "/data/adb/modules/ColorOSIconsPatch",
  TARGET_DIR: `/data/adb/modules/ColorOSIconsPatch/uxicons/`,
  CIP_BIN: `/data/adb/modules/ColorOSIconsPatch/cip`,
};

export const DEFAULT_CONFIG: Config = {
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

export * from "./icons";
