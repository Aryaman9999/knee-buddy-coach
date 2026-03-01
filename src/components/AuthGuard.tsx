import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthGuard = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  if (isChecking) {
    return null; // Or a loading spinner
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
};

export default AuthGuard;
