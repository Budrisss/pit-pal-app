import { createContext, useContext, useState, ReactNode } from "react";

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
  setCars: (cars: Car[]) => void;
  addCar: (car: Car) => void;
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

export const CarsProvider = ({ children }: { children: ReactNode }) => {
  const [cars, setCars] = useState<Car[]>([
    {
      id: "1",
      name: "Track Beast",
      year: "2018",
      make: "Mazda",
      model: "MX-5 Miata",
      category: "Street/Track",
      image: "/api/placeholder/300/200",
      specs: {
        engine: "2.0L SKYACTIV-G",
        power: "181 HP",
        weight: "2,332 lbs",
        drivetrain: "RWD"
      },
      events: 5,
      setups: 3,
      isDefault: true
    },
    {
      id: "2", 
      name: "Weekend Warrior",
      year: "2020",
      make: "BMW",
      model: "M2 Competition",
      category: "Track",
      image: "/api/placeholder/300/200",
      specs: {
        engine: "3.0L Twin-Turbo I6",
        power: "405 HP", 
        weight: "3,450 lbs",
        drivetrain: "RWD"
      },
      events: 2,
      setups: 2
    },
    {
      id: "3",
      name: "Daily Driver",
      year: "2019", 
      make: "Honda",
      model: "Civic Type R",
      category: "Street",
      image: "/api/placeholder/300/200",
      specs: {
        engine: "2.0L VTEC Turbo",
        power: "306 HP",
        weight: "3,117 lbs", 
        drivetrain: "FWD"
      },
      events: 1,
      setups: 1
    }
  ]);

  const addCar = (car: Car) => {
    setCars(prev => [...prev, car]);
  };

  const getCarDisplayName = (car: Car) => {
    return `${car.name} - ${car.year} ${car.make} ${car.model}`;
  };

  return (
    <CarsContext.Provider value={{ cars, setCars, addCar, getCarDisplayName }}>
      {children}
    </CarsContext.Provider>
  );
};