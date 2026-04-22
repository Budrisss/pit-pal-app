import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}

const ChangeEmailDialog = ({ open, onOpenChange, currentEmail }: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const reset = () => {
    setStep(1);
    setCode("");
    setNewEmail("");
    setSending(false);
    setVerifying(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const sendCode = async () => {
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: currentEmail,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      toast({ title: "Code sent", description: `Check ${currentEmail} for an 8-digit code.` });
      setStep(2);
    } catch (err: any) {
      toast({ title: "Failed to send code", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const confirmChange = async () => {
    if (code.length < 6) {
      toast({ title: "Enter the full code", variant: "destructive" });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
      toast({ title: "Enter a valid new email", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        email: currentEmail,
        token: code,
        type: "email",
      });
      if (vErr) throw vErr;

      const { error: uErr } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (uErr) throw uErr;

      toast({
        title: "Confirmation sent",
        description: `Check ${newEmail} and click the link to finalize the change.`,
      });
      handleClose(false);
    } catch (err: any) {
      toast({ title: "Failed to change email", description: err.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change email</DialogTitle>
          <DialogDescription>
            {step === 1
              ? `We'll send an 8-digit code to your current email (${currentEmail}) to confirm this change.`
              : "Enter the code we just emailed you, plus your new email address."}
          </DialogDescription>
        </DialogHeader>

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Verification code</Label>
              <InputOTP maxLength={8} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">New email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <Button onClick={sendCode} disabled={sending}>
              {sending ? "Sending..." : "Send code"}
            </Button>
          ) : (
            <Button onClick={confirmChange} disabled={verifying}>
              {verifying ? "Confirming..." : "Confirm change"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeEmailDialog;