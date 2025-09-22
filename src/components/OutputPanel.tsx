import { useState } from 'react';
import { Play, Square, Terminal, Clock, MemoryStick, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExecutionResult } from './CodeEditor';

interface OutputPanelProps {
  output: ExecutionResult | null;
  isRunning: boolean;
}

export const OutputPanel = ({ output, isRunning }: OutputPanelProps) => {
  const [activeTab, setActiveTab] = useState('output');

  const getStatusIcon = () => {
    if (isRunning) {
      return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
    }
    if (!output) {
      return <Terminal className="w-4 h-4 text-gray-400" />;
    }
    if (output.stderr || output.status?.description !== 'Accepted') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (isRunning) return 'Running...';
    if (!output) return 'Ready';
    return output.status?.description || 'Unknown';
  };

  return (
    <div className="h-full bg-editor-output border-l border-editor-sidebar-border flex flex-col">
      <div className="p-3 border-b border-editor-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <span className="text-sm font-medium">OUTPUT</span>
          </div>
          
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
            
            {output && output.time && (
              <div className="flex items-center gap-1 text-green-400">
                <Clock className="w-3 h-3" />
                <span>{output.time}s</span>
              </div>
            )}
            
            {output && output.memory && (
              <div className="flex items-center gap-1 text-blue-400">
                <MemoryStick className="w-3 h-3" />
                <span>{(output.memory / 1024).toFixed(1)}KB</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-editor-tab rounded-none">
          <TabsTrigger value="output" className="data-[state=active]:bg-editor-tab-active">
            Output
          </TabsTrigger>
          <TabsTrigger value="errors" className="data-[state=active]:bg-editor-tab-active">
            Errors
          </TabsTrigger>
          <TabsTrigger value="debug" className="data-[state=active]:bg-editor-tab-active">
            Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="output" className="flex-1 m-0">
          <ScrollArea className="h-full p-3">
            {isRunning ? (
              <div className="flex items-center gap-2 text-yellow-500">
                <Play className="w-4 h-4 animate-pulse" />
                <span className="text-sm">Executing code...</span>
              </div>
            ) : output?.stdout ? (
              <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">
                {output.stdout}
              </pre>
            ) : (
              <div className="text-gray-500 text-sm">
                No output. Run your code to see results.
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="errors" className="flex-1 m-0">
          <ScrollArea className="h-full p-3">
            {output?.stderr ? (
              <pre className="text-sm font-mono text-red-400 whitespace-pre-wrap">
                {output.stderr}
              </pre>
            ) : output?.compile_output ? (
              <pre className="text-sm font-mono text-orange-400 whitespace-pre-wrap">
                {output.compile_output}
              </pre>
            ) : (
              <div className="text-gray-500 text-sm">
                No errors found.
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="debug" className="flex-1 m-0">
          <ScrollArea className="h-full p-3">
            {output ? (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="ml-2 text-white">{output.status?.description}</span>
                  </div>
                  {output.time && (
                    <div>
                      <span className="text-gray-400">Time:</span>
                      <span className="ml-2 text-green-400">{output.time}s</span>
                    </div>
                  )}
                  {output.memory && (
                    <div>
                      <span className="text-gray-400">Memory:</span>
                      <span className="ml-2 text-blue-400">{output.memory} bytes</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 p-2 bg-editor-tab rounded">
                  <div className="text-gray-400 text-xs mb-1">Raw Response:</div>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(output, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">
                No debug information available.
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};