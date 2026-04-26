import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Stamp, Settings, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";

const OrganizerMobileNavigation = () => {
  const location = useLocation();
  const { exitOrganizerMode } = useOrganizerMode();

  const items = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/organizer" },
    { icon: Stamp, label: "Stamps", path: "/organizer/stamps" },
    { icon: Settings, label: "Settings", path: "/organizer/settings" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md lg:hidden border-t"
      style={{
        backgroundColor: "hsl(var(--org-surface) / 0.95)",
        borderTopColor: "hsl(var(--org-accent) / 0.6)",
      }}
    >
      <div className="flex justify-around items-center py-2 sm:py-3 px-2">
        {items.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "relative flex flex-col items-center p-2 sm:p-3 min-w-0 transition-all duration-200",
                active ? "text-white" : "text-white/60 hover:text-white",
              )}
              style={active ? { color: "hsl(var(--org-accent-soft))" } : undefined}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                  style={{ backgroundColor: "hsl(var(--org-accent))" }}
                />
              )}
              <Icon size={18} className="sm:size-5" />
              <span className="text-[10px] sm:text-xs mt-1 font-medium truncate">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => { void exitOrganizerMode(); }}
          className="flex flex-col items-center p-2 sm:p-3 min-w-0 transition-all duration-300 text-white/60 hover:text-white"
        >
          <ArrowLeftRight size={18} className="sm:size-5" />
          <span className="text-[10px] sm:text-xs mt-1 font-medium truncate">Racer</span>
        </button>
      </div>
    </nav>
  );
};

export default OrganizerMobileNavigation;