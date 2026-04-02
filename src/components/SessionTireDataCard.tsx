import { useState } from "react";
import { Thermometer, Gauge, Save, Timer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TireData {
  coldPressure: string;
  pressure: string;
  tempOutside: string;
  tempCenter: string;
  tempInside: string;
}

interface Session {
  id: string;
  type: "practice" | "qualifying" | "race";
  duration: number;
  referenceName: string;
  startTime: string;
  notes?: string;
  state?: "upcoming" | "active" | "completed";
}

interface SessionTireDataCardProps {
  sessions: Session[];
  onSaveData: (sessionId: string, data: {
    frontLeft: TireData;
    frontRight: TireData;
    rearLeft: TireData;
    rearRight: TireData;
  }) => void;
}

const SessionTireDataCard = ({ sessions, onSaveData }: SessionTireDataCardProps) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [tireData, setTireData] = useState({
    frontLeft: { coldPressure: "", pressure: "", tempOutside: "", tempCenter: "", tempInside: "" },
    frontRight: { coldPressure: "", pressure: "", tempOutside: "", tempCenter: "", tempInside: "" },
    rearLeft: { coldPressure: "", pressure: "", tempOutside: "", tempCenter: "", tempInside: "" },
    rearRight: { coldPressure: "", pressure: "", tempOutside: "", tempCenter: "", tempInside: "" }
  });

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const handleTireDataChange = (position: keyof typeof tireData, field: keyof TireData, value: string) => {
    setTireData(prev => ({
      ...prev,
      [position]: {
        ...prev[position],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    if (!selectedSessionId) return;
    onSaveData(selectedSessionId, tireData);
    // Reset form after save
    setTireData({
      frontLeft: { coldPressure: "", pressure: "", tempOutside: "", tempCenter: "", tempInside: "" },
      frontRight: { coldPressure: "", pressure: "", tempOutside: "", tempCenter: "", tempInside: "" },
      rearLeft: { coldPressure: "", pressure: "", tempOutside: "", tempCenter: "", tempInside: "" },
      rearRight: { coldPressure: "", pressure: "", tempOutside: "", tempCenter: "", tempInside: "" }
    });
  };

  const hasAnyData = () => {
    return selectedSessionId && Object.values(tireData).some(tire => 
      tire.coldPressure.trim() !== "" ||
      tire.pressure.trim() !== "" || 
      tire.tempOutside.trim() !== "" || 
      tire.tempCenter.trim() !== "" || 
      tire.tempInside.trim() !== ""
    );
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
                      Session Tire Data
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
          <CardContent>
            <div className="space-y-4">
              {/* Session Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Select Session</Label>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a session to record tire data for" />
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

              <div className="text-center text-sm text-muted-foreground mb-4">
                Record cold & hot tire pressure and temperature data
              </div>
              
              {/* Front Tires */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>Front Tires</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Front Left */}
                  <div className="space-y-2 p-3 rounded-lg bg-background/30 border border-border/50">
                    <Label className="text-xs font-medium text-muted-foreground">Front Left</Label>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Pressure</Label>
                        <div className="grid grid-cols-2 gap-1">
                          <Input
                            placeholder="Cold PSI"
                            value={tireData.frontLeft.coldPressure}
                            onChange={(e) => handleTireDataChange("frontLeft", "coldPressure", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Hot PSI"
                            value={tireData.frontLeft.pressure}
                            onChange={(e) => handleTireDataChange("frontLeft", "pressure", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Temperature</Label>
                        <div className="grid grid-cols-3 gap-1">
                          <Input
                            placeholder="Out"
                            value={tireData.frontLeft.tempOutside}
                            onChange={(e) => handleTireDataChange("frontLeft", "tempOutside", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Mid"
                            value={tireData.frontLeft.tempCenter}
                            onChange={(e) => handleTireDataChange("frontLeft", "tempCenter", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="In"
                            value={tireData.frontLeft.tempInside}
                            onChange={(e) => handleTireDataChange("frontLeft", "tempInside", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Front Right */}
                  <div className="space-y-2 p-3 rounded-lg bg-background/30 border border-border/50">
                    <Label className="text-xs font-medium text-muted-foreground">Front Right</Label>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Pressure</Label>
                        <div className="grid grid-cols-2 gap-1">
                          <Input
                            placeholder="Cold PSI"
                            value={tireData.frontRight.coldPressure}
                            onChange={(e) => handleTireDataChange("frontRight", "coldPressure", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Hot PSI"
                            value={tireData.frontRight.pressure}
                            onChange={(e) => handleTireDataChange("frontRight", "pressure", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Temperature</Label>
                        <div className="grid grid-cols-3 gap-1">
                          <Input
                            placeholder="Out"
                            value={tireData.frontRight.tempOutside}
                            onChange={(e) => handleTireDataChange("frontRight", "tempOutside", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Mid"
                            value={tireData.frontRight.tempCenter}
                            onChange={(e) => handleTireDataChange("frontRight", "tempCenter", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="In"
                            value={tireData.frontRight.tempInside}
                            onChange={(e) => handleTireDataChange("frontRight", "tempInside", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rear Tires */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>Rear Tires</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Rear Left */}
                  <div className="space-y-2 p-3 rounded-lg bg-background/30 border border-border/50">
                    <Label className="text-xs font-medium text-muted-foreground">Rear Left</Label>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Pressure</Label>
                        <div className="grid grid-cols-2 gap-1">
                          <Input
                            placeholder="Cold PSI"
                            value={tireData.rearLeft.coldPressure}
                            onChange={(e) => handleTireDataChange("rearLeft", "coldPressure", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Hot PSI"
                            value={tireData.rearLeft.pressure}
                            onChange={(e) => handleTireDataChange("rearLeft", "pressure", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Temperature</Label>
                        <div className="grid grid-cols-3 gap-1">
                          <Input
                            placeholder="Out"
                            value={tireData.rearLeft.tempOutside}
                            onChange={(e) => handleTireDataChange("rearLeft", "tempOutside", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Mid"
                            value={tireData.rearLeft.tempCenter}
                            onChange={(e) => handleTireDataChange("rearLeft", "tempCenter", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="In"
                            value={tireData.rearLeft.tempInside}
                            onChange={(e) => handleTireDataChange("rearLeft", "tempInside", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Rear Right */}
                  <div className="space-y-2 p-3 rounded-lg bg-background/30 border border-border/50">
                    <Label className="text-xs font-medium text-muted-foreground">Rear Right</Label>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Pressure</Label>
                        <div className="grid grid-cols-2 gap-1">
                          <Input
                            placeholder="Cold PSI"
                            value={tireData.rearRight.coldPressure}
                            onChange={(e) => handleTireDataChange("rearRight", "coldPressure", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Hot PSI"
                            value={tireData.rearRight.pressure}
                            onChange={(e) => handleTireDataChange("rearRight", "pressure", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Temperature</Label>
                        <div className="grid grid-cols-3 gap-1">
                          <Input
                            placeholder="Out"
                            value={tireData.rearRight.tempOutside}
                            onChange={(e) => handleTireDataChange("rearRight", "tempOutside", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Mid"
                            value={tireData.rearRight.tempCenter}
                            onChange={(e) => handleTireDataChange("rearRight", "tempCenter", e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="In"
                            value={tireData.rearRight.tempInside}
                            onChange={(e) => handleTireDataChange("rearRight", "tempInside", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSave}
                disabled={!hasAnyData()}
                className="w-full"
                variant="pulse"
              >
                <Save size={16} />
                Save Session Tire Data
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default SessionTireDataCard;