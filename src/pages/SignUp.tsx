import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Car, Mail, Lock, UserPlus, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import racingCockpit from '@/assets/racing-cockpit.jpg';

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp, user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (!phone.startsWith('+')) {
      toast({
        title: "Invalid phone number",
        description: "Please enter your phone number with country code (e.g. +1 for US).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { phone },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to send code');
      }

      toast({
        title: "Code sent!",
        description: `A 6-digit verification code has been sent to ${phone}.`,
      });
      setStep('verify');
    } catch (err: any) {
      toast({
        title: "Failed to send code",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify the OTP code
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-code', {
        body: { phone, code: otpCode },
      });

      if (verifyError || !verifyData?.success) {
        throw new Error(verifyData?.error || verifyError?.message || 'Invalid code');
      }

      // Code verified — create account
      const { error: signUpError } = await signUp(email, password);

      if (signUpError) {
        throw signUpError;
      }

      toast({
        title: "Account created!",
        description: "Check your email to confirm your account, then log in.",
      });
      navigate('/');
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${racingCockpit})` }}
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Car size={48} className="text-primary" />
            <h1 className="text-6xl font-bold text-white">TRACK SIDE</h1>
          </div>
          <p className="text-xl text-white/80">Professional Racing Management</p>
        </div>

        <div className="bg-black/80 backdrop-blur-sm p-8 rounded-2xl border border-white/20 w-full max-w-md">
          {step === 'details' ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Create Account
              </h2>

              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      placeholder="Enter email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      placeholder="+1 555 123 4567"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      placeholder="Create password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      placeholder="Confirm password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Phone size={20} className="mr-2" /> Send Verification Code</>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                Verify Your Phone
              </h2>
              <p className="text-white/60 text-sm text-center mb-6">
                Enter the 6-digit code sent to {phone}
              </p>

              <form onSubmit={handleVerifyAndSignUp} className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => setOtpCode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={1} className="bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={2} className="bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={3} className="bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={4} className="bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={5} className="bg-white/10 border-white/30 text-white" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><ShieldCheck size={20} className="mr-2" /> Verify & Create Account</>
                  )}
                </Button>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="text-white/70 hover:text-white text-sm transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCode as any}
                    className="text-primary hover:text-primary/80 text-sm transition-colors"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-white/70 hover:text-white text-sm transition-colors"
            >
              Already have an account? Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
