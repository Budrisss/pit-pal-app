import { useState } from "react";
import { CalendarIcon, Gauge, Save, Timer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  type: "practice" | "qualifying" | "race";
  duration: number;
  referenceName: string;
  startTime: string;
  notes?: string;
  state?: "upcoming" | "active" | "completed";
}

interface ChassisSetupData {
  // Header
  date: Date | undefined;
  track: string;
  driver: string;
  car: string;
  weather: string;
  airTemp: string;
  airDensity: string;
  
  // Setup Parameters
  swayBar: string;
  swayPreload: string;
  diameter: string;
  frontStaggerCold: string;
  frontStaggerHot: string;
  toe: string;
  fSpoilerHeight: string;
  rSpoilerAngle: string;
  
  // Tire Data
  tireComp: string;
  pressureCold: string;
  pressureHot: string;
  sizeCold: string;
  sizeHot: string;
  
  // Weight Data
  lf: {
    spring: string;
    shock: string;
    rideHeight: string;
    caster: string;
    camber: string;
    bump: string;
    ackerman: string;
  };
  rf: {
    spring: string;
    shock: string;
    rideHeight: string;
    caster: string;
    camber: string;
    bump: string;
    ackerman: string;
  };
  lr: {
    spring: string;
    shock: string;
    rideHeight: string;
    camber: string;
    trailingArm: string;
  };
  rr: {
    spring: string;
    shock: string;
    rideHeight: string;
    camber: string;
    trailingArm: string;
  };
  
  // Tire Temperatures
  frontLeft: {
    outside: string;
    center: string;
    inside: string;
  };
  frontRight: {
    outside: string;
    center: string;
    inside: string;
  };
  rearLeft: {
    outside: string;
    center: string;
    inside: string;
  };
  rearRight: {
    outside: string;
    center: string;
    inside: string;
  };
  
  // Percentages
  frontPercentage: string;
  crossPercentage: string;
  leftPercentage: string;
  rightPercentage: string;
  totalPercentage: string;
  rearPercentage: string;
  
  // Rear Stagger
  rearStaggerCold: string;
  rearStaggerHot: string;
  
  // Track Bar
  trackBarRearEndSide: string;
  trackBarFrameSide: string;
  trackBarSplit: string;
  trackBarLength: string;
  
  // Rear End
  rearEndPinionAngle: string;
  rearEnd3rdLinkAngle: string;
  rearEndFHeight3rdLink: string;
  rearEndRHeight3rdLink: string;
  
  // Gears
  gearRatio: string;
  gearSetNumber: string;
  rpm: string;
  
  // Fuel
  fuelLaps: string;
  fuelGalUsed: string;
  fuelMpg: string;
  fuelLpg: string;
  
  // Notes
  notesTimes: string;
}

interface ChassisSetupCardProps {
  sessions: Session[];
  onSaveData: (sessionId: string, data: ChassisSetupData) => void;
}

