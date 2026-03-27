import { useNavigate } from "react-router-dom";
import { Car, Calendar, CheckSquare, Settings, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";
import { useCars } from "@/contexts/CarsContext";
import { useEvents } from "@/contexts/EventsContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { cars } = useCars();
  const { events } = useEvents();

  // Mock checklist data for summary
  const totalChecklists = 3;
  const completedChecklists = 1;

  const upcomingEvents = events.filter(e => e.status === "upcoming");
  const nextEvent = upcomingEvents[0];

  const quickActions = [
    {
      icon: Car,
      label: "Add Car",
      color: "text-pulse-purple",
      onClick: () => navigate('/garage')
    },
    {
      icon: Calendar,
      label: "New Event",
      color: "text-pulse-orange",
      onClick: () => navigate('/events')
    },
    {
      icon: Settings,
      label: "New Setup",
      color: "text-pulse-purple",
      onClick: () => navigate('/setups')
    },
    {
      icon: CheckSquare,
      label: "Checklists",
      color: "text-pulse-orange",
      onClick: () => navigate('/checklists')
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 lg:pt-20 font-f1">
      <DesktopNavigation />
      
      {/* Hero Section - F1 App Style */}
      <div className="bg-gradient-hero p-6 lg:p-8 mb-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">
            Trackside Setup
          </h1>
          <p className="text-white/70 text-lg lg:text-xl font-light">
            Your racing command center
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-8 space-y-6 max-w-6xl mx-auto">
        
        {/* Overview Stats - F1 App Style Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-stat-card border-0 shadow-card">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-f1-red mb-1">{cars.length}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Cars</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-stat-card border-0 shadow-card">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-f1-red mb-1">{events.length}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Events</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-stat-card border-0 shadow-card">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-f1-red mb-1">{cars.reduce((sum, car) => sum + car.setups, 0)}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Setups</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-stat-card border-0 shadow-card">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-f1-red mb-1">{completedChecklists}/{totalChecklists}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Checklists</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-2 rounded-xl border-2 hover:shadow-pulse"
                  onClick={action.onClick}
                >
                  <action.icon size={20} className={`sm:size-6 ${action.color}`} />
                  <span className="text-xs sm:text-sm font-medium">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Next Event */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="text-pulse-orange" />
                Next Event
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextEvent ? (
                <div className="space-y-3">
                  <h3 className="font-bold text-lg">{nextEvent.name}</h3>
                  <p className="text-muted-foreground">{nextEvent.track}</p>
                  <p className="text-sm">{nextEvent.date} at {nextEvent.time}</p>
                  <p className="text-sm text-muted-foreground">Car: {nextEvent.car}</p>
                  <Button size="sm" onClick={() => navigate(`/events/${nextEvent.id}`)}>
                    View Details
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-3">No upcoming events</p>
                  <Button size="sm" onClick={() => navigate('/events')}>
                    <Plus size={16} className="mr-2" />
                    Create Event
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Cars */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="text-pulse-purple" />
                Your Garage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cars.length > 0 ? (
                <div className="space-y-3">
                  {cars.slice(0, 2).map((car) => (
                    <div key={car.id} className="border border-border rounded-lg p-3">
                      <h4 className="font-semibold">{car.name}</h4>
                      <p className="text-sm text-muted-foreground">{car.year} {car.make} {car.model}</p>
                      <p className="text-xs text-muted-foreground">{car.events} events • {car.setups} setups</p>
                    </div>
                  ))}
                  {cars.length > 2 && (
                    <p className="text-sm text-muted-foreground">+{cars.length - 2} more cars</p>
                  )}
                  <Button size="sm" variant="outline" onClick={() => navigate('/garage')}>
                    View All Cars
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-3">No cars in garage</p>
                  <Button size="sm" onClick={() => navigate('/garage')}>
                    <Plus size={16} className="mr-2" />
                    Add Car
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Navigation />
    </div>
  );
};

export default Dashboard;