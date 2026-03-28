import { Link, useLocation, useNavigate } from "react-router-dom";
import { Settings, Calendar, Car, Home, MapPin, LogOut, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const DesktopNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
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
          // Fetch registration count for organizer's events
          supabase
            .from('event_registrations')
            .select('id, event_id, public_events!inner(organizer_id)', { count: 'exact' })
            .eq('public_events.organizer_id', data.id)
            .then(({ count }) => setNewRegCount(count || 0));
        }
      });
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Car, label: "Garage", path: "/garage" },
    { icon: MapPin, label: "Local Events", path: "/local-events" },
    { icon: Calendar, label: "Events", path: "/events" },
    ...(isOrganizer ? [{ icon: ClipboardList, label: "Organizer", path: "/event-organizer" }] : []),
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

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
              {label === "Organizer" && newRegCount > 0 && (
                <Badge className="absolute -top-2 -right-2 transform skew-x-6 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 min-w-[20px] flex items-center justify-center">
                  {newRegCount}
                </Badge>
              )}
            </Link>
          ))}
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