import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, Lightbulb, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Issue {
  severity: 'high' | 'medium' | 'low';
  type: 'bug' | 'error' | 'warning' | 'optimization' | 'security';
  line?: number;
  description: string;
  impact: string;
}

interface Improvement {
  category: 'performance' | 'readability' | 'best-practice' | 'security';
  description: string;
}

interface Complexity {
  time: string;
  space: string;
  improved: string;
}

interface AnalysisResult {
  issues: Issue[];
  improvements: Improvement[];
  fixedCode: string;
  summary: string;
  complexity: Complexity;
}

interface AIDebuggerProps {
  code: string;
  language: string;
  fileName: string;
  onCodeFixed: (fixedCode: string) => void;
  onAnalyze?: () => void;
}

export const AIDebugger = ({ code, language, fileName, onCodeFixed, onAnalyze }: AIDebuggerProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast({
        title: "No code to analyze",
        description: "Please write some code first.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    onAnalyze?.();

    try {
      const { data, error } = await supabase.functions.invoke('ai-debugger', {
        body: {
          code,
          language,
          fileName
        }
      });

      if (error) throw error;

      const result = data?.result;
      if (result) {
        setAnalysisResult(result);
        toast({
          title: "Analysis complete!",
          description: `Found ${result.issues.length} issues and ${result.improvements.length} improvement suggestions.`,
        });
      } else {
        throw new Error('Invalid response from AI debugger');
      }
    } catch (error) {
      console.error('Error analyzing code:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : 'Failed to analyze code',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyFix = () => {
    setShowConfirmDialog(true);
  };

  const confirmApplyFix = () => {
    if (analysisResult?.fixedCode) {
      onCodeFixed(analysisResult.fixedCode);
      toast({
        title: "Changes applied!",
        description: "Code has been updated with improvements.",
      });
      setShowConfirmDialog(false);
      setAnalysisResult(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <Lightbulb className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Card className="m-4 bg-card border-border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Code Analyzer</CardTitle>
            </div>
            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              size="sm"
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Analyze Code
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!analysisResult && !isAnalyzing && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Click "Analyze Code" to scan for bugs, errors, and optimization opportunities.
            </div>
          )}

          {analysisResult && (
            <div className="space-y-4">
              {/* Summary */}
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Analysis Summary</AlertTitle>
                <AlertDescription>
                  <p className="mt-2">{analysisResult.summary}</p>
                </AlertDescription>
              </Alert>

              {/* Issues */}
              {analysisResult.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Issues Found ({analysisResult.issues.length})
                  </h4>
                  <ScrollArea className="h-[200px] rounded-md border p-3">
                    <div className="space-y-3">
                      {analysisResult.issues.map((issue, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-start gap-2">
                            <Badge variant={getSeverityColor(issue.severity)} className="gap-1">
                              {getSeverityIcon(issue.severity)}
                              {issue.severity}
                            </Badge>
                            <Badge variant="outline">{issue.type}</Badge>
                            {issue.line && <Badge variant="secondary">Line {issue.line}</Badge>}
                          </div>
                          <p className="text-sm font-medium">{issue.description}</p>
                          <p className="text-xs text-muted-foreground">{issue.impact}</p>
                          {idx < analysisResult.issues.length - 1 && <Separator className="mt-3" />}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Improvements */}
              {analysisResult.improvements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Improvement Suggestions ({analysisResult.improvements.length})
                  </h4>
                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    {analysisResult.improvements.map((improvement, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Badge variant="secondary">{improvement.category}</Badge>
                        <p className="text-sm flex-1">{improvement.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complexity Analysis */}
              {analysisResult.complexity && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Complexity Analysis
                  </h4>
                  <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                    <div><strong>Time Complexity:</strong> {analysisResult.complexity.time}</div>
                    <div><strong>Space Complexity:</strong> {analysisResult.complexity.space}</div>
                    <div className="text-primary"><strong>Improvements:</strong> {analysisResult.complexity.improved}</div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleApplyFix} className="flex-1 gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Apply Changes
                </Button>
                <Button variant="outline" onClick={() => setAnalysisResult(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Code Changes?</DialogTitle>
            <DialogDescription>
              This will replace your current code with the improved version. This action cannot be undone.
              Make sure to review the suggested changes before applying.
            </DialogDescription>
          </DialogHeader>
          {analysisResult && (
            <div className="py-4">
              <p className="text-sm font-medium mb-2">Changes to be applied:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {analysisResult.issues.length} issues will be fixed</li>
                <li>• {analysisResult.improvements.length} improvements will be applied</li>
                <li>• Code quality and efficiency will be enhanced</li>
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmApplyFix}>
              Confirm & Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
