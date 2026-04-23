import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Droplet, AlertCircle, Phone, Lock, ShieldCheck, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Login Form                                                           */
/* ------------------------------------------------------------------ */
function LoginForm() {
  const { submitLogin, isLoading, error, clearError } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(v);
    if (error) clearError();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length !== 10) return;
    if (!password) return;
    await submitLogin(phone, password);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium text-foreground">
          Phone Number
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={handlePhoneChange}
            className="pl-10 h-11"
            disabled={isLoading}
            required
            autoComplete="tel"
            maxLength={10}
          />
        </div>
        {phone.length > 0 && phone.length < 10 && (
          <p className="text-xs text-muted-foreground">{10 - phone.length} more digits needed</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) clearError(); }}
            className="pl-10 h-11"
            disabled={isLoading}
            required
            autoComplete="current-password"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full h-11 text-sm font-semibold"
        disabled={isLoading || phone.length !== 10 || !password}
      >
        {isLoading ? "Verifying…" : "Login"}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* OTP Verification Form                                                */
/* ------------------------------------------------------------------ */
function OtpForm() {
  const { phone, submitOtp, resendOtp, isLoading, error, clearError } = useAuth();
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const minutes = String(Math.floor(countdown / 60)).padStart(2, "0");
  const seconds = String(countdown % 60).padStart(2, "0");

  function handleOtpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(v);
    if (error) clearError();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;
    await submitOtp(otp);
  }

  async function handleResend() {
    await resendOtp();
    setOtp("");
    setCountdown(300);
    setResent(true);
    setTimeout(() => setResent(false), 3000);
  }

  const maskedPhone = phone.slice(0, 2) + "••••••" + phone.slice(-2);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-center">
        <ShieldCheck className="w-5 h-5 text-primary mx-auto mb-2" />
        <p className="text-foreground font-medium">OTP sent to +91 {maskedPhone}</p>
        <p className="text-muted-foreground text-xs mt-1">Check the server console for your OTP</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="otp" className="text-sm font-medium text-foreground">
          6-Digit OTP
        </Label>
        <Input
          id="otp"
          type="tel"
          inputMode="numeric"
          placeholder="• • • • • •"
          value={otp}
          onChange={handleOtpChange}
          className="h-14 text-center text-2xl font-mono tracking-[0.5em] letter-spacing"
          disabled={isLoading}
          required
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
        />
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            "font-medium",
            countdown <= 60 ? "text-destructive" : "text-muted-foreground"
          )}>
            {countdown > 0 ? `Expires in ${minutes}:${seconds}` : "OTP expired"}
          </span>
          {resent && (
            <span className="text-green-600 font-medium">OTP resent!</span>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full h-11 text-sm font-semibold"
        disabled={isLoading || otp.length !== 6 || countdown <= 0}
      >
        {isLoading ? "Verifying…" : "Verify OTP"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full h-9 text-sm text-muted-foreground gap-2"
        onClick={handleResend}
        disabled={isLoading}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Resend OTP
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Main Login Page                                                      */
/* ------------------------------------------------------------------ */
export default function LoginPage() {
  const { step } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Droplet className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Milk Bill System</h1>
          <p className="text-sm text-muted-foreground mt-1">Dairy Cooperative Management</p>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">
              {step === "login" ? "Sign in to your account" : "Enter verification code"}
            </CardTitle>
            <CardDescription className="text-sm">
              {step === "login"
                ? "Use your registered phone number and password."
                : "A 6-digit OTP has been generated. Check the server console."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "login" || step === "authenticated" ? <LoginForm /> : <OtpForm />}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Secured with 2-step OTP verification
        </p>
      </div>
    </div>
  );
}
