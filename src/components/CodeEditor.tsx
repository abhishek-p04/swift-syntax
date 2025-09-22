import { useState, useRef, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { FileExplorer } from './FileExplorer';
import { TabBar } from './TabBar';
import { OutputPanel } from './OutputPanel';
import { Toolbar } from './Toolbar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

export interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: string;
  path: string;
}

export interface ExecutionResult {
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  time?: string;
  memory?: number;
  status?: {
    description: string;
  };
}

const SAMPLE_FILES: CodeFile[] = [
  {
    id: '1',
    name: 'main.py',
    content: '# Welcome to Code Editor\nprint("Hello, World!")\n\n# Try running this code!',
    language: 'python',
    path: '/main.py'
  },
  {
    id: '2',
    name: 'example.js',
    content: '// JavaScript Example\nconsole.log("Hello from JavaScript!");\n\nconst fibonacci = (n) => {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n};\n\nconsole.log("Fibonacci(10):", fibonacci(10));',
    language: 'javascript',
    path: '/example.js'
  }
];

export const CodeEditor = () => {
  const [files, setFiles] = useState<CodeFile[]>(SAMPLE_FILES);
  const [activeFile, setActiveFile] = useState<CodeFile | null>(SAMPLE_FILES[0]);
  const [openTabs, setOpenTabs] = useState<CodeFile[]>([SAMPLE_FILES[0]]);
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Add keyboard shortcuts
    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        if (activeFile) {
          handleSaveFile(activeFile);
        }
      }
    });

    editor.addAction({
      id: 'run-code',
      label: 'Run Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => {
        handleRunCode();
      }
    });
  };

  const handleFileSelect = (file: CodeFile) => {
    setActiveFile(file);
    if (!openTabs.find(tab => tab.id === file.id)) {
      setOpenTabs([...openTabs, file]);
    }
  };

  const handleTabClose = (fileId: string) => {
    const newTabs = openTabs.filter(tab => tab.id !== fileId);
    setOpenTabs(newTabs);
    
    if (activeFile?.id === fileId) {
      setActiveFile(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      const updatedFile = { ...activeFile, content: value };
      setActiveFile(updatedFile);
      
      // Update in files list
      setFiles(files.map(file => 
        file.id === activeFile.id ? updatedFile : file
      ));
      
      // Update in open tabs
      setOpenTabs(openTabs.map(tab => 
        tab.id === activeFile.id ? updatedFile : tab
      ));
    }
  };

  const handleSaveFile = (file: CodeFile) => {
    // In a real app, this would save to backend
    console.log('Saving file:', file.name);
    // TODO: Save to Supabase when connected
  };

  const handleRunCode = async () => {
    if (!activeFile) return;
    
    setIsRunning(true);
    setOutput(null);
    
    try {
      // Mock execution for now - replace with Judge0 API when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (activeFile.language === 'python' && activeFile.content.includes('print("Hello, World!")')) {
        setOutput({
          stdout: 'Hello, World!\n',
          time: '0.021',
          memory: 3328,
          status: { description: 'Accepted' }
        });
      } else if (activeFile.language === 'javascript' && activeFile.content.includes('console.log')) {
        setOutput({
          stdout: 'Hello from JavaScript!\nFibonacci(10): 55\n',
          time: '0.015',
          memory: 2048,
          status: { description: 'Accepted' }
        });
      } else {
        setOutput({
          stdout: 'Code executed successfully!\n',
          time: '0.010',
          memory: 1024,
          status: { description: 'Accepted' }
        });
      }
    } catch (error) {
      setOutput({
        stderr: 'Execution failed: ' + (error as Error).message,
        status: { description: 'Runtime Error' }
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleFileCreate = (name: string, type: 'file' | 'folder') => {
    if (type === 'file') {
      const newFile: CodeFile = {
        id: Date.now().toString(),
        name,
        content: '',
        language: getLanguageFromExtension(name),
        path: '/' + name
      };
      setFiles([...files, newFile]);
    }
  };

  const handleFileDelete = (fileId: string) => {
    setFiles(files.filter(file => file.id !== fileId));
    handleTabClose(fileId);
  };

  const handleFileRename = (fileId: string, newName: string) => {
    setFiles(files.map(file => 
      file.id === fileId 
        ? { ...file, name: newName, language: getLanguageFromExtension(newName) }
        : file
    ));
  };

  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py': return 'python';
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'cpp': case 'cc': case 'cxx': return 'cpp';
      case 'java': return 'java';
      case 'c': return 'c';
      case 'cs': return 'csharp';
      case 'php': return 'php';
      case 'rb': return 'ruby';
      case 'go': return 'go';
      case 'rs': return 'rust';
      default: return 'plaintext';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-editor-background text-editor-foreground">
      <Toolbar 
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        onRunCode={handleRunCode}
        isRunning={isRunning}
        activeFile={activeFile}
        onSaveFile={() => activeFile && handleSaveFile(activeFile)}
      />
      
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <FileExplorer
            files={files}
            activeFile={activeFile}
            onFileSelect={handleFileSelect}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
            onFileRename={handleFileRename}
          />
        </ResizablePanel>
        
        <ResizableHandle />
        
        <ResizablePanel defaultSize={55} minSize={30}>
          <div className="h-full flex flex-col">
            <TabBar
              tabs={openTabs}
              activeTab={activeFile}
              onTabSelect={setActiveFile}
              onTabClose={handleTabClose}
            />
            
            <div className="flex-1">
              {activeFile ? (
                <MonacoEditor
                  height="100%"
                  language={activeFile.language}
                  value={activeFile.content}
                  onChange={handleEditorChange}
                  onMount={handleEditorDidMount}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'selection',
                    tabSize: 2,
                    insertSpaces: true,
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">No file selected</h3>
                    <p>Select a file from the explorer to start coding</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
        
        <ResizableHandle />
        
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <OutputPanel output={output} isRunning={isRunning} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};