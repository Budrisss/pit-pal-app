import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Car {
  id: string;
  name: string;
  year: string;
  make: string;
  model: string;
  category: string;
  image: string;
  specs: {
    engine: string;
    power: string;
    weight: string;
    drivetrain: string;
  };
  events: number;
  setups: number;
  isDefault?: boolean;
}

interface CarsContextType {
  cars: Car[];
  loading: boolean;
  addCar: (car: Omit<Car, "id" | "events" | "setups">) => Promise<void>;
  deleteCar: (id: string) => Promise<void>;
  refreshCars: () => Promise<void>;
  getCarDisplayName: (car: Car) => string;
}

const CarsContext = createContext<CarsContextType | undefined>(undefined);

export const useCars = () => {
  const context = useContext(CarsContext);
  if (!context) {
    throw new Error("useCars must be used within a CarsProvider");
  }
  return context;
};

// Map a DB row to our Car interface
const mapDbRowToCar = (row: any): Car => ({
  id: row.id,
  name: row.name,
  year: row.year?.toString() || "",
  make: row.make || "",
  model: row.model || "",
  category: row.category || "Street",
  image: row.image || "/api/placeholder/300/200",
  specs: {
    engine: row.engine || "N/A",
    power: row.power || "N/A",
    weight: row.weight || "N/A",
    drivetrain: row.drivetrain || "N/A",
  },
  events: 0,
  setups: 0,
});

export const CarsProvider = ({ children }: { children: ReactNode }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCars = useCallback(async () => {
    if (!user) {
      setCars([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("cars")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCars(data.map(mapDbRowToCar));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  const addCar = async (car: Omit<Car, "id" | "events" | "setups">) => {
    if (!user) return;
    const { error } = await (supabase as any).from("cars").insert({
      user_id: user.id,
      name: car.name,
      year: car.year ? parseInt(car.year) : null,
      make: car.make || null,
      model: car.model || null,
      category: car.category || null,
      image: car.image || null,
      engine: car.specs?.engine || null,
      power: car.specs?.power || null,
      weight: car.specs?.weight || null,
      drivetrain: car.specs?.drivetrain || null,
    });
    if (!error) {
      await fetchCars();
    }
  };

  const deleteCar = async (id: string) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from("cars")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (!error) {
      setCars((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const getCarDisplayName = (car: Car) => {
    return `${car.name} - ${car.year} ${car.make} ${car.model}`;
  };

  return (
    <CarsContext.Provider value={{ cars, loading, addCar, deleteCar, refreshCars: fetchCars, getCarDisplayName }}>
      {children}
    </CarsContext.Provider>
  );
};
