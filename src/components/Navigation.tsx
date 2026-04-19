import { Link, useLocation, useNavigate } from "react-router-dom";
import { Settings, Calendar, Car, Home, MapPin, ClipboardList, Users, Repeat, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";
import LoraStatusIndicator from "@/components/LoraStatusIndicator";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOrganizer, isApproved, isOrganizerMode, toggleMode } = useOrganizerMode();

  const userNavItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Car, label: "Garage", path: "/garage" },
    { icon: IdCard, label: "GridID", path: "/grid-id" },
    { icon: MapPin, label: "Local", path: "/local-events" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const organizerNavItems = [
    { icon: ClipboardList, label: "Organizer", path: "/event-organizer" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const navItems = isOrganizerMode ? organizerNavItems : userNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 backdrop-blur-sm lg:hidden">
      <div className="absolute -top-7 right-2">
        <LoraStatusIndicator />
      </div>
      <div className="flex justify-around items-center py-2 sm:py-3 px-2">
        {navItems.map(({ icon: Icon, label, path }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              "relative flex flex-col items-center p-2 sm:p-3 rounded-none transition-all duration-300 min-w-0 border-r-2 border-transparent",
              location.pathname === path
                ? "text-white bg-f1-red shadow-f1 border-r-white"
                : "text-muted-foreground hover:text-f1-red hover:bg-f1-light-gray"
            )}
          >
            <Icon size={18} className="sm:size-5" />
            <span className="text-[10px] sm:text-xs mt-1 font-medium truncate">{label}</span>
          </Link>
        ))}
        {isOrganizer && isApproved && (
          <button
            onClick={() => {
              toggleMode();
              navigate(isOrganizerMode ? "/dashboard" : "/event-organizer");
            }}
            className="flex flex-col items-center p-2 sm:p-3 rounded-none transition-all duration-300 min-w-0 text-muted-foreground hover:text-f1-red hover:bg-f1-light-gray"
          >
            <Repeat size={18} className="sm:size-5" />
            <span className="text-[10px] sm:text-xs mt-1 font-medium truncate">
              {isOrganizerMode ? "User" : "Org"}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
