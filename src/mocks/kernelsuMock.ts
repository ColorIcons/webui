import type { Config } from "../types/config";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mockConfig: Config = {
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
    base_url: "https://icons.immort.top/",
  },
};

const mockPackages = [
  { package_name: "com.tencent.mm", is_adapted: true },
  { package_name: "com.alibaba.android.rimet", is_adapted: false },
  { package_name: "cn.com.chsi.chsiapp", is_adapted: true },
];

export const mockExec = async (cmd: string) => {
  await sleep(120);

  if (cmd.includes("config get")) {
    return ok(JSON.stringify(mockConfig));
  }

  if (cmd.includes("config set")) {
    return ok("");
  }

  if (cmd.includes("package list")) {
    return ok(JSON.stringify(mockPackages));
  }

  if (cmd.includes("find")) {
    return ok("12");
  }

  if (cmd.includes("pm list packages")) {
    return ok("87");
  }

  return ok("");
};

function ok(stdout: string) {
  return { errno: 0, stdout, stderr: "" };
}

export const mockSpawn = (command: string, args: string[] = []) => {
  let stdoutCb: ((data: string) => void) | null = null;
  let stderrCb: ((data: string) => void) | null = null;
  let exitCb: ((code: number) => void) | null = null;
  let errorCb: ((err: any) => void) | null = null;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const isCheck = args.includes("check");
  const isUpgrade = args.includes("upgrade");

  const start = async () => {
    await sleep(50);

    try {
      /* ---------------- checkUpdate ---------------- */
      if (isCheck) {
        const result = {
          updated: true,
          old_generated_at: 1775130396,
          new_generated_at: 1775130400,
        };

        stdoutCb?.(JSON.stringify(result));
        await sleep(10);
        exitCb?.(0);
        return;
      }

      /* ---------------- updateStream ---------------- */
      if (isUpgrade) {
        const emit = async (o: any, delay = 200) => {
          await sleep(delay);
          stdoutCb?.(JSON.stringify(o) + "\n");
        };

        await emit({ type: "stage", value: "fetch", message: "Fetching index.json" });
        await emit({ type: "progress", value: 0.3 });
        await emit({ type: "progress", value: 0.6 });
        await emit({
          type: "done",
          message: "Upgrade complete",
          packages_downloaded: 3,
        });

        exitCb?.(0);
        return;
      }

      /* ---------------- fallback ---------------- */
      stdoutCb?.("");
      exitCb?.(0);
    } catch (e) {
      errorCb?.(e);
    }
  };

  setTimeout(start, 0);

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
      if (event === "error") errorCb = cb;
    },
  };
};

export const mockGetPackagesInfo = (packages: string[]) => {
  return packages.map((pkg, i) => ({
    packageName: pkg,
    versionName: "1.0." + i,
    versionCode: 100 + i,
    appLabel: pkg.split(".").pop() || pkg,
    isSystem: false,
    uid: 10000 + i,
  }));
};
