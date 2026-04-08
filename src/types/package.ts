export interface UpdateInfo {
  updated: boolean;
  old_version: string;
  new_version: string;
}

export interface Package {
  label: string;
  packageName: string;
  isAdapted: boolean;
}
