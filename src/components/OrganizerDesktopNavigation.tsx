import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Stamp, Settings, LogOut, ArrowLeftRight, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";

const OrganizerDesktopNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { exitOrganizerMode } = useOrganizerMode();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/organizer" },
    { icon: Stamp, label: "Stamps", path: "/organizer/stamps" },
    { icon: Settings, label: "Settings", path: "/organizer/settings" },
  ];

  return (
    <nav
      className="hidden lg:flex fixed top-0 left-0 w-full z-50 border-b-2"
      style={{
        backgroundColor: "hsl(var(--org-bg))",
        borderBottomColor: "hsl(var(--org-accent))",
      }}
    >
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-none flex items-center justify-center transform -skew-x-12"
            style={{ background: "var(--gradient-org)" }}
          >
            <Briefcase className="text-white transform skew-x-12" size={22} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: "hsl(var(--org-accent))" }}>
              Organizer
            </span>
            <h1 className="text-lg font-bold text-white uppercase tracking-wider">Track Side Ops</h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path || (path === "/organizer" && location.pathname === "/organizer/");
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 transition-all duration-300 transform -skew-x-6 border-2 uppercase tracking-wide font-bold text-sm",
                  active ? "text-white border-white" : "text-white/70 hover:text-white border-transparent hover:border-white/40",
                )}
                style={active ? { background: "var(--gradient-org)" } : undefined}
              >
                <Icon size={18} className="transform skew-x-6" />
                <span className="transform skew-x-6">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => { void exitOrganizerMode(); }}
            className="flex items-center gap-2 px-5 py-2.5 transition-all duration-300 transform -skew-x-6 border-2 border-transparent uppercase tracking-wide font-bold text-sm text-white/70 hover:text-white hover:bg-white/10 hover:border-white/40"
          >
            <ArrowLeftRight size={18} className="transform skew-x-6" />
            <span className="transform skew-x-6">Switch to Racer</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 transition-all duration-300 transform -skew-x-6 border-2 border-transparent uppercase tracking-wide font-bold text-sm text-white/70 hover:text-white hover:bg-destructive hover:border-white/40"
          >
            <LogOut size={18} className="transform skew-x-6" />
            <span className="transform skew-x-6">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default OrganizerDesktopNavigation;