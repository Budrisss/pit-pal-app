import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Car, Shield } from "lucide-react";

interface GridPassportCardProps {
  displayName: string;
  totalHours: number;
  carCount: number;
  memberSince: string;
  userId: string;
}

const GridPassportCard = ({ displayName, totalHours, carCount, memberSince, userId }: GridPassportCardProps) => {
  const manifestUrl = `${window.location.origin}/grid-manifest/${userId}`;

  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 bg-card/90">
      {/* Top accent bar */}
      <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary" />

      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Info */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="size-4 text-primary" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">GridID Passport</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">{displayName || "Racer"}</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" className="gap-1.5 py-1 px-3">
                <Clock className="size-3" />
                {totalHours} verified hrs
              </Badge>
              <Badge variant="secondary" className="gap-1.5 py-1 px-3">
                <Car className="size-3" />
                {carCount} car{carCount !== 1 ? "s" : ""}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Member since {new Date(memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Right: QR Code */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="bg-white p-2 rounded-lg">
              <QRCodeSVG value={manifestUrl} size={96} level="M" />
            </div>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Scan for manifest</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GridPassportCard;
