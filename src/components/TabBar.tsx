import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeFile } from './CodeEditor';

interface TabBarProps {
  tabs: CodeFile[];
  activeTab: CodeFile | null;
  onTabSelect: (tab: CodeFile) => void;
  onTabClose: (tabId: string) => void;
}

export const TabBar = ({ tabs, activeTab, onTabSelect, onTabClose }: TabBarProps) => {
  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'python':
        return 'bg-yellow-500';
      case 'javascript':
      case 'typescript':
        return 'bg-yellow-600';
      case 'java':
        return 'bg-red-500';
      case 'cpp':
      case 'c':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div className="flex bg-editor-tab border-b border-editor-sidebar-border overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center px-3 py-2 border-r border-editor-sidebar-border cursor-pointer group min-w-0 ${
            activeTab?.id === tab.id
              ? 'bg-editor-tab-active text-white'
              : 'bg-editor-tab hover:bg-editor-tab-active text-gray-300'
          }`}
          onClick={() => onTabSelect(tab)}
        >
          <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${getLanguageColor(tab.language)}`} />
          <span className="text-sm truncate mr-2 max-w-32">{tab.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-editor-sidebar-border"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};