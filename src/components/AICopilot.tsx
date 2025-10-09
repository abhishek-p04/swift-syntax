import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, Download, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ProjectStructure {
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  folders: string[];
}

interface AICopilotProps {
  onFilesGenerated: (files: ProjectStructure) => void;
  existingFiles: Array<{ name: string; path: string; content: string }>;
}

export const AICopilot = ({ onFilesGenerated, existingFiles }: AICopilotProps) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<ProjectStructure | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const normalizedMap = new Map<string, { path: string; content: string; name: string }>();
      for (const f of existingFiles) {
        const p = '/' + String(f.path || '').replace(/^\/+/, '');
        normalizedMap.set(p, { path: p, content: f.content, name: f.name });
      }
      const { data, error } = await supabase.functions.invoke('ai-copilot', {
        body: {
          prompt: prompt.trim(),
          existingFiles: Array.from(normalizedMap.values())
        }
      });

      if (error) throw error;

      const structure = data?.structure;
      if (structure?.hasConflicts) {
        setPreviewData(structure);
        setShowPreview(true);
      } else if (structure) {
        onFilesGenerated(structure);
        setPrompt('');
        toast({
          title: "Project generated!",
          description: `Created ${structure.files.length} files and ${structure.folders.length} folders.`,
        });
      } else {
        throw new Error('Invalid response from AI copilot');
      }
    } catch (error) {
      console.error('Error generating project:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : 'Failed to generate project',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmGeneration = () => {
    if (previewData) {
      onFilesGenerated(previewData);
      setPreviewData(null);
      setShowPreview(false);
      setPrompt('');
      toast({
        title: "Project generated!",
        description: `Created ${previewData.files.length} files and ${previewData.folders.length} folders.`,
      });
    }
  };

  const handleDownloadProject = async () => {
    if (!existingFiles.length) {
      toast({
        title: "No files to download",
        description: "Generate a project first or create some files.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('download-project', {
        body: { files: existingFiles }
      });

      if (error) throw error;

      // Create and download the ZIP file
      const blob = new Blob([data.zipData], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download complete!",
        description: "Project downloaded as ZIP file.",
      });
    } catch (error) {
      console.error('Error downloading project:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : 'Failed to download project',
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="m-4 bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">AI Copilot</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Create a Flask app with routes and requirements.txt..."
                className="flex-1 bg-input border-border text-foreground"
                disabled={isGenerating}
              />
              <Button 
                type="submit" 
                disabled={isGenerating || !prompt.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadProject}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download ZIP
              </Button>
            </div>
          </form>

          <div className="mt-3 text-sm text-muted-foreground">
            Examples: "Add Dockerfile", "Create React component with hooks", "Update package.json with Express"
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Preview Changes
            </DialogTitle>
            <DialogDescription>
              The AI wants to modify existing files. Review the changes below:
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Files to create/modify:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {previewData.files.map((file, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      <div className="font-mono text-foreground">{file.path}</div>
                      <div className="text-muted-foreground mt-1">
                        {file.content.split('\n').length} lines • {file.language}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {previewData.folders.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Folders to create:</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewData.folders.map((folder, index) => (
                      <div key={index} className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {folder}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmGeneration} className="bg-primary hover:bg-primary/90">
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};