import { Link, useLocation } from "react-router-dom";
import { Settings, Calendar, Car, Home, MapPin, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";
import LoraStatusIndicator from "@/components/LoraStatusIndicator";

const Navigation = () => {
  const location = useLocation();

  // Don't render the racer mobile nav inside the organizer shell —
  // OrganizerMobileNavigation is shown there instead.
  if (location.pathname.startsWith("/organizer")) return null;

  const navItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Car, label: "Garage", path: "/garage" },
    { icon: IdCard, label: "GridID", path: "/grid-id" },
    { icon: MapPin, label: "Local", path: "/local-events" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

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
      </div>
    </nav>
  );
};

export default Navigation;
