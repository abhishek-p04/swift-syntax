import { Play, Save, Settings, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from 'next-themes';
import { CodeFile } from './CodeEditor';

interface ToolbarProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  onRunCode: () => void;
  isRunning: boolean;
  activeFile: CodeFile | null;
  onSaveFile: () => void;
}

const LANGUAGES = [
  { id: 'python', name: 'Python', icon: '🐍' },
  { id: 'javascript', name: 'JavaScript', icon: '🟨' },
  { id: 'typescript', name: 'TypeScript', icon: '🔷' },
  { id: 'java', name: 'Java', icon: '☕' },
  { id: 'cpp', name: 'C++', icon: '⚡' },
  { id: 'c', name: 'C', icon: '🔧' },
  { id: 'csharp', name: 'C#', icon: '💎' },
  { id: 'go', name: 'Go', icon: '🐹' },
  { id: 'rust', name: 'Rust', icon: '🦀' },
  { id: 'php', name: 'PHP', icon: '🐘' },
];

export const Toolbar = ({
  selectedLanguage,
  onLanguageChange,
  onRunCode,
  isRunning,
  activeFile,
  onSaveFile,
}: ToolbarProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="h-12 bg-editor-sidebar border-b border-editor-sidebar-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-primary font-bold">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white text-xs">{'</>'}</span>
            </div>
            <span className="text-sm">Code Editor</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedLanguage} onValueChange={onLanguageChange}>
            <SelectTrigger className="w-40 h-8 bg-editor-tab border-editor-sidebar-border">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent className="bg-editor-sidebar border-editor-sidebar-border">
              {LANGUAGES.map((lang) => (
                <SelectItem
                  key={lang.id}
                  value={lang.id}
                  className="hover:bg-editor-tab focus:bg-editor-tab"
                >
                  <div className="flex items-center gap-2">
                    <span>{lang.icon}</span>
                    <span>{lang.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="default"
            size="sm"
            onClick={onRunCode}
            disabled={isRunning || !activeFile}
            className="h-8 gap-2"
          >
            <Play className={`w-4 h-4 ${isRunning ? 'animate-pulse' : ''}`} />
            {isRunning ? 'Running...' : 'Run'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onSaveFile}
            disabled={!activeFile}
            className="h-8 gap-2 bg-editor-tab border-editor-sidebar-border hover:bg-editor-tab-active"
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground">
          {activeFile ? (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {activeFile.name}
            </span>
          ) : (
            'No file selected'
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-8 w-8 p-0"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};