import { useState } from "react";
import { Eye, EyeOff, Mail, Phone } from "lucide-react";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***-${digits.slice(-4)}`;
}

interface MaskedContactProps {
  email: string;
  phone?: string | null;
}

export function MaskedContact({ email, phone }: MaskedContactProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
      <span className="flex items-center gap-1">
        <Mail size={10} /> {revealed ? email : maskEmail(email)}
      </span>
      {phone && (
        <span className="flex items-center gap-1">
          <Phone size={10} /> {revealed ? phone : maskPhone(phone)}
        </span>
      )}
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="ml-1 p-0.5 rounded hover:bg-muted transition-colors"
        title={revealed ? "Hide contact info" : "Reveal contact info"}
      >
        {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}
