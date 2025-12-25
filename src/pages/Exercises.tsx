import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ClipboardList, ArrowRight } from "lucide-react";

export const exercises = [
  { id: 1, name: "Heel Slides", sets: 3, reps: 15, description: "Strengthen your hamstrings by sliding your heel towards you while lying down.", leg: "right" },
  { id: 2, name: "Quad Sets", sets: 3, reps: 20, description: "Tighten your thigh muscles while keeping your leg straight and pressing knee down.", leg: "bilateral" },
  { id: 3, name: "Straight Leg Raises", sets: 3, reps: 12, description: "Lift your leg straight up while keeping your knee locked to strengthen hip and quad.", leg: "right" },
  { id: 4, name: "Ankle Pumps", sets: 3, reps: 25, description: "Move your foot up and down to improve circulation and reduce swelling.", leg: "bilateral" },
  { id: 5, name: "Short Arc Quads", sets: 3, reps: 15, description: "Place a roll under your knee and straighten your lower leg.", leg: "right" },
  { id: 6, name: "Hamstring Curls", sets: 3, reps: 12, description: "Stand and bend your knee to bring your heel towards your glutes.", leg: "right" },
  { id: 7, name: "Hip Abduction", sets: 3, reps: 12, description: "Stand and lift your leg out to the side to strengthen hip muscles.", leg: "right" },
  { id: 8, name: "Long Arc Quads", sets: 3, reps: 15, description: "Sit on a chair and straighten your knee fully.", leg: "right" },
];

const Exercises = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="bg-card border-b-4 border-primary p-6 shadow-md mb-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold mb-2">Your Weekly Exercise Plan</h1>
          <p className="text-2xl text-muted-foreground">Perform these exercises once a day</p>
        </div>
      </header>

      {/* Exercise List */}
      <main className="max-w-7xl mx-auto px-6">
        <div className="grid gap-6">
          {exercises.map((exercise) => (
            <Card
              key={exercise.id}
              className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-primary"
              onClick={() => navigate(`/exercise/${exercise.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-3xl mb-2">{exercise.name}</CardTitle>
                    <CardDescription className="text-xl">
                      {exercise.description}
                    </CardDescription>
                  </div>
                  <ArrowRight className="h-10 w-10 text-primary flex-shrink-0 ml-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-8 text-xl">
                  <div>
                    <span className="font-semibold text-primary">{exercise.sets}</span> Sets
                  </div>
                  <div>
                    <span className="font-semibold text-primary">{exercise.reps}</span> Reps
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t-4 border-primary shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-around p-4">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 mx-2"
            onClick={() => navigate("/dashboard")}
          >
            <Home className="h-8 w-8 mr-2" />
            Dashboard
          </Button>
          <Button
            variant="default"
            size="lg"
            className="flex-1 mx-2"
          >
            <ClipboardList className="h-8 w-8 mr-2" />
            My Exercises
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Exercises;
