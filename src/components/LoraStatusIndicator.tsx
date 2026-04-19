import { Radio, RadioTower, Signal, SignalLow, SignalZero } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useSimConfig } from "@/hooks/useSimStore";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

/**
 * Tiny admin-only badge showing which transport leg is active when the LoRa
 * sim flag is enabled. Hidden completely for non-admins or when the flag is off.
 */
const LoraStatusIndicator = ({ className }: { className?: string }) => {
  const { isAdmin } = useAdmin();
  const { config, enabled } = useSimConfig();

  if (!isAdmin || !enabled) return null;

  const onLora = config.cellDown;
  const Icon = config.gatewayDown ? SignalZero : onLora ? RadioTower : config.dropRate > 0.15 ? SignalLow : Signal;
  const label = config.gatewayDown ? "DOWN" : onLora ? "LoRa" : "Cell";
  const tone = config.gatewayDown
    ? "border-destructive/50 text-destructive bg-destructive/10"
    : onLora
    ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
    : "border-green-500/40 text-green-400 bg-green-500/10";

  return (
    <Link
      to="/admin/lora-sim"
      title={`LoRa sim active — transport: ${label}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105",
        tone,
        className
      )}
    >
      <Radio size={11} className="opacity-60" />
      <Icon size={12} />
      <span>{label}</span>
    </Link>
  );
};

export default LoraStatusIndicator;
