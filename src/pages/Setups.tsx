import { Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleSetupForm } from "@/components/VehicleSetupForm";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";

const Setups = () => {

  return (
    <div className="min-h-screen bg-gradient-dark pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wrench className="text-primary" />
              Vehicle Setups
            </h1>
            <p className="text-muted-foreground text-sm">Create and manage your chassis setups</p>
          </div>
        </div>

        {/* Vehicle Setup Form */}
        <VehicleSetupForm />
      </div>
      <Navigation />
    </div>
  );
};

export default Setups;