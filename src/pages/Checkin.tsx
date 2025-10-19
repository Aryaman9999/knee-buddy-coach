import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const safetyQuestions = [
  "Are you experiencing severe, constant knee pain that doesn't improve with rest?",
  "Do you have fever, redness, or warmth around your knee joint?",
  "Have you recently injured your knee with significant swelling or inability to bear weight?"
];

const questionnaireQuestions = [
  { id: 1, text: "How would you rate your average knee pain over the past week?", scale: ["None", "Mild", "Moderate", "Severe", "Extreme"] },
  { id: 2, text: "How would you rate your knee stiffness in the morning?", scale: ["None", "Mild", "Moderate", "Severe", "Extreme"] },
  { id: 3, text: "How much difficulty do you have walking on flat surfaces?", scale: ["None", "Mild", "Moderate", "Severe", "Extreme"] },
  { id: 4, text: "How much difficulty do you have going up or down stairs?", scale: ["None", "Mild", "Moderate", "Severe", "Extreme"] },
  { id: 5, text: "How would you rate your ability to perform daily activities?", scale: ["Excellent", "Good", "Fair", "Poor", "Very Poor"] },
];

const Checkin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [safetyAnswers, setSafetyAnswers] = useState<boolean[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<number[]>([]);
  const [sensorConnected, setSensorConnected] = useState(false);
  const [testComplete, setTestComplete] = useState(false);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleSafetyAnswer = (answer: boolean) => {
    if (answer === true) {
      toast({
        title: "Please Consult Your Doctor",
        description: "Based on your answers, we recommend consulting with your healthcare provider before continuing.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
    
    const newAnswers = [...safetyAnswers, answer];
    setSafetyAnswers(newAnswers);
    
    if (newAnswers.length === safetyQuestions.length) {
      setStep(2);
    }
  };

  const handleQuestionnaireAnswer = (value: number) => {
    const newAnswers = [...questionnaireAnswers, value];
    setQuestionnaireAnswers(newAnswers);
    
    if (currentQuestion < questionnaireQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setStep(3);
    }
  };

  const handleConnectSensors = () => {
    // Simulate sensor connection
    setTimeout(() => {
      setSensorConnected(true);
      toast({
        title: "Sensors Connected",
        description: "Ready to start gait test!",
      });
    }, 1500);
  };

  const handleStartTest = () => {
    // Simulate test completion
    setTimeout(() => {
      setTestComplete(true);
      setStep(4);
    }, 3000);
  };

  const handleComplete = () => {
    toast({
      title: "Check-in Complete!",
      description: "Your exercise plan has been updated.",
    });
    navigate("/exercises");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between text-xl">
                <span className="font-semibold">Step {step} of {totalSteps}</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Safety Questions */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-4xl flex items-center gap-3">
                <AlertCircle className="h-10 w-10 text-destructive" />
                Safety Check
              </CardTitle>
              <CardDescription className="text-xl">
                Please answer these important safety questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {safetyQuestions.map((question, index) => (
                index === safetyAnswers.length && (
                  <div key={index} className="space-y-6">
                    <p className="text-2xl font-medium leading-relaxed">{question}</p>
                    <div className="flex gap-4">
                      <Button 
                        variant="destructive" 
                        size="lg" 
                        className="flex-1"
                        onClick={() => handleSafetyAnswer(true)}
                      >
                        Yes
                      </Button>
                      <Button 
                        variant="success" 
                        size="lg" 
                        className="flex-1"
                        onClick={() => handleSafetyAnswer(false)}
                      >
                        No
                      </Button>
                    </div>
                  </div>
                )
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Questionnaire */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-4xl">Health Questionnaire</CardTitle>
              <CardDescription className="text-xl">
                Question {currentQuestion + 1} of {questionnaireQuestions.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <p className="text-2xl font-medium leading-relaxed">
                {questionnaireQuestions[currentQuestion].text}
              </p>
              <div className="grid gap-4">
                {questionnaireQuestions[currentQuestion].scale.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="lg"
                    className="text-xl h-16"
                    onClick={() => handleQuestionnaireAnswer(index)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
              {currentQuestion > 0 && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setCurrentQuestion(currentQuestion - 1);
                    setQuestionnaireAnswers(questionnaireAnswers.slice(0, -1));
                  }}
                >
                  Back
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Gait Test */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-4xl flex items-center gap-3">
                <Activity className="h-10 w-10 text-primary" />
                Gait Test
              </CardTitle>
              <CardDescription className="text-xl">
                Measure your walking speed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 text-center">
              {!sensorConnected ? (
                <>
                  <p className="text-2xl">Please stand up and prepare to walk 10 steps.</p>
                  <Button size="lg" onClick={handleConnectSensors}>
                    Connect to Sensors
                  </Button>
                </>
              ) : !testComplete ? (
                <>
                  <p className="text-2xl text-success">Sensors Connected!</p>
                  <p className="text-xl">Press Start when ready to begin walking.</p>
                  <Button variant="success" size="lg" onClick={handleStartTest}>
                    Start Test
                  </Button>
                </>
              ) : (
                <div className="space-y-6">
                  <CheckCircle2 className="h-24 w-24 text-success mx-auto" />
                  <p className="text-3xl font-bold text-success">Test Complete!</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Completion */}
        {step === 4 && (
          <Card className="bg-gradient-to-br from-success to-success/80 text-success-foreground">
            <CardContent className="p-12 text-center space-y-8">
              <CheckCircle2 className="h-32 w-32 mx-auto" />
              <h2 className="text-5xl font-bold">Check-in Complete!</h2>
              <p className="text-2xl">We have updated your exercise plan based on your progress.</p>
              <Button 
                variant="secondary" 
                size="lg" 
                className="text-2xl h-20 px-12"
                onClick={handleComplete}
              >
                See My New Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Checkin;