const ChassisSetupCard = ({ sessions, onSaveData }: ChassisSetupCardProps) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [setupData, setSetupData] = useState<ChassisSetupData>({
    date: undefined,
    track: "",
    driver: "",
    car: "",
    weather: "",
    airTemp: "",
    airDensity: "",
    swayBar: "",
    swayPreload: "",
    diameter: "",
    frontStaggerCold: "",
    frontStaggerHot: "",
    toe: "",
    fSpoilerHeight: "",
    rSpoilerAngle: "",
    tireComp: "",
    pressureCold: "",
    pressureHot: "",
    sizeCold: "",
    sizeHot: "",
    lf: {
      spring: "",
      shock: "",
      rideHeight: "",
      caster: "",
      camber: "",
      bump: "",
      ackerman: ""
    },
    rf: {
      spring: "",
      shock: "",
      rideHeight: "",
      caster: "",
      camber: "",
      bump: "",
      ackerman: ""
    },
    lr: {
      spring: "",
      shock: "",
      rideHeight: "",
      camber: "",
      trailingArm: ""
    },
    rr: {
      spring: "",
      shock: "",
      rideHeight: "",
      camber: "",
      trailingArm: ""
    },
    frontLeft: {
      outside: "",
      center: "",
      inside: ""
    },
    frontRight: {
      outside: "",
      center: "",
      inside: ""
    },
    rearLeft: {
      outside: "",
      center: "",
      inside: ""
    },
    rearRight: {
      outside: "",
      center: "",
      inside: ""
    },
    frontPercentage: "",
    crossPercentage: "",
    leftPercentage: "",
    rightPercentage: "",
    totalPercentage: "",
    rearPercentage: "",
    rearStaggerCold: "",
    rearStaggerHot: "",
    trackBarRearEndSide: "",
    trackBarFrameSide: "",
    trackBarSplit: "",
    trackBarLength: "",
    rearEndPinionAngle: "",
    rearEnd3rdLinkAngle: "",
    rearEndFHeight3rdLink: "",
    rearEndRHeight3rdLink: "",
    gearRatio: "",
    gearSetNumber: "",
    rpm: "",
    fuelLaps: "",
    fuelGalUsed: "",
    fuelMpg: "",
    fuelLpg: "",
    notesTimes: ""
  });

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const updateSetupData = (field: string, value: any) => {
    setSetupData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedData = (section: string, field: string, value: string) => {
    setSetupData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof ChassisSetupData] as any),
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    if (!selectedSessionId) return;
    onSaveData(selectedSessionId, setupData);
    // Reset form after save would go here if needed
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-gradient-dark border-primary/30 shadow-racing">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Gauge size={20} className="text-racing-orange" />
                      Chassis Setup Sheet
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedSession ? selectedSession.referenceName : "Select a session"}
                    </p>
                  </div>
                  <ChevronDown 
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </CollapsibleTrigger>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {selectedSession && (
                <Badge className={`${
                  selectedSession.type === "race" ? "bg-red-500 text-white" :
                  selectedSession.type === "qualifying" ? "bg-yellow-500 text-black" :
                  "bg-green-500 text-white"
                }`}>
                  {selectedSession.type.charAt(0).toUpperCase() + selectedSession.type.slice(1)}
                </Badge>
              )}
              {selectedSession?.state === "active" && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Timer size={12} />
                  Active
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Session Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Select Session</Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a session to record data for" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex items-center gap-2">
                        <span>{session.referenceName}</span>
                        <Badge 
                          variant={session.state === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {session.state}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Header Information */}
            <div className="grid grid-cols-7 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-xs",
                        !setupData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {setupData.date ? format(setupData.date, "MM/dd") : <span>MM/DD</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={setupData.date}
                      onSelect={(date) => updateSetupData("date", date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Track</Label>
                <Input
                  value={setupData.track}
                  onChange={(e) => updateSetupData("track", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Driver</Label>
                <Input
                  value={setupData.driver}
                  onChange={(e) => updateSetupData("driver", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Car</Label>
                <Input
                  value={setupData.car}
                  onChange={(e) => updateSetupData("car", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Weather</Label>
                <Input
                  value={setupData.weather}
                  onChange={(e) => updateSetupData("weather", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Air Temp</Label>
                <Input
                  value={setupData.airTemp}
                  onChange={(e) => updateSetupData("airTemp", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Air Density %</Label>
                <Input
                  value={setupData.airDensity}
                  onChange={(e) => updateSetupData("airDensity", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Setup Parameters Row 1 */}
            <div className="grid grid-cols-8 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sway Bar</Label>
                <Input
                  value={setupData.swayBar}
                  onChange={(e) => updateSetupData("swayBar", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sway Preload</Label>
                <Input
                  value={setupData.swayPreload}
                  onChange={(e) => updateSetupData("swayPreload", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Diameter</Label>
                <Input
                  value={setupData.diameter}
                  onChange={(e) => updateSetupData("diameter", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Front Stagger Cold</Label>
                <Input
                  value={setupData.frontStaggerCold}
                  onChange={(e) => updateSetupData("frontStaggerCold", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Toe</Label>
                <Input
                  value={setupData.toe}
                  onChange={(e) => updateSetupData("toe", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">F. Spoiler Height</Label>
                <Input
                  value={setupData.fSpoilerHeight}
                  onChange={(e) => updateSetupData("fSpoilerHeight", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">R. Spoiler Angle</Label>
                <Input
                  value={setupData.rSpoilerAngle}
                  onChange={(e) => updateSetupData("rSpoilerAngle", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Tire Data Row */}
            <div className="grid grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tire - Comp.</Label>
                <Input
                  value={setupData.tireComp}
                  onChange={(e) => updateSetupData("tireComp", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Pressure Cold</Label>
                <Input
                  value={setupData.pressureCold}
                  onChange={(e) => updateSetupData("pressureCold", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Size Cold</Label>
                <Input
                  value={setupData.sizeCold}
                  onChange={(e) => updateSetupData("sizeCold", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hot</Label>
                <Input
                  value={setupData.pressureHot}
                  onChange={(e) => updateSetupData("pressureHot", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Size Hot</Label>
                <Input
                  value={setupData.sizeHot}
                  onChange={(e) => updateSetupData("sizeHot", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Pressure Hot</Label>
                <Input
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Car Diagram with Weight Data */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left Front Weight */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Weight</h3>
                <div className="space-y-1 p-3 bg-background/30 border border-border/50 rounded-lg">
                  <div className="grid grid-cols-1 gap-1">
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Spring</Label>
                      <Input
                        value={setupData.lf.spring}
                        onChange={(e) => updateNestedData("lf", "spring", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Shock</Label>
                      <Input
                        value={setupData.lf.shock}
                        onChange={(e) => updateNestedData("lf", "shock", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Ride Height</Label>
                      <Input
                        value={setupData.lf.rideHeight}
                        onChange={(e) => updateNestedData("lf", "rideHeight", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Caster</Label>
                      <Input
                        value={setupData.lf.caster}
                        onChange={(e) => updateNestedData("lf", "caster", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Camber</Label>
                      <Input
                        value={setupData.lf.camber}
                        onChange={(e) => updateNestedData("lf", "camber", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Bump</Label>
                      <Input
                        value={setupData.lf.bump}
                        onChange={(e) => updateNestedData("lf", "bump", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Ackerman</Label>
                      <Input
                        value={setupData.lf.ackerman}
                        onChange={(e) => updateNestedData("lf", "ackerman", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Car Diagram */}
              <div className="flex flex-col items-center space-y-4">
                {/* Front Row */}
                <div className="flex justify-between w-full">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">LF</div>
                    <div className="w-16 h-16 bg-background/50 border-2 border-border rounded-lg flex items-center justify-center">
                      <div className="text-xs text-center">
                        <div className="text-primary font-semibold">FRONT</div>
                        <div className="text-xs">%</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">RF</div>
                    <div className="w-16 h-16 bg-background/50 border-2 border-border rounded-lg flex items-center justify-center">
                      <div className="text-xs text-center">
                        <div className="text-primary font-semibold">Weight</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cross Weight */}
                <div className="w-20 h-12 bg-background/50 border-2 border-primary rounded-lg flex items-center justify-center">
                  <div className="text-xs text-center">
                    <div className="text-primary font-semibold">CROSS</div>
                    <div className="text-xs">%</div>
                  </div>
                </div>

                {/* Left/Right Percentages */}
                <div className="flex justify-between w-full">
                  <div className="w-16 h-12 bg-background/50 border-2 border-primary rounded-lg flex items-center justify-center">
                    <div className="text-xs text-center">
                      <div className="text-primary font-semibold">LEFT</div>
                      <div className="text-xs">%</div>
                    </div>
                  </div>
                  <div className="w-16 h-12 bg-background/50 border-2 border-primary rounded-lg flex items-center justify-center">
                    <div className="text-xs text-center">
                      <div className="text-primary font-semibold">RIGHT</div>
                      <div className="text-xs">%</div>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="w-20 h-12 bg-background/50 border-2 border-primary rounded-lg flex items-center justify-center">
                  <div className="text-xs text-center">
                    <div className="text-primary font-semibold">TOTAL</div>
                  </div>
                </div>

                {/* Rear Row */}
                <div className="flex justify-between w-full">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-16 h-16 bg-background/50 border-2 border-border rounded-lg flex items-center justify-center">
                      <div className="text-xs text-center">
                        <div className="text-primary font-semibold">REAR</div>
                        <div className="text-xs">%</div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">LR</div>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-16 h-16 bg-background/50 border-2 border-border rounded-lg flex items-center justify-center">
                      <div className="text-xs text-center">
                        <div className="text-primary font-semibold">Weight</div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">RR</div>
                  </div>
                </div>
              </div>

              {/* Right Front Weight */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Weight</h3>
                <div className="space-y-1 p-3 bg-background/30 border border-border/50 rounded-lg">
                  <div className="grid grid-cols-1 gap-1">
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Spring</Label>
                      <Input
                        value={setupData.rf.spring}
                        onChange={(e) => updateNestedData("rf", "spring", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Shock</Label>
                      <Input
                        value={setupData.rf.shock}
                        onChange={(e) => updateNestedData("rf", "shock", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Ride Height</Label>
                      <Input
                        value={setupData.rf.rideHeight}
                        onChange={(e) => updateNestedData("rf", "rideHeight", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Caster</Label>
                      <Input
                        value={setupData.rf.caster}
                        onChange={(e) => updateNestedData("rf", "caster", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Camber</Label>
                      <Input
                        value={setupData.rf.camber}
                        onChange={(e) => updateNestedData("rf", "camber", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Bump</Label>
                      <Input
                        value={setupData.rf.bump}
                        onChange={(e) => updateNestedData("rf", "bump", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Ackerman</Label>
                      <Input
                        value={setupData.rf.ackerman}
                        onChange={(e) => updateNestedData("rf", "ackerman", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rear Weight Sections */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Rear Weight */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Weight</h3>
                <div className="space-y-1 p-3 bg-background/30 border border-border/50 rounded-lg">
                  <div className="grid grid-cols-1 gap-1">
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Spring</Label>
                      <Input
                        value={setupData.lr.spring}
                        onChange={(e) => updateNestedData("lr", "spring", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Shock</Label>
                      <Input
                        value={setupData.lr.shock}
                        onChange={(e) => updateNestedData("lr", "shock", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Ride Height</Label>
                      <Input
                        value={setupData.lr.rideHeight}
                        onChange={(e) => updateNestedData("lr", "rideHeight", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Camber</Label>
                      <Input
                        value={setupData.lr.camber}
                        onChange={(e) => updateNestedData("lr", "camber", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Trailing Arm</Label>
                      <Input
                        value={setupData.lr.trailingArm}
                        onChange={(e) => updateNestedData("lr", "trailingArm", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Rear Weight */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Weight</h3>
                <div className="space-y-1 p-3 bg-background/30 border border-border/50 rounded-lg">
                  <div className="grid grid-cols-1 gap-1">
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Spring</Label>
                      <Input
                        value={setupData.rr.spring}
                        onChange={(e) => updateNestedData("rr", "spring", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Shock</Label>
                      <Input
                        value={setupData.rr.shock}
                        onChange={(e) => updateNestedData("rr", "shock", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Ride Height</Label>
                      <Input
                        value={setupData.rr.rideHeight}
                        onChange={(e) => updateNestedData("rr", "rideHeight", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Camber</Label>
                      <Input
                        value={setupData.rr.camber}
                        onChange={(e) => updateNestedData("rr", "camber", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Label className="text-xs text-muted-foreground">Trailing Arm</Label>
                      <Input
                        value={setupData.rr.trailingArm}
                        onChange={(e) => updateNestedData("rr", "trailingArm", e.target.value)}
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tire Temperature Data */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Tire Temperatures</h3>
              
              {/* Front Tire Temps */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">LF Outside | LF Center | LF Inside</Label>
                  <div className="grid grid-cols-3 gap-1">
                    <Input
                      placeholder="Outside"
                      value={setupData.frontLeft.outside}
                      onChange={(e) => updateNestedData("frontLeft", "outside", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Center"
                      value={setupData.frontLeft.center}
                      onChange={(e) => updateNestedData("frontLeft", "center", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Inside"
                      value={setupData.frontLeft.inside}
                      onChange={(e) => updateNestedData("frontLeft", "inside", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">RF Inside | RF Center | RF Outside</Label>
                  <div className="grid grid-cols-3 gap-1">
                    <Input
                      placeholder="Inside"
                      value={setupData.frontRight.inside}
                      onChange={(e) => updateNestedData("frontRight", "inside", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Center"
                      value={setupData.frontRight.center}
                      onChange={(e) => updateNestedData("frontRight", "center", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Outside"
                      value={setupData.frontRight.outside}
                      onChange={(e) => updateNestedData("frontRight", "outside", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Rear Tire Temps */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">LR Outside | LR Center | LR Inside</Label>
                  <div className="grid grid-cols-3 gap-1">
                    <Input
                      placeholder="Outside"
                      value={setupData.rearLeft.outside}
                      onChange={(e) => updateNestedData("rearLeft", "outside", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Center"
                      value={setupData.rearLeft.center}
                      onChange={(e) => updateNestedData("rearLeft", "center", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Inside"
                      value={setupData.rearLeft.inside}
                      onChange={(e) => updateNestedData("rearLeft", "inside", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">RR Inside | RR Center | RR Outside</Label>
                  <div className="grid grid-cols-3 gap-1">
                    <Input
                      placeholder="Inside"
                      value={setupData.rearRight.inside}
                      onChange={(e) => updateNestedData("rearRight", "inside", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Center"
                      value={setupData.rearRight.center}
                      onChange={(e) => updateNestedData("rearRight", "center", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Outside"
                      value={setupData.rearRight.outside}
                      onChange={(e) => updateNestedData("rearRight", "outside", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sections */}
            <div className="grid grid-cols-4 gap-6">
              {/* Track Bar */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Track Bar</h3>
                <div className="space-y-2 p-3 bg-background/30 border border-border/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Rear End Side"</Label>
                    <Input
                      value={setupData.trackBarRearEndSide}
                      onChange={(e) => updateSetupData("trackBarRearEndSide", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Frame Side"</Label>
                    <Input
                      value={setupData.trackBarFrameSide}
                      onChange={(e) => updateSetupData("trackBarFrameSide", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Split"</Label>
                    <Input
                      value={setupData.trackBarSplit}
                      onChange={(e) => updateSetupData("trackBarSplit", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Length"</Label>
                    <Input
                      value={setupData.trackBarLength}
                      onChange={(e) => updateSetupData("trackBarLength", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Rear End */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Rear End</h3>
                <div className="space-y-2 p-3 bg-background/30 border border-border/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Pinion Angle</Label>
                    <Input
                      value={setupData.rearEndPinionAngle}
                      onChange={(e) => updateSetupData("rearEndPinionAngle", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">3rd Link Angle</Label>
                    <Input
                      value={setupData.rearEnd3rdLinkAngle}
                      onChange={(e) => updateSetupData("rearEnd3rdLinkAngle", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">F. Height of 3rd Link</Label>
                    <Input
                      value={setupData.rearEndFHeight3rdLink}
                      onChange={(e) => updateSetupData("rearEndFHeight3rdLink", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">R. Height of 3rd Link</Label>
                    <Input
                      value={setupData.rearEndRHeight3rdLink}
                      onChange={(e) => updateSetupData("rearEndRHeight3rdLink", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Gears */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Gears</h3>
                <div className="space-y-2 p-3 bg-background/30 border border-border/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Gear Ratio</Label>
                    <Input
                      value={setupData.gearRatio}
                      onChange={(e) => updateSetupData("gearRatio", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Gear Set #</Label>
                    <Input
                      value={setupData.gearSetNumber}
                      onChange={(e) => updateSetupData("gearSetNumber", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">RPM</Label>
                    <Input
                      value={setupData.rpm}
                      onChange={(e) => updateSetupData("rpm", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Fuel */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Fuel</h3>
                <div className="space-y-2 p-3 bg-background/30 border border-border/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Laps</Label>
                    <Input
                      value={setupData.fuelLaps}
                      onChange={(e) => updateSetupData("fuelLaps", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Gal. Used</Label>
                    <Input
                      value={setupData.fuelGalUsed}
                      onChange={(e) => updateSetupData("fuelGalUsed", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">MPG</Label>
                    <Input
                      value={setupData.fuelMpg}
                      onChange={(e) => updateSetupData("fuelMpg", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">LPG</Label>
                    <Input
                      value={setupData.fuelLpg}
                      onChange={(e) => updateSetupData("fuelLpg", e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes/Times */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Notes/Times</Label>
              <Textarea
                value={setupData.notesTimes}
                onChange={(e) => updateSetupData("notesTimes", e.target.value)}
                placeholder="Enter notes and times..."
                className="min-h-[100px]"
              />
            </div>

            <Button 
              onClick={handleSave}
              className="w-full"
              variant="pulse"
            >
              <Save size={16} />
              Save Chassis Setup Data
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default ChassisSetupCard;