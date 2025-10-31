import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ClipboardList, Settings } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const mockProgressData = [
  { week: "Week 1", pain: 7, stiffness: 6, gaitSpeed: 0.8 },
  { week: "Week 2", pain: 6, stiffness: 5, gaitSpeed: 0.9 },
  { week: "Week 3", pain: 5, stiffness: 5, gaitSpeed: 1.0 },
  { week: "Week 4", pain: 4, stiffness: 4, gaitSpeed: 1.1 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        // Get user email as name for now
        setUserName(session.user.email?.split("@")[0] || "User");
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-4 border-primary p-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-4xl font-bold">Welcome, {userName}!</h1>
          <Button variant="outline" size="icon" onClick={handleLogout}>
            <Settings className="h-8 w-8" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Primary CTA */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl">
          <CardContent className="p-12 text-center">
            <h2 className="text-4xl font-bold mb-6">Ready for This Week's Check-in?</h2>
            <Button 
              variant="secondary" 
              size="lg" 
              className="text-2xl h-24 px-16"
              onClick={() => navigate("/checkin")}
            >
              Start This Week's Check-in
            </Button>
          </CardContent>
        </Card>

        {/* Progress Charts */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Subjective Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">My Progress (Subjective)</CardTitle>
              <CardDescription className="text-lg">Pain and stiffness scores over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" style={{ fontSize: '16px' }} />
                  <YAxis domain={[0, 10]} style={{ fontSize: '16px' }} />
                  <Tooltip contentStyle={{ fontSize: '16px' }} />
                  <Legend wrapperStyle={{ fontSize: '16px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="pain" 
                    stroke="hsl(var(--chart-pain))" 
                    strokeWidth={3}
                    name="Pain Score"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stiffness" 
                    stroke="hsl(var(--chart-stiffness))" 
                    strokeWidth={3}
                    name="Stiffness Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gait Test Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">My Progress (Gait Test)</CardTitle>
              <CardDescription className="text-lg">Walking speed improvement</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" style={{ fontSize: '16px' }} />
                  <YAxis domain={[0, 2]} style={{ fontSize: '16px' }} />
                  <Tooltip contentStyle={{ fontSize: '16px' }} />
                  <Legend wrapperStyle={{ fontSize: '16px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="gaitSpeed" 
                    stroke="hsl(var(--chart-gait))" 
                    strokeWidth={3}
                    name="Gait Speed (m/s)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 pb-8">
          <Button 
            variant="default" 
            size="lg" 
            className="flex-1"
          >
            <Home className="h-8 w-8 mr-2" />
            Dashboard
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="flex-1"
            onClick={() => navigate("/exercises")}
          >
            <ClipboardList className="h-8 w-8 mr-2" />
            My Exercises
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
