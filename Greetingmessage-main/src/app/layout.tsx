import { Outlet, Link, useLocation } from "react-router";
import { Logo } from "./components/Logo";

const navItems = [
  { path: "/", label: "Overview", group: "Introduction" },
  { path: "/logos", label: "Logo", group: "Brand" },
  { path: "/colors", label: "Colors", group: "Foundation" },
  { path: "/typography", label: "Typography", group: "Foundation" },
  { path: "/spacing", label: "Spacing", group: "Foundation" },
  { path: "/buttons", label: "Buttons", group: "Components" },
  { path: "/forms", label: "Forms", group: "Components" },
  { path: "/components", label: "UI Elements", group: "Components" },
  { path: "/icons", label: "Icons", group: "Assets" },
  { path: "/layout", label: "Layout", group: "Patterns" },
];

export default function Layout() {
  const location = useLocation();

  // Group navigation items
  const groupedNav = navItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "var(--neutral-50)" }}
    >
      {/* Sidebar */}
      <aside
        className="w-64 fixed h-screen overflow-y-auto flex flex-col"
        style={{
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid var(--neutral-200)",
        }}
      >
        <div
          className="px-6 py-8 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--neutral-200)" }}
        >
          <Logo />
          <p
            className="text-xs mt-3 uppercase tracking-wider"
            style={{ color: "var(--neutral-500)", letterSpacing: "0.08em" }}
          >
            Brand System
          </p>
        </div>
        
        <nav className="px-3 py-6 flex-1">
          {Object.entries(groupedNav).map(([group, items]) => (
            <div key={group} className="mb-6">
              <p
                className="px-3 text-xs uppercase tracking-wider mb-2"
                style={{ color: "var(--neutral-500)", letterSpacing: "0.08em" }}
              >
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block px-3 py-2 rounded-lg transition-all duration-200 group"
                      style={{
                        backgroundColor: isActive
                          ? "var(--neutral-100)"
                          : "transparent",
                        color: isActive ? "var(--neutral-900)" : "var(--neutral-600)",
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      <span className="relative">
                        {item.label}
                        {isActive && (
                          <span
                            className="absolute -left-6 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full"
                            style={{ backgroundColor: "var(--brand-600)" }}
                          />
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--neutral-200)" }}
        >
          <p className="text-xs" style={{ color: "var(--neutral-500)" }}>
            Version 1.0.0
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-400)" }}>
            Last updated Mar 2026
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="max-w-[1100px] mx-auto px-16 py-20">
          <Outlet />
        </div>
      </main>
    </div>
  );
}