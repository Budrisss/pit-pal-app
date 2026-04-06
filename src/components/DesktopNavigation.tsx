import { Link, useLocation, useNavigate } from "react-router-dom";
import { Settings, Calendar, Car, Home, MapPin, LogOut, ClipboardList, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";

const DesktopNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isOrganizer, isApproved, isOrganizerMode, toggleMode } = useOrganizerMode();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const userNavItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Car, label: "Garage", path: "/garage" },
    { icon: MapPin, label: "Local Events", path: "/local-events" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const organizerNavItems = [
    { icon: ClipboardList, label: "Organizer", path: "/event-organizer" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const navItems = isOrganizerMode ? organizerNavItems : userNavItems;

  return (
    <nav className="hidden lg:flex fixed top-0 left-0 w-full bg-f1-black border-b-2 border-f1-red z-50">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-f1 rounded-none flex items-center justify-center transform -skew-x-12">
            <Car className="text-white transform skew-x-12" size={24} />
          </div>
          <h1 className="text-xl font-bold text-white uppercase tracking-wider">Trackside Setup</h1>
        </div>
        
        <div className="flex items-center gap-1">
          {navItems.map(({ icon: Icon, label, path }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "relative flex items-center gap-2 px-6 py-3 transition-all duration-300 transform -skew-x-6 border-2 border-transparent uppercase tracking-wide font-bold text-sm",
                location.pathname === path
                  ? "text-white bg-f1-red shadow-f1 border-white"
                  : "text-f1-silver hover:text-white hover:bg-f1-red hover:border-f1-silver"
              )}
            >
              <Icon size={18} className="transform skew-x-6" />
              <span className="transform skew-x-6">{label}</span>
            </Link>
          ))}
          {isOrganizer && isApproved && (
            <button
              onClick={() => {
                toggleMode();
                navigate(isOrganizerMode ? "/dashboard" : "/event-organizer");
              }}
              className="flex items-center gap-2 px-6 py-3 transition-all duration-300 transform -skew-x-6 border-2 border-transparent uppercase tracking-wide font-bold text-sm text-f1-silver hover:text-white hover:bg-primary hover:border-f1-silver"
            >
              <Repeat size={18} className="transform skew-x-6" />
              <span className="transform skew-x-6">{isOrganizerMode ? "User Mode" : "Org Mode"}</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 transition-all duration-300 transform -skew-x-6 border-2 border-transparent uppercase tracking-wide font-bold text-sm text-f1-silver hover:text-white hover:bg-destructive hover:border-f1-silver"
          >
            <LogOut size={18} className="transform skew-x-6" />
            <span className="transform skew-x-6">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default DesktopNavigation;
