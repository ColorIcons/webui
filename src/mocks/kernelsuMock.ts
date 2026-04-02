import type { Config } from "../types/config";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mockConfig: Config = {
  icons: {
    light: false,
    dark: false,
    mat: false,
    monochrome: false,
  },
  network: {
    concurrency: 0,
  },
  repo: {
    base_url: "",
  },
};

const mockUpdate = {
  updated: true,
  old_generated_at: 1775130396,
  new_generated_at: 1775130400,
};

export const mockExec = async (cmd: string) => {
  await sleep(200);

  if (cmd.includes("config get")) {
    return { errno: 0, stdout: JSON.stringify(mockConfig), stderr: "" };
  }

  if (cmd.includes("check")) {
    return { errno: 0, stdout: JSON.stringify(mockUpdate), stderr: "" };
  }

  if (cmd.includes("pm")) {
    return { errno: 0, stdout: "1", stderr: "" };
  }

  return { errno: 0, stdout: "", stderr: "" };
};

export const mockSpawn = () => {
  let stdoutCb: any;
  let stderrCb: any;
  let exitCb: any;

  console.log(stderrCb);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  (async () => {
    const emit = async (o: any, delay = 80) => {
      await sleep(delay);
      stdoutCb?.(JSON.stringify(o) + "\n");
    };

    /* ---------- sequence ---------- */
    const events = [
      { message: "Fetching index.json", type: "stage", value: "fetch" },
      { message: "Index version: 1", type: "info", value: "version" },
      { file: "icons-pebble", type: "stage", value: "download_global" },
      {
        type: "stage",
        url: "https://coloricons.github.io/icons/global/icons-pebble",
        value: "download",
      },
      { file: "icons-monorectangle", type: "stage", value: "download_global" },
      {
        type: "stage",
        url: "https://coloricons.github.io/icons/global/icons-monorectangle",
        value: "download",
      },
      { file: "icons-rectangle", type: "stage", value: "download_global" },
      {
        type: "stage",
        url: "https://coloricons.github.io/icons/global/icons-rectangle",
        value: "download",
      },
      { file: "icons-daylight", type: "stage", value: "download_global" },
      {
        type: "stage",
        url: "https://coloricons.github.io/icons/global/icons-daylight",
        value: "download",
      },
      { file: "icons-nightshadow", type: "stage", value: "download_global" },
      {
        type: "stage",
        url: "https://coloricons.github.io/icons/global/icons-nightshadow",
        value: "download",
      },
      { file: "icons-darkrectangle", type: "stage", value: "download_global" },
      {
        type: "stage",
        url: "https://coloricons.github.io/icons/global/icons-darkrectangle",
        value: "download",
      },
      { file: "icons-meterial", type: "stage", value: "download_global" },
      {
        type: "stage",
        url: "https://coloricons.github.io/icons/global/icons-meterial",
        value: "download",
      },
      {
        file: "monochrome.png",
        package: "cn.com.bmac.nfc",
        type: "stage",
        value: "download_package",
      },
      {
        type: "stage",
        url: "https://coloricons.github.io/icons/packages/cn.com.bmac.nfc/monochrome.png",
        value: "download",
      },
      {
        file: "monochrome.png",
        package: "cn.com.langeasy.LangEasyLexis",
        type: "stage",
        value: "download_package",
      },
      {
        type: "stage",
        url: "https://coloricons.github.io/icons/packages/cn.com.langeasy.LangEasyLexis/monochrome.png",
        value: "download",
      },
      {
        file: "monochrome.png",
        package: "cn.com.chsi.chsiapp",
        type: "stage",
        value: "download_package",
      },
      {
        type: "stage",
        url: "https://coloricons.github.io/icons/packages/cn.com.chsi.chsiapp/monochrome.png",
        value: "download",
      },
      { message: "Downloaded: /data/adb/ColorOSIconsPatch/runtime/icons-pebble", type: "info" },
      { type: "progress", value: 0.1 },
      {
        message: "Downloaded: /data/adb/ColorOSIconsPatch/runtime/icons-monorectangle",
        type: "info",
      },
      { type: "progress", value: 0.2 },
      { message: "Downloaded: /data/adb/ColorOSIconsPatch/runtime/icons-rectangle", type: "info" },
      { type: "progress", value: 0.3 },
      { message: "Downloaded: /data/adb/ColorOSIconsPatch/runtime/icons-daylight", type: "info" },
      { type: "progress", value: 0.4 },
      {
        message: "Downloaded: /data/adb/ColorOSIconsPatch/runtime/icons-nightshadow",
        type: "info",
      },
      { type: "progress", value: 0.5 },
      { message: "Downloaded: /data/adb/ColorOSIconsPatch/runtime/icons-meterial", type: "info" },
      { type: "progress", value: 0.6 },
      {
        message:
          "Downloaded: /data/adb/ColorOSIconsPatch/runtime/cn.com.langeasy.LangEasyLexis/monochrome.png",
        type: "info",
      },
      { type: "progress", value: 0.7 },
      {
        message: "Downloaded: /data/adb/ColorOSIconsPatch/runtime/icons-darkrectangle",
        type: "info",
      },
      { type: "progress", value: 0.8 },
      {
        message:
          "Downloaded: /data/adb/ColorOSIconsPatch/runtime/cn.com.chsi.chsiapp/monochrome.png",
        type: "info",
      },
      { type: "progress", value: 0.9 },
      {
        message: "Downloaded: /data/adb/ColorOSIconsPatch/runtime/cn.com.bmac.nfc/monochrome.png",
        type: "info",
      },
      { type: "progress", value: 1.0 },
      { message: "index.json updated", type: "info" },
      { message: "Cleaned temporary files", type: "info" },
      { message: "Upgrade complete", type: "done" },
    ];

    for (const e of events) {
      await emit(e);
      await sleep(1000);
    }

    exitCb?.(0);
  })();

  return {
    stdout: {
      on(event: "data", cb: any) {
        if (event === "data") stdoutCb = cb;
      },
    },
    stderr: {
      on(event: "data", cb: any) {
        if (event === "data") stderrCb = cb;
      },
    },
    on(event: string, cb: any) {
      if (event === "exit") exitCb = cb;
    },
  };
};
