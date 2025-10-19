import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Activity } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToDisclaimer) {
      toast({
        title: "Agreement Required",
        description: "You must agree to the safety disclaimer to create an account.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast({
        title: "Sign Up Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created",
        description: "Welcome to Knee Health Coach! Redirecting...",
      });
    }
    setLoading(false);
  };

  const safetyDisclaimer = "Important: This app is a wellness tool, not a medical device. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your doctor or physiotherapist before beginning any new exercise program.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Activity className="h-20 w-20 text-primary" />
          </div>
          <CardTitle className="text-5xl">Knee Health Coach</CardTitle>
          <CardDescription className="text-xl">
            {isLogin ? "Welcome back! Please log in to continue." : "Create your account to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-2xl">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-16 text-xl"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="password" className="text-2xl">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-16 text-xl"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsLogin(false)}
              >
                Need an account? Sign Up
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="signup-email" className="text-2xl">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-16 text-xl"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="signup-password" className="text-2xl">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Choose a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-16 text-xl"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="confirm-password" className="text-2xl">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Enter password again"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-16 text-xl"
                />
              </div>
              
              <div className="bg-warning/10 border-2 border-warning rounded-lg p-6 space-y-4">
                <h3 className="font-bold text-2xl text-warning-foreground">Safety Disclaimer</h3>
                <p className="text-lg leading-relaxed">{safetyDisclaimer}</p>
                
                <div className="flex items-start space-x-4 pt-2">
                  <Checkbox
                    id="disclaimer"
                    checked={agreedToDisclaimer}
                    onCheckedChange={(checked) => setAgreedToDisclaimer(checked as boolean)}
                    className="h-8 w-8 mt-1"
                  />
                  <Label htmlFor="disclaimer" className="text-xl leading-relaxed cursor-pointer">
                    I have read and agree to the safety disclaimer.
                  </Label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={loading || !agreedToDisclaimer}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsLogin(true)}
              >
                Already have an account? Log In
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
