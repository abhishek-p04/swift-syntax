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
import { CodeFile } from './CodeEditor';

interface FileExplorerProps {
  files: CodeFile[];
  activeFile: CodeFile | null;
  onFileSelect: (file: CodeFile) => void;
  onFileCreate: (name: string, type: 'file' | 'folder', parentPath?: string) => void;
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
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // --- Tree utilities ---
  type TreeNode = {
    type: 'folder' | 'file';
    name: string;
    path: string; // folder path without trailing slash (except root '/'), files use full path
    children?: TreeNode[];
    file?: CodeFile;
  };

  const basename = (p: string) => p.replace(/\/$/, '').split('/').pop() || '';
  const dirname = (p: string) => {
    const parts = p.replace(/^\//, '').split('/');
    parts.pop();
    return parts.join('/');
  };

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ '/': true });
  const toggle = (p: string) => setExpanded((e) => ({ ...e, [p]: !e[p] }));

  const buildTree = (allFiles: CodeFile[]): TreeNode => {
    const root: TreeNode = { type: 'folder', name: '', path: '/', children: [] };
    const folderMap: Record<string, TreeNode> = { '/': root };

    const ensureFolder = (folderPath: string) => {
      const norm = ('/' + folderPath.replace(/^\//, '').replace(/\/$/, '')).replace(/\/+/g, '/');
      if (norm === '/') return root;
      if (folderMap[norm]) return folderMap[norm];
      const parent = ensureFolder(dirname(norm));
      const node: TreeNode = { type: 'folder', name: basename(norm), path: norm, children: [] };
      parent.children!.push(node);
      folderMap[norm] = node;
      return node;
    };

    for (const f of allFiles) {
      // Hide placeholder files used to materialize folders
      if (f.path.endsWith('/.keep')) continue;
      const full = f.path.replace(/^\//, '');
      const dir = dirname(full);
      const parent = ensureFolder(dir);
      parent.children!.push({ type: 'file', name: basename(full), path: '/' + full, file: f });
    }

    // Sort children: folders first then files, alphabetical
    const sortNode = (node: TreeNode) => {
      if (!node.children) return;
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortNode);
    };
    sortNode(root);
    return root;
  };

  const tree = buildTree(files);

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

  const renderNode = (node: TreeNode, depth = 0) => {
    if (node.type === 'file' && node.file) {
      const isActive = activeFile?.id === node.file.id;
      return (
        <div
          key={node.file?.id || node.path}
          className={`flex items-center px-2 py-1 rounded cursor-pointer hover:bg-editor-tab ${isActive ? 'bg-editor-tab-active' : ''}`}
          onClick={() => onFileSelect(node.file!)}
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          {getFileIcon(node.name)}
          {editingFile === node.file.id ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => handleRenameKeyDown(e, node.file!.id)}
              onBlur={() => handleConfirmRename(node.file!.id)}
              className="ml-2 h-6 text-xs bg-editor-tab border-primary"
              autoFocus
            />
          ) : (
            <span className="ml-2 text-sm truncate">{node.name}</span>
          )}
          <div className="ml-auto opacity-0 group-hover:opacity-100 transition">
            <MoreHorizontal className="w-4 h-4" />
          </div>
          <ContextMenu>
            <ContextMenuTrigger />
            <ContextMenuContent className="bg-editor-sidebar border-editor-sidebar-border">
              <ContextMenuItem onClick={() => handleRename(node.file!.id, node.name)} className="hover:bg-editor-tab">
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onFileDelete(node.file!.id)} className="hover:bg-editor-tab text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      );
    }

    // Folder
    return (
      <div key={node.path}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className="flex items-center px-2 py-1 rounded cursor-pointer hover:bg-editor-tab"
              onClick={() => toggle(node.path)}
              style={{ paddingLeft: 8 + depth * 12 }}
            >
              {expanded[node.path] ? (
                <ChevronDown className="w-4 h-4 mr-1" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1" />
              )}
              <Folder className="w-4 h-4 mr-2 text-blue-400" />
              <span className="text-sm font-medium">{node.path === '/' ? 'Explorer' : node.name}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="bg-editor-sidebar border-editor-sidebar-border">
            <ContextMenuItem onClick={() => onFileCreate('new-file.txt', 'file', node.path)} className="hover:bg-editor-tab">
              <Plus className="w-4 h-4 mr-2" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onFileCreate('new-folder', 'folder', node.path)} className="hover:bg-editor-tab">
              <Plus className="w-4 h-4 mr-2" />
              New Folder
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        {expanded[node.path] && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
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
            <span className="text-sm font-medium">Explorer</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFileCreate('new-file.txt', 'file', '/')}
              className="h-6 w-6 p-0 hover:bg-editor-tab"
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFileCreate('new-folder', 'folder', '/')}
              className="h-6 w-6 p-0 hover:bg-editor-tab"
            >
              <Folder className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-2">
          {renderNode(tree)}
        </div>
      )}
    </div>
  );
};
