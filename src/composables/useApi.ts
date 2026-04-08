import { PATHS } from "../constants";
import type { UpdateInfoRes } from "../types/api";
import type { Config } from "../types/config";
import type { Package } from "../types/package";

interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
}

interface ExecResult {
  errno: number;
  stdout: string;
  stderr: string;
}

interface Module {
  moduleDir: string;
  action: boolean;
  author: string;
  enabled: boolean;
  name: string;
  version: string;
  description: string;
  versionCode: string;
  update: boolean;
  web: boolean;
  id: string;
  mount: string;
  remove: boolean;
}

interface PackagesInfo {
  packageName: string;
  versionName: string;
  versionCode: number;
  appLabel: string;
  isSystem: boolean;
  uid: number;
}

type Result<T, E = string> = { ok: true; data: T } | { ok: false; error: E };

const ok = <T>(data: T): Result<T> => ({ ok: true, data });

const err = <E = string>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

const wrap = async <T>(fn: () => Promise<T>): Promise<Result<T>> => {
  try {
    return ok(await fn());
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
};

type KsuExec = (cmd: string, options?: ExecOptions) => Promise<ExecResult>;

interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
}

interface Stdio {
  on(event: "data", callback: (data: string) => void): void;
}

interface ChildProcess {
  stdout: Stdio;
  stderr: Stdio;
  on(event: "exit", callback: (code: number) => void): void;
  on(event: "error", callback: (err: any) => void): void;
}

type KsuSpawn = (command: string, args?: string[], options?: SpawnOptions) => ChildProcess;

export type UpdateEvent =
  | { type: "stage"; value: string; message: string }
  | { type: "progress"; value: number }
  | { type: "done"; message: string; packages_downloaded: number }
  | { type: "log"; message: string }
  | { type: "error"; message: string }
  | { type: "exit" };

type GetPackagesInfo = (packages: string[]) => PackagesInfo[];
type ModuleInfo = () => string;

let ksuExec: KsuExec | null = null;
let ksuSpawn: KsuSpawn | null = null;
let getPackagesInfo: GetPackagesInfo | null = null;
let moduleInfo: ModuleInfo | null = null;
let initPromise: Promise<void> | null = null;

const initKernelSU = async () => {
  if (ksuExec && ksuSpawn) return;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        if (import.meta.env.DEV) {
          console.warn("[KernelSU] DEV MODE → using MOCK");

          const mock = await import("../mocks/kernelsuMock");

          ksuExec = mock.mockExec;
          ksuSpawn = mock.mockSpawn;
          getPackagesInfo = mock.mockGetPackagesInfo;
          return;
        }

        const mod = await import("kernelsu");
        const api = (mod as any).default ?? mod;

        ksuExec = api.exec ?? null;
        ksuSpawn = api.spawn ?? null;
        getPackagesInfo = api.getPackagesInfo ?? null;
        moduleInfo = api.moduleInfo ?? null;

        if (!ksuExec || !ksuSpawn) {
          throw new Error("KernelSU API incomplete");
        }

        console.log("[KernelSU] loaded");
      } catch (e) {
        initPromise = null;

        console.error("[KernelSU] init failed ", e);
        throw e;
      }
    })();
  }

  return initPromise;
};

