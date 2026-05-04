export type PlatformModuleKey = "crm" | "tasks" | "ai_sales" | "academy";

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
    description: "Run clients and deals without chaos.",
    href: "/app/crm",
    enabled: true,
    visible: true,
  },
  tasks: {
    key: "tasks",
    name: "Tasks",
    description: "Coordinate team tasks and execution workflows.",
    href: "/app/tasks",
    enabled: true,
    visible: true,
  },
  ai_sales: {
    key: "ai_sales",
    name: "AI Manager",
    description: "Automated Instagram DM sales bot.",
    href: "/app/ai-sales",
    enabled: true,
    visible: true,
  },
  academy: {
    key: "academy",
    name: "Academy",
    description: "Train the team inside the same system.",
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
