import {
  getPlatformModule,
  getVisiblePlatformModules,
  type PlatformModuleKey,
} from "@/config/modules";

export type PlatformNavItem = {
  key: PlatformModuleKey | "settings";
  label: string;
  description: string;
  href: string;
};

const SETTINGS_ITEM: PlatformNavItem = {
  key: "settings",
  label: "Settings",
  description: "Workspace configuration and access.",
  href: "/app/settings",
};

export function getPlatformSidebarNavigation(): PlatformNavItem[] {
  return [
    ...getVisiblePlatformModules().map((module) => ({
      key: module.key,
      label: module.name,
      description: module.description,
      href: module.href,
    })),
    SETTINGS_ITEM,
  ];
}

export function getPlatformNavItem(key: PlatformModuleKey | "settings") {
  if (key === "settings") return SETTINGS_ITEM;

  const module = getPlatformModule(key);
  return {
    key: module.key,
    label: module.name,
    description: module.description,
    href: module.href,
  } satisfies PlatformNavItem;
}
