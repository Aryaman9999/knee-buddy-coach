import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pause, Play, StopCircle, CheckCircle2 } from "lucide-react";
import SensorConnection from "@/components/SensorConnection";
import { bluetoothService } from "@/services/bluetoothService";
import { SensorPacket } from "@/types/sensorData";
import { Suspense } from "react";
import ExerciseAvatar from "@/components/ExerciseAvatar";

const exerciseData: Record<string, { name: string; sets: number; reps: number }> = {
  "1": { name: "Heel Slides", sets: 3, reps: 15 },
  "2": { name: "Quad Sets", sets: 3, reps: 20 },
  "3": { name: "Straight Leg Raises", sets: 3, reps: 12 },
  "4": { name: "Ankle Pumps", sets: 3, reps: 25 },
  "5": { name: "Short Arc Quads", sets: 3, reps: 15 },
  "6": { name: "Hamstring Curls", sets: 3, reps: 12 },
};

type ExercisePhase = 'demo' | 'countdown' | 'live' | 'complete';

const ExercisePlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [feedback, setFeedback] = useState("Watch the demonstration carefully!");
  const [exercisePhase, setExercisePhase] = useState<ExercisePhase>('demo');
  const [countdownValue, setCountdownValue] = useState(3);
  const [demoTimer, setDemoTimer] = useState(10);
  const [sensorData, setSensorData] = useState<SensorPacket | null>(null);
  const [isSensorConnected, setIsSensorConnected] = useState(false);

  const exercise = id ? exerciseData[id] : null;

  // Subscribe to sensor data
  useEffect(() => {
    const unsubscribe = bluetoothService.onDataReceived((data) => {
      setSensorData(data);
    });

    return unsubscribe;
  }, []);

  // Demo phase timer
  useEffect(() => {
    if (exercisePhase !== 'demo') return;
    
    const interval = setInterval(() => {
      setDemoTimer(prev => {
        if (prev <= 1) {
          setExercisePhase('countdown');
          setFeedback("Get ready to begin!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [exercisePhase]);

  // Countdown phase timer
  useEffect(() => {
    if (exercisePhase !== 'countdown') return;
    
    const interval = setInterval(() => {
      setCountdownValue(prev => {
        if (prev <= 1) {
          setExercisePhase('live');
          setFeedback("Let's go! Follow along!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [exercisePhase]);

  // Exercise rep counter (only runs in live phase)
  useEffect(() => {
    if (!exercise || isPaused || exercisePhase !== 'live') return;

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
              setExercisePhase('complete');
              setFeedback("Exercise complete! Excellent work!");
            }
            return prev;
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [exercise, currentSet, isPaused, exercisePhase]);

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
      {/* Sensor Connection Banner */}
      <div className="bg-card border-b-2 border-primary p-4">
        <div className="max-w-7xl mx-auto">
          <SensorConnection onConnectionChange={setIsSensorConnected} />
        </div>
      </div>

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
        <Card className="w-full max-w-6xl h-[600px] bg-muted/20 border-4 border-primary relative">
          <CardContent className="h-full flex items-center justify-center">
            {exercisePhase === 'complete' ? (
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
                      mode={exercisePhase === 'demo' ? 'demo' : 'live'}
                      sensorData={sensorData}
                      isSensorConnected={isSensorConnected}
                    />
                  </Canvas>
                </Suspense>
              </div>
            )}

            {/* Demo Phase Overlay */}
            {exercisePhase === 'demo' && (
              <div className="absolute inset-0 z-10 pointer-events-none flex items-start justify-center pt-8">
                <div className="bg-primary/95 text-primary-foreground px-8 py-6 rounded-lg shadow-2xl backdrop-blur-sm border-2 border-primary-foreground/20 animate-fade-in">
                  <h2 className="text-3xl font-bold mb-2 text-center">Watch the Demonstration</h2>
                  <p className="text-xl text-center">Starting in {demoTimer} seconds...</p>
                  <div className="mt-4 flex justify-center">
                    <div className="h-2 w-64 bg-primary-foreground/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-foreground transition-all duration-1000"
                        style={{ width: `${((10 - demoTimer) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Countdown Phase Overlay */}
            {exercisePhase === 'countdown' && (
              <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center animate-scale-in">
                  <div className="text-9xl font-bold text-white mb-4 animate-pulse">
                    {countdownValue > 0 ? countdownValue : 'GO!'}
                  </div>
                  <p className="text-3xl text-white font-semibold">
                    {countdownValue === 3 && "Get Ready!"}
                    {countdownValue === 2 && "Almost there!"}
                    {countdownValue === 1 && "Here we go!"}
                    {countdownValue === 0 && "Start moving!"}
                  </p>
                </div>
              </div>
            )}

            {/* Live Mode Badge */}
            {exercisePhase === 'live' && (
              <div className="absolute top-4 right-4 z-10 bg-success/90 text-success-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in">
                <div className="h-3 w-3 bg-success-foreground rounded-full animate-pulse"></div>
                <span className="font-semibold">LIVE MODE</span>
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
            disabled={exercisePhase !== 'live'}
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
