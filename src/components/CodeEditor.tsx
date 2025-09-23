import { useState, useRef, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { FileExplorer } from './FileExplorer';
import { TabBar } from './TabBar';
import { OutputPanel } from './OutputPanel';
import { Toolbar } from './Toolbar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { supabase } from '@/integrations/supabase/client';

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

const SAMPLE_FILES: CodeFile[] = [];

export const CodeEditor = () => {
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFile, setActiveFile] = useState<CodeFile | null>(null);
  const [openTabs, setOpenTabs] = useState<CodeFile[]>([]);
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const editorRef = useRef<any>(null);

  // Load files from Supabase on component mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('files');
      if (error) throw error;
      
      const loadedFiles = data.map((file: any) => ({
        id: file.id,
        name: file.filename,
        content: file.content,
        language: file.language,
        path: '/' + file.filename
      }));
      
      setFiles(loadedFiles);
      if (loadedFiles.length > 0 && !activeFile) {
        setActiveFile(loadedFiles[0]);
        setOpenTabs([loadedFiles[0]]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

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

  const handleSaveFile = async (file: CodeFile) => {
    try {
      const { data, error } = await supabase.functions.invoke('files', {
        body: {
          filename: file.name,
          content: file.content,
          language: file.language
        }
      });
      
      if (error) throw error;
      console.log('File saved successfully:', file.name);
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  const handleRunCode = async () => {
    if (!activeFile) return;
    
    setIsRunning(true);
    setOutput(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: {
          code: activeFile.content,
          language: activeFile.language
        }
      });
      
      if (error) throw error;
      setOutput(data);
    } catch (error) {
      setOutput({
        stderr: 'Execution failed: ' + (error as Error).message,
        status: { description: 'Runtime Error' }
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleFileCreate = async (name: string, type: 'file' | 'folder') => {
    if (type === 'file') {
      try {
        const { data, error } = await supabase.functions.invoke('files', {
          body: {
            filename: name,
            content: '',
            language: getLanguageFromExtension(name)
          }
        });
        
        if (error) throw error;
        
        const newFile: CodeFile = {
          id: data.id,
          name: data.filename,
          content: data.content,
          language: data.language,
          path: '/' + data.filename
        };
        
        setFiles([...files, newFile]);
      } catch (error) {
        console.error('Error creating file:', error);
      }
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      const { error } = await supabase.functions.invoke(`files/${fileId}`, {
        body: {},
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (error) throw error;
      
      setFiles(files.filter(file => file.id !== fileId));
      handleTabClose(fileId);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleFileRename = async (fileId: string, newName: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) return;
      
      const { data, error } = await supabase.functions.invoke(`files/${fileId}`, {
        body: {
          filename: newName,
          content: file.content,
          language: getLanguageFromExtension(newName)
        }
      });
      
      if (error) throw error;
      
      setFiles(files.map(f => 
        f.id === fileId 
          ? { ...f, name: newName, language: getLanguageFromExtension(newName) }
          : f
      ));
    } catch (error) {
      console.error('Error renaming file:', error);
    }
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