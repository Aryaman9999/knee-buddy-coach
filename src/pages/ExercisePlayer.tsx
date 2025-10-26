import { useState, useEffect, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pause, Play, StopCircle, CheckCircle2 } from "lucide-react";
import ExerciseAvatar from "@/components/ExerciseAvatar";

const exerciseData: Record<string, { name: string; sets: number; reps: number }> = {
  "1": { name: "Heel Slides", sets: 3, reps: 15 },
  "2": { name: "Quad Sets", sets: 3, reps: 20 },
  "3": { name: "Straight Leg Raises", sets: 3, reps: 12 },
  "4": { name: "Ankle Pumps", sets: 3, reps: 25 },
  "5": { name: "Short Arc Quads", sets: 3, reps: 15 },
  "6": { name: "Hamstring Curls", sets: 3, reps: 12 },
};

const ExercisePlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [feedback, setFeedback] = useState("Ready to begin!");

  const exercise = id ? exerciseData[id] : null;

  useEffect(() => {
    if (!exercise || isPaused) return;

    const feedbackMessages = [
      "Great form!",
      "Keep it up!",
      "Excellent movement!",
      "You're doing great!",
      "Perfect technique!",
    ];

    const interval = setInterval(() => {
      setCurrentRep((prev) => {
        if (prev < exercise.reps) {
          setFeedback(feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)]);
          return prev + 1;
        } else {
          if (currentSet < exercise.sets) {
            setCurrentSet(currentSet + 1);
            return 0;
          } else {
            clearInterval(interval);
            setFeedback("Set complete! Great work!");
          }
          return prev;
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [exercise, currentSet, isPaused]);

  if (!exercise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Exercise not found</h2>
            <Button onClick={() => navigate("/exercises")}>Back to Exercises</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEndSession = () => {
    navigate("/exercises");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Exercise Info Header */}
      <div className="bg-primary text-primary-foreground p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">{exercise.name}</h1>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              Set {currentSet} of {exercise.sets}
            </div>
            <div className="text-2xl">
              Reps: {currentRep} / {exercise.reps}
            </div>
          </div>
        </div>
      </div>

      {/* Main Exercise Visualization */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-6xl h-[600px] bg-muted/20 border-4 border-primary">
          <CardContent className="h-full flex items-center justify-center">
            {currentRep >= exercise.reps && currentSet >= exercise.sets ? (
              <div className="text-center space-y-8">
                <CheckCircle2 className="h-48 w-48 text-success mx-auto" />
                <h2 className="text-5xl font-bold text-success">Exercise Complete!</h2>
                <p className="text-2xl">Excellent work on completing all sets!</p>
              </div>
            ) : (
              <div className="w-full h-full">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <Play className="h-32 w-32 text-primary mx-auto animate-pulse" />
                      <p className="text-2xl font-bold text-primary">Loading 3D Avatar...</p>
                    </div>
                  </div>
                }>
                  <Canvas
                    shadows
                    gl={{ 
                      antialias: true, 
                      alpha: true,
                      preserveDrawingBuffer: true 
                    }}
                    onCreated={({ gl }) => {
                      gl.setClearColor('#f8fafb', 1);
                    }}
                  >
                    <PerspectiveCamera makeDefault position={[0, 1.5, 3]} />
                    <OrbitControls 
                      enableZoom={true}
                      enablePan={false}
                      minDistance={2}
                      maxDistance={5}
                      maxPolarAngle={Math.PI / 2}
                    />
                    <ExerciseAvatar 
                      exerciseId={id || "1"} 
                      currentRep={currentRep}
                      isPaused={isPaused}
                    />
                  </Canvas>
                </Suspense>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feedback Box */}
      <div className="bg-card border-t-4 border-primary p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-accent/10 border-2 border-accent">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-4 w-4 bg-success rounded-full animate-pulse"></div>
                <p className="text-3xl font-semibold text-accent-foreground">{feedback}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="bg-card border-t-4 border-primary p-6 shadow-2xl">
        <div className="max-w-7xl mx-auto flex gap-4">
          <Button
            variant={isPaused ? "default" : "outline"}
            size="lg"
            className="flex-1"
            onClick={() => setIsPaused(!isPaused)}
            disabled={currentRep >= exercise.reps && currentSet >= exercise.sets}
          >
            {isPaused ? (
              <>
                <Play className="h-8 w-8 mr-2" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-8 w-8 mr-2" />
                Pause
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="flex-1"
            onClick={handleEndSession}
          >
            <StopCircle className="h-8 w-8 mr-2" />
            End Session
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExercisePlayer;
