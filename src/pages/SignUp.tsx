import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Car, Mail, Lock, Phone, ShieldCheck, Eye, EyeOff, MailCheck, ArrowLeft } from 'lucide-react';
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate('/dashboard');
    return null;
  }

  const sendVerificationEmail = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: phone ? { phone } : undefined,
      },
    });
    if (error) throw error;
  };

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

    if (phone && !phone.startsWith('+')) {
      toast({
        title: "Invalid phone number",
        description: "Include country code (e.g. +1 for US) or leave the field blank.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await sendVerificationEmail();
      toast({
        title: "Code sent!",
        description: `A verification code has been sent to ${email}.`,
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

  const handleResend = async () => {
    setLoading(true);
    try {
      await sendVerificationEmail();
      toast({
        title: "Code resent",
        description: `A new verification code has been sent to ${email}.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to resend code",
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
      // Verify the OTP — this creates and logs in the user
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup',
      });

      if (verifyError) throw verifyError;

      toast({
        title: "Account created!",
        description: "Welcome to Track Side Ops.",
      });
      navigate('/dashboard');
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
                  <Label htmlFor="phone" className="text-white flex items-center gap-2">
                    Phone Number
                    <span className="text-[10px] uppercase tracking-wider text-white/40 font-normal">Optional</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      placeholder="Create password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      placeholder="Confirm password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
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
                    <><Mail size={20} className="mr-2" /> Send Verification Code</>
                  )}
                </Button>

                <p className="text-white/50 text-xs text-center">
                  We'll email you a verification code to confirm your address.
                </p>
              </form>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <MailCheck className="text-primary" size={28} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                Check Your Email
              </h2>
              <p className="text-white/60 text-sm text-center mb-6">
                We sent a verification code to<br />
                <span className="text-white font-medium">{email}</span>
              </p>

              <form onSubmit={handleVerifyAndSignUp} className="space-y-6">
                <div className="flex flex-col items-center gap-3">
                  <Label htmlFor="otp" className="sr-only">Verification Code</Label>
                  <InputOTP
                    maxLength={8}
                    value={otpCode}
                    onChange={(v) => setOtpCode(v.replace(/\D/g, ''))}
                    containerClassName="gap-2"
                  >
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="w-9 h-12 text-lg font-mono bg-white/10 border-white/30 text-white rounded-md border-l"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="submit"
                  disabled={loading || otpCode.length !== 8}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><ShieldCheck size={20} className="mr-2" /> Verify & Create Account</>
                  )}
                </Button>

                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => { setOtpCode(''); setStep('details'); }}
                    className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResend}
                    className="text-primary hover:text-primary/80 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>

                <p className="text-white/40 text-xs text-center">
                  Didn't get it? Check your spam folder.
                </p>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
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
