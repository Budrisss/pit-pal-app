import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, ArrowLeftRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";
import tracksideLogo from "@/assets/trackside-logo-v2.png";

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
    { label: "Dashboard", path: "/organizer" },
    { label: "Stamps", path: "/organizer/stamps" },
    { label: "Settings", path: "/organizer/settings" },
  ];

  const isActive = (path: string) =>
    location.pathname === path || (path === "/organizer" && location.pathname === "/organizer/");

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-md border-b hidden lg:block"
      style={{
        backgroundColor: "hsl(var(--org-surface) / 0.8)",
        borderBottomColor: "hsl(var(--org-accent) / 0.55)",
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-20">
        <Link to="/organizer" className="flex items-center h-full py-1">
          <img src={tracksideLogo} alt="Track Side Ops" className="h-full w-auto object-contain invert" />
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Button
                key={item.path}
                variant={active ? "default" : "ghost"}
                size="sm"
                asChild
                className={active ? "text-white border-0 hover:opacity-90" : "text-white/80 hover:text-white hover:bg-white/10"}
                style={
                  active
                    ? { background: "var(--gradient-org)", boxShadow: "var(--shadow-org)" }
                    : undefined
                }
              >
                <Link to={item.path}>{item.label}</Link>
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { void exitOrganizerMode(); }}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeftRight size={16} className="mr-1" /> Switch to Racer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut size={16} className="mr-1" /> Logout
          </Button>
        </div>
      </div>
    </motion.nav>
  );
};

export default OrganizerDesktopNavigation;
