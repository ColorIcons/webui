import Home from "./views/Home.vue";
import Settings from "./views/Settings.vue";
import About from "./views/About.vue";
import Mono from "./views/Mono.vue";
import { ICONS } from "./constants";

export type TabKey = "home" | "mono" | "settings" | "about";

export type TabItem = {
  key: TabKey;
  label: string;
  icon?: string;
  component: any;
};

export const tabs: TabItem[] = [
  {
    key: "home",
    label: "tab.home",
    component: Home,
    icon: ICONS.home,
  },
  {
    key: "mono",
    label: "tab.mono",
    component: Mono,
    icon: ICONS.mono,
  },
  {
    key: "settings",
    label: "tab.settings",
    component: Settings,
    icon: ICONS.settings,
  },
  {
    key: "about",
    label: "tab.about",
    component: About,
    icon: ICONS.about,
  },
];
