'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ConnectionForm } from '@/components/connection/connection-form';
import { CollectionBrowser } from '@/components/collections/collection-browser';
import { SchemaViewer } from '@/components/schema/schema-viewer';
import { DocumentManager } from '@/components/documents/document-manager';
import { CollectionCreator } from '@/components/collections/collection-creator';
import { DocumentViewer } from '@/components/documents/document-viewer-enhanced';
import { QueryInterface } from '@/components/query/query-interface';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Home, 
  Search, 
  Settings, 
  AlertCircle,
  Wifi,
  WifiOff,
  BarChart3,
  FileText
} from 'lucide-react';
import { chromaDBService } from '@/lib/chromadb-client';
import { ChromaConnection, Collection, Document } from '@/types/chromadb';

export function ChromaDBGUI() {
  const [connection, setConnection] = useState<ChromaConnection | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [error, setError] = useState<string | null>(null);
  const [documentToEdit, setDocumentToEdit] = useState<Document | null>(null);

  useEffect(() => {
    if (connection?.connected) {
      fetchCollections();
    }
  }, [connection]);

  const fetchCollections = async () => {
    try {
      const collectionList = await chromaDBService.getCollections();
      
      // Get detailed info for each collection including actual document counts
      const detailedCollections = await Promise.all(
        collectionList.map(async (collection) => {
          try {
            const details = await chromaDBService.getCollectionDetails(collection.name);
            return details;
          } catch (err) {
            console.error(`Failed to get details for collection ${collection.name}:`, err);
            return collection; // Return basic info if details fail
          }
        })
      );
      
      setCollections(detailedCollections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch collections');
    }
  };

  const handleConnectionSuccess = (newConnection: ChromaConnection) => {
    setConnection(newConnection);
    setError(null);
    setCurrentPage('collections');
  };

  const handleConnectionError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleDisconnect = async () => {
    try {
      await chromaDBService.disconnect();
      setConnection(null);
      setCollections([]);
      setSelectedCollection(null);
      setCurrentPage('home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  const handleCollectionSelect = (collectionName: string) => {
    setSelectedCollection(collectionName);
    setCurrentPage('schema');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const renderCurrentPage = () => {
    if (!connection) {
      return (
        <div className="flex items-center justify-center min-h-full">
          <ConnectionForm 
            onConnectionSuccess={handleConnectionSuccess}
            onConnectionError={handleConnectionError}
          />
        </div>
      );
    }

    switch (currentPage) {
      case 'home':
        return <Dashboard connection={connection} collections={collections} onNavigate={handleNavigate} />;
      case 'collections':
        return (
          <CollectionBrowser 
            onCollectionSelect={handleCollectionSelect}
            onNavigate={handleNavigate}
          />
        );
      case 'create-collection':
        return (
          <CollectionCreator 
            onCollectionCreated={fetchCollections}
            onNavigate={handleNavigate}
          />
        );
      case 'schema':
        return selectedCollection ? (
          <SchemaViewer collectionName={selectedCollection} />
        ) : (
          <CollectionBrowser 
            onCollectionSelect={handleCollectionSelect}
            onNavigate={handleNavigate}
          />
        );
      case 'documents':
        return selectedCollection ? (
          <DocumentViewer 
            collectionName={selectedCollection}
            onEditDocument={(doc) => {
              setDocumentToEdit(doc);
              setCurrentPage('documents-edit');
            }}
          />
        ) : (
          <CollectionBrowser 
            onCollectionSelect={handleCollectionSelect}
            onNavigate={handleNavigate}
          />
        );
      case 'documents-edit':
        return selectedCollection ? (
          <DocumentManager 
            collectionName={selectedCollection} 
            documentToEdit={documentToEdit || undefined}
          />
        ) : (
          <CollectionBrowser 
            onCollectionSelect={handleCollectionSelect}
            onNavigate={handleNavigate}
          />
        );
      case 'query':
        return selectedCollection ? (
          <QueryInterface collectionName={selectedCollection} />
        ) : (
          <CollectionBrowser 
            onCollectionSelect={handleCollectionSelect}
            onNavigate={handleNavigate}
          />
        );
      case 'settings':
        return <SettingsPage connection={connection} onDisconnect={handleDisconnect} />;
      default:
        return <Dashboard connection={connection} collections={collections} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        connection={connection}
        collections={collections}
        selectedCollection={selectedCollection}
        onCollectionSelect={handleCollectionSelect}
        onNavigate={handleNavigate}
        currentPage={currentPage}
      />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {renderCurrentPage()}
        </div>
      </main>
    </div>
  );
}

function Dashboard({ connection, collections, onNavigate }: { 
  connection: ChromaConnection; 
  collections: Collection[]; 
  onNavigate: (page: string) => void;
}) {
  const totalDocuments = collections.reduce((sum, col) => sum + col.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">
          Welcome to ChromaDB GUI. Connected to {connection.name}
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className="bg-green-100 text-green-800">
              Connected
            </Badge>
            <div>
              <p className="font-medium">{connection.name}</p>
              <p className="text-sm text-slate-600">{connection.host}:{connection.port}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{collections.length}</p>
            <p className="text-sm text-slate-600">total collections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{totalDocuments.toLocaleString()}</p>
            <p className="text-sm text-slate-600">total documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Avg Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {collections.length > 0 ? Math.round(totalDocuments / collections.length) : 0}
            </p>
            <p className="text-sm text-slate-600">per collection</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to get you started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => onNavigate('collections')}
            >
              <Database className="h-6 w-6 mb-2" />
              Browse Collections
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => onNavigate('query')}
            >
              <Search className="h-6 w-6 mb-2" />
              Search Documents
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => onNavigate('documents')}
            >
              <FileText className="h-6 w-6 mb-2" />
              Manage Documents
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => onNavigate('settings')}
            >
              <Settings className="h-6 w-6 mb-2" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Collections */}
      {collections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Collections</CardTitle>
            <CardDescription>
              Your ChromaDB collections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {collections.slice(0, 5).map((collection) => (
                <div key={collection.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">{collection.name}</p>
                      <p className="text-sm text-slate-600">{collection.count} documents</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onNavigate('schema')}
                  >
                    View
                  </Button>
                </div>
              ))}
              {collections.length > 5 && (
                <Button variant="outline" className="w-full" onClick={() => onNavigate('collections')}>
                  View All Collections
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SettingsPage({ connection, onDisconnect }: { 
  connection: ChromaConnection; 
  onDisconnect: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600">
          Manage your ChromaDB connection and application settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection Settings</CardTitle>
          <CardDescription>
            Current connection information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-700">Connection Name</p>
              <p className="text-slate-900">{connection.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Host</p>
              <p className="text-slate-900">{connection.host}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Port</p>
              <p className="text-slate-900">{connection.port}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Status</p>
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <Button variant="destructive" onClick={onDisconnect}>
              <WifiOff className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>
            ChromaDB GUI information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Description:</strong> Modern web interface for ChromaDB vector databases</p>
            <p><strong>Tech Stack:</strong> Next.js, TypeScript, shadcn/ui, ChromaDB SDK</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
