'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Plus, 
  Eye, 
  Search, 
  Trash2, 
  RefreshCw,
  FileText,
  Calendar
} from 'lucide-react';
import { CollectionCreator } from '@/components/collections/collection-creator';
import { chromaDBService } from '@/lib/chromadb-client';
import { Collection } from '@/types/chromadb';

interface CollectionBrowserProps {
  onCollectionSelect: (collectionName: string) => void;
  onNavigate: (page: string) => void;
}

export function CollectionBrowser({ onCollectionSelect, onNavigate }: CollectionBrowserProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const collectionList = await chromaDBService.getCollections();
      
      // Get detailed info for each collection
      const detailedCollections = await Promise.all(
        collectionList.map(async (collection) => {
          try {
            const details = await chromaDBService.getCollectionDetails(collection.name);
            return details;
          } catch (err) {
            // If we can't get details, return basic info
            return collection;
          }
        })
      );
      
      setCollections(detailedCollections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleRefresh = () => {
    fetchCollections();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-600">Loading collections...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-800">
          Error loading collections: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Collections</h2>
          <p className="text-slate-600">
            Browse and manage your ChromaDB collections
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => onNavigate('create-collection')}>
            <Plus className="h-4 w-4 mr-2" />
            New Collection
          </Button>
        </div>
      </div>

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No collections found</h3>
            <p className="text-slate-600 text-center mb-4">
              Get started by creating your first collection or connecting to a ChromaDB instance with existing data.
            </p>
            <Button onClick={() => onNavigate('create-collection')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Card key={collection.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{collection.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {collection.count} documents
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Created {collection.createdAt.toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {collection.metadata && Object.keys(collection.metadata).length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">Metadata:</span>
                      <div className="mt-1 p-2 bg-slate-50 rounded text-xs">
                        {JSON.stringify(collection.metadata, null, 2)}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onCollectionSelect(collection.name)}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onNavigate(`query?collection=${collection.name}`)}
                      className="flex-1"
                    >
                      <Search className="h-3 w-3 mr-1" />
                      Query
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Collections Table */}
      {collections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Collection Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Metadata</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell className="font-medium">{collection.name}</TableCell>
                    <TableCell>{collection.count}</TableCell>
                    <TableCell>{collection.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {collection.metadata ? (
                        <Badge variant="outline">
                          {Object.keys(collection.metadata).length} fields
                        </Badge>
                      ) : (
                        <Badge variant="secondary">None</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onCollectionSelect(collection.name)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onNavigate(`query?collection=${collection.name}`)}
                        >
                          <Search className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
