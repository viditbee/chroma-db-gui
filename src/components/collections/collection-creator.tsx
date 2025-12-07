'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Database, ArrowLeft, Save } from 'lucide-react';
import { chromaDBService } from '@/lib/chromadb-client';

const collectionSchema = z.object({
  name: z.string().min(1, 'Collection name is required').regex(/^[a-zA-Z0-9_-]+$/, 'Name can only contain letters, numbers, underscores, and hyphens'),
  metadata: z.string().optional(),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

interface CollectionCreatorProps {
  onCollectionCreated: () => void;
  onNavigate: (page: string) => void;
}

export function CollectionCreator({ onCollectionCreated, onNavigate }: CollectionCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: '',
      metadata: '{}',
    }
  });

  const onSubmit = async (data: CollectionFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      let metadata = {};
      if (data.metadata) {
        try {
          metadata = JSON.parse(data.metadata);
        } catch (e) {
          throw new Error('Invalid JSON in metadata field');
        }
      }

      // Create collection using ChromaDB client
      const client = chromaDBService.getClient();
      if (!client) {
        throw new Error('Not connected to ChromaDB');
      }

      await client.createCollection({
        name: data.name,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      });

      onCollectionCreated();
      onNavigate('collections');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => onNavigate('collections')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Collections
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Create Collection</h2>
          <p className="text-slate-600">
            Create a new collection in your ChromaDB instance
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Collection
            </CardTitle>
            <CardDescription>
              Fill in the details to create a new ChromaDB collection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Collection Name *</Label>
                <Input
                  id="name"
                  placeholder="my-collection"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
                <p className="text-xs text-slate-500">
                  Use only letters, numbers, underscores, and hyphens.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metadata">Metadata (JSON)</Label>
                <Textarea
                  id="metadata"
                  placeholder='{"description": "My collection", "category": "documents"}'
                  rows={4}
                  {...register('metadata')}
                />
                <p className="text-xs text-slate-500">
                  Optional metadata for the collection. Enter as valid JSON or leave empty.
                </p>
                {errors.metadata && (
                  <p className="text-sm text-red-500">{errors.metadata.message}</p>
                )}
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Database className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Collection
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onNavigate('collections')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Collection Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>About Collections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">What is a Collection?</h4>
              <p className="text-sm text-slate-600">
                A ChromaDB collection is a container for storing documents and their embeddings. 
                Each collection can store documents with similar characteristics and allows for efficient similarity searches.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Best Practices</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Use descriptive names that reflect the content type</li>
                <li>• Group similar documents together in the same collection</li>
                <li>• Add metadata to help organize and filter your collections</li>
                <li>• Consider the embedding model you'll use when creating collections</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">Common Use Cases</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• <strong>Documents:</strong> Research papers, articles, reports</li>
                <li>• <strong>Code:</strong> Functions, classes, documentation</li>
                <li>• <strong>Media:</strong> Image descriptions, transcripts</li>
                <li>• <strong>Chat:</strong> Conversation logs, support tickets</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
