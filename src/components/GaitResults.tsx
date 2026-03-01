import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GaitAnalysisResult } from "@/types/gaitAnalysis";
import { CheckCircle2, AlertTriangle, AlertCircle, TrendingUp, Activity, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GaitResultsProps {
  result: GaitAnalysisResult;
  onComplete: () => void;
}

const GaitResults = ({ result, onComplete }: GaitResultsProps) => {
  const navigate = useNavigate();

  const getStatusIcon = () => {
    switch (result.overallStatus) {
      case 'good':
        return <CheckCircle2 className="h-16 w-16 text-green-500" />;
      case 'fair':
        return <AlertTriangle className="h-16 w-16 text-yellow-500" />;
      case 'needs_attention':
        return <AlertCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (result.overallStatus) {
      case 'good':
        return 'Great! Your gait pattern is within normal parameters.';
      case 'fair':
        return 'Some areas need attention to improve your walking pattern.';
      case 'needs_attention':
        return 'Significant limitations detected. Follow the recommended exercises.';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'bg-red-500';
      case 'moderate': return 'bg-orange-500';
      case 'mild': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Overall Status */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {getStatusIcon()}
            <div>
              <h2 className="text-2xl font-bold mb-2">Gait Analysis Complete</h2>
              <p className="text-muted-foreground">{getStatusMessage()}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>{result.metrics.stepCount} steps analyzed</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>{result.metrics.testDuration.toFixed(1)}s duration</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Right Knee ROM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{result.metrics.rightKneeROM.toFixed(1)}°</div>
            <p className="text-xs text-muted-foreground">Target: 60-70°</p>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${result.metrics.rightKneeROM >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((result.metrics.rightKneeROM / 70) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Left Knee ROM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{result.metrics.leftKneeROM.toFixed(1)}°</div>
            <p className="text-xs text-muted-foreground">Target: 60-70°</p>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${result.metrics.leftKneeROM >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((result.metrics.leftKneeROM / 70) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Symmetry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{result.metrics.asymmetryScore.toFixed(1)}°</div>
            <p className="text-xs text-muted-foreground">Difference between legs</p>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${result.metrics.asymmetryScore < 10 ? 'bg-green-500' : result.metrics.asymmetryScore < 15 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((result.metrics.asymmetryScore / 20) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Stability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {result.metrics.lateralStabilityScore < 0.25 ? 'Good' : result.metrics.lateralStabilityScore < 0.35 ? 'Fair' : 'Poor'}
            </div>
            <p className="text-xs text-muted-foreground">Lateral knee control</p>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${result.metrics.lateralStabilityScore < 0.25 ? 'bg-green-500' : result.metrics.lateralStabilityScore < 0.35 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((result.metrics.lateralStabilityScore / 0.5) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Findings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Findings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.diagnoses.map((diagnosis, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <div className={`w-1 h-full rounded-full ${getSeverityColor(diagnosis.severity)}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{diagnosis.type.replace(/_/g, ' ')}</span>
                  <Badge variant={diagnosis.severity === 'normal' ? 'default' : 'secondary'}>
                    {diagnosis.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{diagnosis.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recommended Exercises
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.recommendations.map((rec, index) => (
              <div key={index} className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{rec.exerciseName}</h4>
                    <Badge variant={rec.priority === 'high' ? 'default' : 'secondary'} className="mt-1">
                      {rec.priority} priority
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{rec.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          onClick={() => navigate('/exercises')}
          className="flex-1"
          size="lg"
        >
          Start Exercises
        </Button>
        <Button 
          onClick={onComplete}
          variant="outline"
          className="flex-1"
          size="lg"
        >
          Done
        </Button>
      </div>
    </div>
  );
};

export default GaitResults;
