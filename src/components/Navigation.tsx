import { Link, useLocation } from "react-router-dom";
import { Settings, Calendar, Car, Home, MapPin, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [newRegCount, setNewRegCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('organizer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsOrganizer(!!data);
        if (data) {
          supabase
            .from('event_registrations')
            .select('id, event_id, public_events!inner(organizer_id)', { count: 'exact' })
            .eq('public_events.organizer_id', data.id)
            .then(({ count }) => setNewRegCount(count || 0));
        }
      });
  }, [user]);

  const navItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Car, label: "Garage", path: "/garage" },
    { icon: MapPin, label: "Local", path: "/local-events" },
    { icon: Calendar, label: "Events", path: "/events" },
    ...(isOrganizer ? [{ icon: ClipboardList, label: "Organizer", path: "/event-organizer" }] : []),
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 backdrop-blur-sm lg:hidden">
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
            {label === "Organizer" && newRegCount > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 min-w-[18px] flex items-center justify-center">
                {newRegCount}
              </Badge>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;