export function useAPI() {
  const ensureExec = async (): Promise<KsuExec> => {
    await initKernelSU();
    if (ksuExec) return ksuExec;
    throw new Error("KernelSU exec not available");
  };

  const ensureSpawn = async (): Promise<KsuSpawn> => {
    await initKernelSU();
    if (ksuSpawn) return ksuSpawn;
    throw new Error("KernelSU spawn not available");
  };

  const execOrThrow = async (cmd: string, options?: ExecOptions) => {
    const exec = await ensureExec();
    const { errno, stdout, stderr } = await exec(cmd, options);

    if (errno !== 0) {
      throw new Error(`[exec] failed (${errno}): ${cmd}\n${stderr?.trim() || "unknown error"}`);
    }

    return stdout.trim();
  };

  // const safeJSON = <T>(input: string, fallback: T): T => {
  //   try {
  //     return JSON.parse(input);
  //   } catch {
  //     return fallback;
  //   }
  // };

  const getAllPackages = async (): Promise<Result<Package[]>> => {
    return wrap(async () => {
      const stdout = await execOrThrow(`${PATHS.CIP_BIN} package list --json`);

      const packages = JSON.parse(stdout) as {
        package_name: string;
        is_adapted: boolean;
      }[];

      const map = new Map(packages.map((i) => [i.package_name, i.is_adapted]));

      const infos = getPackagesInfo?.([...map.keys()]) ?? [];

      return infos.map((info) => ({
        label: info.appLabel || info.packageName,
        packageName: info.packageName,
        isAdapted: map.get(info.packageName) ?? false,
      }));
    });
  };

  const loadConfig = async (): Promise<Result<Config>> => {
    return wrap(async () => {
      const stdout = await execOrThrow(`${PATHS.CIP_BIN} config get --json`);
      return JSON.parse(stdout);
    });
  };

  const checkUpdate = async (): Promise<Result<UpdateInfoRes>> => {
    return wrap(async () => {
      const spawn = await ensureSpawn();
      const child = spawn(PATHS.CIP_BIN, ["check", "--json"]);

      return await new Promise<UpdateInfoRes>((resolve, reject) => {
        let buffer = "";

        child.stdout.on("data", (chunk) => (buffer += chunk));

        child.on("exit", (code) => {
          if (code !== 0) return reject(new Error(`exit code ${code}`));
          resolve(JSON.parse(buffer));
        });

        child.on("error", reject);
      });
    });
  };

  const setConfig = async (options: {
    baseUrl?: string;
    concurrency?: number;
    icons?: {
      light?: boolean;
      dark?: boolean;
      mat?: boolean;
      monochrome?: boolean;
    };
  }) => {
    const args: string[] = [];

    if (options.baseUrl !== undefined) {
      args.push("--base-url", options.baseUrl);
    }

    if (options.concurrency !== undefined) {
      args.push("--concurrency", String(options.concurrency));
    }

    if (options.icons) {
      const { light, dark, mat, monochrome } = options.icons;

      if (light !== undefined) args.push("--light", String(light));
      if (dark !== undefined) args.push("--dark", String(dark));
      if (mat !== undefined) args.push("--mat", String(mat));
      if (monochrome !== undefined) args.push("--monochrome", String(monochrome));
    }

    if (!args.length) return;

    await execOrThrow(`${PATHS.CIP_BIN} config set ${args.join(" ")}`);
  };

  const updateStream = async (
    onEvent: (e: UpdateEvent) => void,
    onDone?: () => void,
    onError?: (err: string) => void,
  ): Promise<void> => {
    const spawn = await ensureSpawn();

    return new Promise((resolve, reject) => {
      const child = spawn(PATHS.CIP_BIN, ["upgrade", "--json"]);

      let buffer = "";

      const flushLines = () => {
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            onEvent(JSON.parse(trimmed));
          } catch {
            onEvent({ type: "log", message: trimmed });
          }
        }
      };

      child.stdout.on("data", (chunk) => {
        buffer += chunk;
        flushLines();
      });

      child.stderr.on("data", (err) => {
        const msg = err.trim();
        if (!msg) return;

        onEvent({ type: "error", message: msg });
        onError?.(msg);
      });

      child.on("exit", (code) => {
        if (code !== 0) {
          const msg = `exit code ${code}`;
          onEvent({ type: "error", message: msg });
          onError?.(msg);
          return reject(new Error(msg));
        }

        onEvent({ type: "exit" });
        onDone?.();
        resolve();
      });

      child.on("error", (err) => {
        const msg = String(err);
        onEvent({ type: "error", message: msg });
        onError?.(msg);
        reject(err);
      });
    });
  };

  const getVersion = async () => {
    await initKernelSU();
    if (!moduleInfo) {
      return {
        version: "0.0.0",
        name: "ColorOS Icons Patch",
      };
    }

    try {
      const res = JSON.parse(moduleInfo()) as Module;

      return {
        version: res.version ?? "0.0.0",
        name: res.name ?? "Unknown",
      };
    } catch {
      return {
        version: "0.0.0",
        name: "Parse Error",
      };
    }
  };

  const openLink = async (url: string): Promise<void> => {
    const safeUrl = url.replace(/"/g, '\\"');

    try {
      await execOrThrow(`am start -a android.intent.action.VIEW -d "${safeUrl}"`);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return {
    loadConfig,
    checkUpdate,
    getVersion,
    getAllPackages,
    updateStream,
    setConfig,
    openLink,
  };
}
