export interface Config {
  icons: {
    light: boolean;
    dark: boolean;
    mat: boolean;
    monochrome: boolean;
  };
  network: {
    concurrency: number;
  };
  repo: {
    base_url: string;
  };
}
