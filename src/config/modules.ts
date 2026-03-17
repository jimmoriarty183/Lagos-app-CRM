export type PlatformModuleKey = "crm" | "tasks" | "academy";

export type PlatformModule = {
  key: PlatformModuleKey;
  name: string;
  description: string;
  href: string;
  enabled: boolean;
  visible: boolean;
};

export const PLATFORM_MODULES: Record<PlatformModuleKey, PlatformModule> = {
  crm: {
    key: "crm",
    name: "CRM",
    description: "Customer operations and business workflows.",
    href: "/app/crm",
    enabled: true,
    visible: true,
  },
  tasks: {
    key: "tasks",
    name: "Tasks",
    description: "Internal execution workflows for teams.",
    href: "/app/tasks",
    enabled: false,
    visible: false,
  },
  academy: {
    key: "academy",
    name: "Academy",
    description: "Training and knowledge delivery.",
    href: "/app/academy",
    enabled: false,
    visible: false,
  },
};

export function getPlatformModule(key: PlatformModuleKey) {
  return PLATFORM_MODULES[key];
}

export function isPlatformModuleEnabled(key: PlatformModuleKey) {
  return PLATFORM_MODULES[key].enabled;
}

export function getVisiblePlatformModules() {
  return Object.values(PLATFORM_MODULES).filter(
    (module) => module.enabled && module.visible,
  );
}
