import { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CodeFile } from './CodeEditor';

interface FileExplorerProps {
  files: CodeFile[];
  activeFile: CodeFile | null;
  onFileSelect: (file: CodeFile) => void;
  onFileCreate: (name: string, type: 'file' | 'folder') => void;
  onFileDelete: (fileId: string) => void;
  onFileRename: (fileId: string, newName: string) => void;
}

export const FileExplorer = ({
  files,
  activeFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
}: FileExplorerProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newFileName, setNewFileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreateFile = (type: 'file' | 'folder') => {
    setCreateType(type);
    setIsCreating(true);
    setNewFileName('');
  };

  const handleConfirmCreate = () => {
    if (newFileName.trim()) {
      onFileCreate(newFileName.trim(), createType);
      setNewFileName('');
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmCreate();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewFileName('');
    }
  };

  const handleRename = (fileId: string, currentName: string) => {
    setEditingFile(fileId);
    setEditName(currentName);
  };

  const handleConfirmRename = (fileId: string) => {
    if (editName.trim()) {
      onFileRename(fileId, editName.trim());
    }
    setEditingFile(null);
    setEditName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, fileId: string) => {
    if (e.key === 'Enter') {
      handleConfirmRename(fileId);
    } else if (e.key === 'Escape') {
      setEditingFile(null);
      setEditName('');
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py':
        return <File className="w-4 h-4 text-yellow-500" />;
      case 'js':
      case 'ts':
        return <File className="w-4 h-4 text-yellow-600" />;
      case 'java':
        return <File className="w-4 h-4 text-red-500" />;
      case 'cpp':
      case 'c':
        return <File className="w-4 h-4 text-blue-500" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="h-full bg-editor-sidebar border-r border-editor-sidebar-border">
      <div className="p-3 border-b border-editor-sidebar-border">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center cursor-pointer hover:bg-editor-tab rounded px-2 py-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-1" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1" />
            )}
            <Folder className="w-4 h-4 mr-2 text-blue-400" />
            <span className="text-sm font-medium">FILES</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCreateFile('file')}
              className="h-6 w-6 p-0 hover:bg-editor-tab"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-2">
          {files.map((file) => (
            <ContextMenu key={file.id}>
              <ContextMenuTrigger>
                <div
                  className={`flex items-center px-2 py-1 rounded cursor-pointer hover:bg-editor-tab group ${
                    activeFile?.id === file.id ? 'bg-editor-tab-active' : ''
                  }`}
                  onClick={() => onFileSelect(file)}
                >
                  {getFileIcon(file.name)}
                  {editingFile === file.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyDown(e, file.id)}
                      onBlur={() => handleConfirmRename(file.id)}
                      className="ml-2 h-6 text-xs bg-editor-tab border-primary"
                      autoFocus
                    />
                  ) : (
                    <span className="ml-2 text-sm truncate">{file.name}</span>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="bg-editor-sidebar border-editor-sidebar-border">
                <ContextMenuItem
                  onClick={() => handleRename(file.id, file.name)}
                  className="hover:bg-editor-tab"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Rename
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onFileDelete(file.id)}
                  className="hover:bg-editor-tab text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}

          {isCreating && (
            <div className="flex items-center px-2 py-1 rounded">
              <File className="w-4 h-4 text-gray-400" />
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleConfirmCreate}
                placeholder={`New ${createType}...`}
                className="ml-2 h-6 text-xs bg-editor-tab border-primary"
                autoFocus
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};