'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Hash, 
  Layers, 
  RefreshCw,
  Info,
  Package,
  ArrowRight
} from 'lucide-react';
import { chromaDBService } from '@/lib/chromadb-client';
import { CollectionSchema } from '@/types/chromadb';

interface SchemaViewerProps {
  collectionName: string;
}

export function SchemaViewer({ collectionName }: SchemaViewerProps) {
  const [schema, setSchema] = useState<CollectionSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const collectionSchema = await chromaDBService.getCollectionSchema(collectionName);
      setSchema(collectionSchema);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, [collectionName]);

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'string':
        return <span className="text-xs">"text"</span>;
      case 'number':
        return <span className="text-xs">123</span>;
      case 'boolean':
        return <span className="text-xs">T/F</span>;
      case 'array':
        return <span className="text-xs">[...]</span>;
      case 'object':
        return <span className="text-xs">{'{...}'}</span>;
      default:
        return <span className="text-xs">?</span>;
    }
  };

  const getFieldTypeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'bg-blue-100 text-blue-800';
      case 'number':
        return 'bg-green-100 text-green-800';
      case 'boolean':
        return 'bg-purple-100 text-purple-800';
      case 'array':
        return 'bg-orange-100 text-orange-800';
      case 'object':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-600">Loading schema...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-800">
          Error loading schema: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!schema) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertDescription className="text-yellow-800">
          No schema information available for this collection.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Collection Schema</h2>
          <p className="text-slate-600">
            Schema and structure information for <code className="bg-slate-100 px-1 rounded">{collectionName}</code>
          </p>
        </div>
        <Button variant="outline" onClick={fetchSchema}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Collection Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Collection Name
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm">{schema.name}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Hash className="h-5 w-5 text-green-600" />
              Vector Dimensions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{schema.vectorDimension}</p>
            <p className="text-sm text-slate-600">dimensions per vector</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-600" />
              Distance Function
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-sm">
              {schema.distanceFunction}
            </Badge>
            <p className="text-sm text-slate-600 mt-1">similarity metric</p>
          </CardContent>
        </Card>
      </div>

      {/* Schema Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Schema Fields
          </CardTitle>
          <CardDescription>
            Metadata fields and their types found in this collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schema.fields.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600">No metadata fields detected</p>
              <p className="text-sm text-slate-500">
                This collection may not have any documents yet, or documents don't contain metadata.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schema.fields.map((field, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{field.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getFieldTypeColor(field.type)}>
                          {field.type}
                        </Badge>
                        {getFieldTypeIcon(field.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={field.required ? "destructive" : "secondary"}>
                        {field.required ? 'Required' : 'Optional'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {field.description || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Vector Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Vector Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Hash className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Dimensions</p>
                  <p className="text-sm text-slate-600">{schema.vectorDimension} dimensions</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Distance Function</p>
                  <p className="text-sm text-slate-600">{schema.distanceFunction}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium mb-2">About Distance Functions:</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p><strong>Cosine:</strong> Measures the cosine similarity between vectors. Good for normalized embeddings.</p>
                <p><strong>Euclidean:</strong> Measures straight-line distance between vectors. Good for spatial data.</p>
                <p><strong>Manhattan:</strong> Measures sum of absolute differences. Good for grid-like data.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
