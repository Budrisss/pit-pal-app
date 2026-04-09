import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Car, Settings, Calendar, Pencil, Gauge, LogOut, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CarCard from "@/components/CarCard";
import Navigation from "@/components/Navigation";
import { useCars } from "@/contexts/CarsContext";
import { useAuth } from "@/contexts/AuthContext";
import ProGate from "@/components/ProGate";
import { motion } from "framer-motion";

import dashboardHero from "@/assets/dashboard-hero.jpg";
import tracksideLogo from "@/assets/trackside-logo-v2.png";

const Garage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cars, loading, addCar, updateCar, uploadCarImage, removeCarImage, deleteCar } = useCars();
  const { signOut } = useAuth();
  const [isAddCarOpen, setIsAddCarOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<string | null>(null);
  const [newCar, setNewCar] = useState({
    name: "",
    year: "",
    make: "",
    model: "",
    category: "",
  });
  const [editCar, setEditCar] = useState({
    name: "",
    year: "",
    make: "",
    model: "",
    category: "",
  });

  const handleAddCar = () => setIsAddCarOpen(true);

  const handleSaveCar = async () => {
    if (!newCar.name || !newCar.make || !newCar.model) {
      toast({ title: "Missing Information", description: "Please fill in the car name, make, and model.", variant: "destructive" });
      return;
    }
    await addCar({
      name: newCar.name, year: newCar.year, make: newCar.make, model: newCar.model,
      category: newCar.category || "Street", image: "/api/placeholder/300/200",
      specs: { engine: "N/A", power: "N/A", weight: "N/A", drivetrain: "N/A" },
    });
    setNewCar({ name: "", year: "", make: "", model: "", category: "" });
    setIsAddCarOpen(false);
    toast({ title: "Car Added!", description: `${newCar.name} has been added to your garage.` });
  };

  const handleEditCar = (id: string) => {
    const car = cars.find(c => c.id === id);
    if (car) {
      setEditCar({ name: car.name, year: car.year, make: car.make, model: car.model, category: car.category });
      setEditingCar(id);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCar || !editCar.name || !editCar.make || !editCar.model) {
      toast({ title: "Missing Information", description: "Please fill in the car name, make, and model.", variant: "destructive" });
      return;
    }
    await updateCar(editingCar, { name: editCar.name, year: editCar.year, make: editCar.make, model: editCar.model, category: editCar.category || "Street" });
    setEditingCar(null);
    toast({ title: "Car Updated!", description: `${editCar.name} has been updated.` });
  };

  const handleDeleteCar = async (id: string) => {
    await deleteCar(id);
    toast({ title: "Car Deleted", description: "The car has been removed from your garage." });
  };

  const handleImageUpload = async (id: string, file: File) => {
    await uploadCarImage(id, file);
    toast({ title: "Photo Updated!", description: "Your car photo has been uploaded." });
  };

  const handleImageRemove = async (id: string) => {
    await removeCarImage(id);
    toast({ title: "Photo Removed", description: "Car photo has been removed." });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const stats = [
    { label: "Cars", value: cars.length, icon: Car },
    { label: "Events", value: cars.reduce((sum, car) => sum + car.events, 0), icon: Calendar },
    { label: "Setups", value: cars.reduce((sum, car) => sum + car.setups, 0), icon: Gauge },
  ];

  const quickActions = [
    { icon: Calendar, label: "New Event", desc: "Track schedule", onClick: () => navigate("/events") },
    { icon: Settings, label: "New Setup", desc: "Car setups", onClick: () => navigate("/setups"), proGated: true },
  ];

  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
      {/* Nav */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border hidden lg:block"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-20">
          <Link to="/dashboard" className="flex items-center h-full py-1">
            <img src={tracksideLogo} alt="Track Side Ops" className="h-full w-auto object-contain invert" />
          </Link>
          <div className="flex items-center gap-1">
            {[
              { label: "Home", path: "/dashboard" },
              { label: "Garage", path: "/garage" },
              { label: "Events", path: "/events" },
              { label: "Organizer", path: "/event-organizer" },
              { label: "Settings", path: "/settings" },
            ].map((item) => (
              <Button key={item.path} variant={location.pathname === item.path ? "default" : "ghost"} size="sm" asChild>
                <Link to={item.path}>{item.label}</Link>
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive">
              <LogOut size={16} className="mr-1" /> Logout
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-0 lg:pt-20 overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${dashboardHero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20 lg:py-24">
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center mb-6 lg:hidden"
          >
            <img src={tracksideLogo} alt="Track Side Ops" className="h-32 sm:h-36 w-auto invert" />
          </motion.div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tighter leading-none mb-3 text-center lg:text-left uppercase"
              >
                <span className="text-foreground">My</span>
                <br />
                <span className="text-primary drop-shadow-[0_0_25px_hsl(var(--primary)/0.5)]">Garage</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55 }}
                className="text-base sm:text-lg text-muted-foreground max-w-xl text-center lg:text-left mx-auto lg:mx-0"
              >
                Manage your racing collection
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex justify-center lg:justify-end"
            >
              <Button onClick={handleAddCar} size="sm">
                <Plus size={16} className="mr-1" /> Add Car
              </Button>
            </motion.div>
          </div>

          {/* Stats row */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 gap-3 sm:gap-4"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="group bg-card/60 backdrop-blur-md border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_24px_hsl(var(--primary)/0.12)]"
              >
                <stat.icon size={16} className="text-primary/60 mx-auto mb-2 group-hover:text-primary transition-colors" />
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-0.5">{stat.value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {quickActions.map((action, i) => {
              const btn = (
                <motion.button
                  key={i}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.97 }}
                  onClick={action.onClick}
                  className="group relative bg-card/80 backdrop-blur-md border border-border rounded-xl p-4 sm:p-5 flex flex-col items-center gap-2.5 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_24px_hsl(var(--primary)/0.1)] w-full"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <action.icon size={22} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold block">{action.label}</span>
                    <span className="text-[10px] text-muted-foreground">{action.desc}</span>
                  </div>
                </motion.button>
              );
              return action.proGated ? <ProGate key={i}>{btn}</ProGate> : btn;
            })}
          </div>
        </motion.div>

        {/* Cars Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="space-y-4 lg:space-y-6"
        >
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Car size={20} className="text-primary" />
            Your Vehicles
          </h2>
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
                  onEdit={handleEditCar}
                  onDelete={handleDeleteCar}
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                />
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* Add Car Dialog */}
      <Dialog open={isAddCarOpen} onOpenChange={setIsAddCarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car size={24} className="text-primary" />
              Add New Car
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Car Name *</Label>
              <Input id="name" value={newCar.name} onChange={(e) => setNewCar({...newCar, name: e.target.value})} placeholder="e.g. Track Beast" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="year">Year</Label>
                <Input id="year" value={newCar.year} onChange={(e) => setNewCar({...newCar, year: e.target.value})} placeholder="2024" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="make">Make *</Label>
                <Input id="make" value={newCar.make} onChange={(e) => setNewCar({...newCar, make: e.target.value})} placeholder="BMW" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="model">Model *</Label>
                <Input id="model" value={newCar.model} onChange={(e) => setNewCar({...newCar, model: e.target.value})} placeholder="M3" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={newCar.category} onValueChange={(value) => setNewCar({...newCar, category: value})}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Street">Street</SelectItem>
                  <SelectItem value="Track">Track</SelectItem>
                  <SelectItem value="Street/Track">Street/Track</SelectItem>
                  <SelectItem value="Race">Race</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsAddCarOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveCar} className="flex-1">Add Car</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Car Dialog */}
      <Dialog open={!!editingCar} onOpenChange={(open) => !open && setEditingCar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={24} className="text-primary" />
              Edit Car
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Car Name *</Label>
              <Input id="edit-name" value={editCar.name} onChange={(e) => setEditCar({...editCar, name: e.target.value})} placeholder="e.g. Track Beast" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-year">Year</Label>
                <Input id="edit-year" value={editCar.year} onChange={(e) => setEditCar({...editCar, year: e.target.value})} placeholder="2024" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-make">Make *</Label>
                <Input id="edit-make" value={editCar.make} onChange={(e) => setEditCar({...editCar, make: e.target.value})} placeholder="BMW" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-model">Model *</Label>
                <Input id="edit-model" value={editCar.model} onChange={(e) => setEditCar({...editCar, model: e.target.value})} placeholder="M3" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={editCar.category} onValueChange={(value) => setEditCar({...editCar, category: value})}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Street">Street</SelectItem>
                  <SelectItem value="Track">Track</SelectItem>
                  <SelectItem value="Street/Track">Street/Track</SelectItem>
                  <SelectItem value="Race">Race</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingCar(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveEdit} className="flex-1">Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default Garage;
