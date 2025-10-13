import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Bug, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DebugResult {
  issue: string;
  fix: string;
  fixedCode: string;
  preventionTips: string;
}

interface AIDebuggerProps {
  code: string;
  language: string;
  fileName: string;
  onCodeFixed: (fixedCode: string) => void;
}

export const AIDebugger = ({ code, language, fileName, onCodeFixed }: AIDebuggerProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [detectedErrors, setDetectedErrors] = useState<string[]>([]);
  const { toast } = useToast();

  // Monitor console errors
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const errorMsg = args.join(' ');
      setDetectedErrors(prev => {
        if (!prev.includes(errorMsg)) {
          return [...prev, errorMsg];
        }
        return prev;
      });
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const handleDebug = async (errorMessage: string) => {
    setIsAnalyzing(true);
    setDebugResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-debugger', {
        body: {
          error: errorMessage,
          code,
          language,
          fileName
        }
      });

      if (error) throw error;

      const result = data?.result;
      if (result) {
        setDebugResult(result);
        toast({
          title: "Issue detected!",
          description: result.issue,
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
    if (debugResult?.fixedCode) {
      onCodeFixed(debugResult.fixedCode);
      toast({
        title: "Fix applied!",
        description: "Code has been updated with the fix.",
      });
      setDebugResult(null);
      setDetectedErrors([]);
    }
  };

  const handleClearErrors = () => {
    setDetectedErrors([]);
    setDebugResult(null);
  };

  return (
    <Card className="m-4 bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bug className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Debugger</h3>
        </div>

        {detectedErrors.length > 0 && (
          <Alert className="mb-3" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errors Detected ({detectedErrors.length})</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {detectedErrors.slice(-3).map((error, idx) => (
                  <div key={idx} className="text-sm font-mono bg-background/50 p-2 rounded">
                    {error.substring(0, 100)}...
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm"
                  onClick={() => handleDebug(detectedErrors[detectedErrors.length - 1])}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Analyze & Fix'
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleClearErrors}
                >
                  Clear
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {debugResult && (
          <div className="space-y-3">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Issue Identified</AlertTitle>
              <AlertDescription>
                <p className="mt-2">{debugResult.issue}</p>
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-medium mb-2 text-sm">Fix Explanation</h4>
              <p className="text-sm text-muted-foreground">{debugResult.fix}</p>
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-medium mb-2 text-sm">Prevention Tips</h4>
              <p className="text-sm text-muted-foreground">{debugResult.preventionTips}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleApplyFix} className="bg-primary hover:bg-primary/90">
                Apply Fix
              </Button>
              <Button variant="outline" onClick={() => setDebugResult(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {!detectedErrors.length && !debugResult && (
          <div className="text-sm text-muted-foreground">
            No errors detected. The debugger monitors console errors and helps fix them automatically.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
