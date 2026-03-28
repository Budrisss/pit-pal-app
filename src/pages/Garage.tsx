import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Plus, Car, Settings, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CarCard from "@/components/CarCard";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";
import { useCars } from "@/contexts/CarsContext";

const Garage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cars, loading, addCar } = useCars();
  const [isAddCarOpen, setIsAddCarOpen] = useState(false);
  const [newCar, setNewCar] = useState({
    name: "",
    year: "",
    make: "",
    model: "",
    category: "",
  });

  const handleAddCar = () => {
    setIsAddCarOpen(true);
  };

  const handleSaveCar = async () => {
    if (!newCar.name || !newCar.make || !newCar.model) {
      toast({
        title: "Missing Information",
        description: "Please fill in the car name, make, and model.",
        variant: "destructive"
      });
      return;
    }

    await addCar({
      name: newCar.name,
      year: newCar.year,
      make: newCar.make,
      model: newCar.model,
      category: newCar.category || "Street",
      image: "/api/placeholder/300/200",
      specs: {
        engine: "N/A",
        power: "N/A",
        weight: "N/A",
        drivetrain: "N/A"
      },
    });

    setNewCar({
      name: "",
      year: "",
      make: "",
      model: "",
      category: "",
    });
    setIsAddCarOpen(false);
    
    toast({
      title: "Car Added!",
      description: `${newCar.name} has been added to your garage.`,
    });
  };

  const handleNewEvent = () => {
    navigate('/events');
  };

  const handleNewSetup = () => {
    navigate('/setups');
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 lg:pt-20">
      <DesktopNavigation />
      {/* Add Car Dialog */}
      <Dialog open={isAddCarOpen} onOpenChange={setIsAddCarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car size={24} className="text-primary" />
              Add New Car
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Car Name *</Label>
              <Input
                id="name"
                value={newCar.name}
                onChange={(e) => setNewCar({...newCar, name: e.target.value})}
                placeholder="e.g. Track Beast"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  value={newCar.year}
                  onChange={(e) => setNewCar({...newCar, year: e.target.value})}
                  placeholder="2024"
                />
              </div>
              <div>
                <Label htmlFor="make">Make *</Label>
                <Input
                  id="make"
                  value={newCar.make}
                  onChange={(e) => setNewCar({...newCar, make: e.target.value})}
                  placeholder="BMW"
                />
              </div>
              <div>
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={newCar.model}
                  onChange={(e) => setNewCar({...newCar, model: e.target.value})}
                  placeholder="M3"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={newCar.category} onValueChange={(value) => setNewCar({...newCar, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Street">Street</SelectItem>
                  <SelectItem value="Track">Track</SelectItem>
                  <SelectItem value="Street/Track">Street/Track</SelectItem>
                  <SelectItem value="Race">Race</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsAddCarOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveCar} className="flex-1">
                Add Car
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hero Section */}
      <div className="bg-gradient-hero p-4 sm:p-6 lg:p-8 rounded-b-2xl lg:rounded-b-3xl mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-6xl mx-auto">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <Car className="text-white size-6 sm:size-8 lg:size-10" />
              My Garage
            </h1>
            <p className="text-white/80 text-sm sm:text-lg lg:text-xl mt-1 sm:mt-2">Manage your racing collection</p>
          </div>
          <Button variant="orange" size="sm" className="lg:size-default self-start sm:self-auto" onClick={handleAddCar}>
            <Plus size={16} />
            <span className="hidden sm:inline">Add Car</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 space-y-6 lg:space-y-8">

        {/* Garage Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6 max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 text-center shadow-pulse">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-pulse-purple">{cars.length}</div>
            <div className="text-xs sm:text-sm lg:text-base text-muted-foreground">Cars</div>
          </div>
          <div className="bg-card border border-border rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 text-center shadow-pulse">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-pulse-orange">{cars.reduce((sum, car) => sum + car.events, 0)}</div>
            <div className="text-xs sm:text-sm lg:text-base text-muted-foreground">Events</div>
          </div>
          <div className="bg-card border border-border rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 text-center shadow-pulse">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-pulse-purple">{cars.reduce((sum, car) => sum + car.setups, 0)}</div>
            <div className="text-xs sm:text-sm lg:text-base text-muted-foreground">Setups</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-4xl mx-auto">
          <Button variant="outline" className="h-16 sm:h-20 lg:h-24 flex-col gap-1 sm:gap-2 rounded-xl lg:rounded-2xl border-2 hover:shadow-pulse" onClick={handleNewEvent}>
            <Calendar size={20} className="sm:size-6 lg:size-8 text-pulse-purple" />
            <span className="text-xs sm:text-sm lg:text-base font-medium">New Event</span>
          </Button>
          <Button variant="outline" className="h-16 sm:h-20 lg:h-24 flex-col gap-1 sm:gap-2 rounded-xl lg:rounded-2xl border-2 hover:shadow-pulse" onClick={handleNewSetup}>
            <Settings size={20} className="sm:size-6 lg:size-8 text-pulse-orange" />
            <span className="text-xs sm:text-sm lg:text-base font-medium">New Setup</span>
          </Button>
        </div>

        {/* Cars Grid */}
        <div className="space-y-4 lg:space-y-6 max-w-6xl mx-auto">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground">Your Vehicles</h2>
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl lg:rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="w-full h-24 sm:h-32 lg:h-40 rounded-lg" />
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </div>
                  <Skeleton className="h-16 rounded-xl" />
                  <div className="flex gap-3">
                    <Skeleton className="h-9 flex-1 rounded-full" />
                    <Skeleton className="h-9 flex-1 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : cars.length === 0 ? (
            <div className="text-center py-12">
              <Car className="mx-auto size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No cars yet. Add your first car to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {cars.map((car) => (
                <CarCard
                  key={car.id}
                  id={car.id}
                  name={car.name}
                  year={car.year}
                  make={car.make}
                  model={car.model}
                  category={car.category}
                  image={car.image}
                  specs={car.specs}
                  events={car.events}
                  setups={car.setups}
                  isDefault={car.isDefault}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Garage;