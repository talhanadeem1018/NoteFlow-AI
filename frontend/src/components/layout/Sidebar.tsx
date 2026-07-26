import { Link, useLocation } from "react-router-dom";
import { useAppStore } from "@/stores/app.store";
import { cn } from "@/utils/cn";

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "My Notes", href: "/dashboard/notes", icon: "📝" },
];

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Sidebar navigation"
        className={cn(
          "fixed left-0 top-16 z-40 h-[calc(100dvh-4rem)] w-64 border-r border-gray-200 bg-white shadow-sm transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-950",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        <nav className="flex flex-col gap-1 p-4" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => {
                  if (sidebarOpen) toggleSidebar();
                }}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  "focus-visible:outline-2 focus-visible:outline-primary-500",
                  isActive
                    ? "bg-primary-50 text-primary-700 shadow-sm dark:bg-primary-950 dark:text-primary-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
                )}
              >
                <span className="text-lg" aria-hidden="true">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>


      </aside>
    </>
  );
}
