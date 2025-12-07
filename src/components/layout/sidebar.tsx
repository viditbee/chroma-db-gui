'use client';

import { useState } from 'react';
import { Database, Home, Search, Settings, Plus, Menu, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChromaConnection, Collection } from '@/types/chromadb';

interface SidebarProps {
  connection: ChromaConnection | null;
  collections: Collection[];
  selectedCollection: string | null;
  onCollectionSelect: (collectionName: string) => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Sidebar({ 
  connection, 
  collections, 
  selectedCollection, 
  onCollectionSelect, 
  onNavigate,
  currentPage 
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'collections', label: 'Collections', icon: Database },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'query', label: 'Query', icon: Search },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-slate-900 text-white transition-all duration-300 flex flex-col h-full`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-semibold">ChromaDB GUI</h1>
              {connection ? (
                <div>
                  <Badge variant="secondary" className="text-xs bg-green-600">
                    Connected
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {connection.host}:{connection.port}
                  </span>
                </div>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  Not Connected
                </Badge>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white hover:bg-slate-700"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "secondary" : "ghost"}
                className={`w-full justify-start text-white hover:bg-slate-700 hover:text-white ${
                  currentPage === item.id ? 'bg-slate-700 text-white' : ''
                }`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2">{item.label}</span>}
              </Button>
            );
          })}
        </div>

        {/* Collections */}
        {!isCollapsed && connection && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-400">Collections</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-slate-700"
                onClick={() => onNavigate('collections')}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              {collections.map((collection) => (
                <Button
                  key={collection.id}
                  variant={selectedCollection === collection.name ? "secondary" : "ghost"}
                  className={`w-full justify-start text-sm text-white hover:bg-slate-700 hover:text-white ${
                    selectedCollection === collection.name ? 'bg-slate-700 text-white' : ''
                  }`}
                  onClick={() => onCollectionSelect(collection.name)}
                >
                  <Database className="h-3 w-3 mr-2" />
                  <div className="flex-1 text-left truncate">
                    {collection.name}
                  </div>
                  <Badge variant="outline" className="text-xs ml-2">
                    {collection.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
