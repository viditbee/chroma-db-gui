'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw,
  FileText,
  Search,
  Eye,
  Save,
  X
} from 'lucide-react';
import { chromaDBService } from '@/lib/chromadb-client';
import { Document } from '@/types/chromadb';
import { EmbeddingFunction } from 'chromadb';

// Simple embedding function for ChromaDB operations
class SimpleEmbeddingFunction implements EmbeddingFunction {
  async generate(texts: string[]): Promise<number[][]> {
    return texts.map(text => {
      const embedding = new Array(1536).fill(0);
      for (let i = 0; i < text.length; i++) {
        embedding[i % 1536] = (embedding[i % 1536] + text.charCodeAt(i)) % 1000;
      }
      return embedding;
    });
  }
}

const documentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  metadata: z.string().optional(), // JSON string
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentManagerProps {
  collectionName: string;
  documentToEdit?: Document;
}

export function DocumentManager({ collectionName, documentToEdit }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      content: '',
      metadata: '{}',
    }
  });

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For now, we'll fetch a limited number of documents
      // In a real implementation, we'd add pagination
      const collection = await chromaDBService.getClient()?.getCollection({ 
        name: collectionName,
        embeddingFunction: new SimpleEmbeddingFunction()
      });
      if (!collection) {
        throw new Error('Collection not found');
      }
      
      const results = await collection.get({ limit: 50 });
      
      const docs: Document[] = [];
      if (results.ids && results.ids.length > 0) {
        // ChromaDB returns flat arrays, not nested arrays
        for (let i = 0; i < results.ids.length; i++) {
          docs.push({
            id: results.ids[i],
            content: results.documents?.[i] || '',
            metadata: results.metadatas?.[i] as Record<string, any> || undefined,
          });
        }
      }
      
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [collectionName]);

  useEffect(() => {
    if (documentToEdit) {
      setEditingDocument(documentToEdit);
      setValue('content', documentToEdit.content);
      setValue('metadata', JSON.stringify(documentToEdit.metadata || {}, null, 2));
      setIsEditDialogOpen(true);
    }
  }, [documentToEdit, setValue]);

  const handleAddDocument = async (data: DocumentFormData) => {
    setSaving(true);
    
    try {
      let metadata = {};
      if (data.metadata) {
        try {
          metadata = JSON.parse(data.metadata);
        } catch (e) {
          throw new Error('Invalid JSON in metadata field');
        }
      }

      const docId = await chromaDBService.addDocument(collectionName, {
        content: data.content,
        metadata
      });

      setIsAddDialogOpen(false);
      reset();
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add document');
    } finally {
      setSaving(false);
    }
  };

  const handleEditDocument = async (data: DocumentFormData) => {
    if (!editingDocument) return;
    
    setSaving(true);
    
    try {
      let metadata = {};
      if (data.metadata) {
        try {
          metadata = JSON.parse(data.metadata);
        } catch (e) {
          throw new Error('Invalid JSON in metadata field');
        }
      }

      await chromaDBService.updateDocument(collectionName, {
        id: editingDocument.id,
        content: data.content,
        metadata
      });

      setIsEditDialogOpen(false);
      setEditingDocument(null);
      reset();
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await chromaDBService.deleteDocument(collectionName, documentId);
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const openEditDialog = (document: Document) => {
    setEditingDocument(document);
    setValue('content', document.content);
    setValue('metadata', JSON.stringify(document.metadata || {}, null, 2));
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-600">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Documents</h2>
          <p className="text-slate-600">
            Manage documents in <code className="bg-slate-100 px-1 rounded">{collectionName}</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Document</DialogTitle>
                <DialogDescription>
                  Add a new document to the collection. Content is required, metadata is optional.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleAddDocument)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    placeholder="Enter document content..."
                    rows={6}
                    {...register('content')}
                  />
                  {errors.content && (
                    <p className="text-sm text-red-500">{errors.content.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metadata">Metadata (JSON)</Label>
                  <Textarea
                    id="metadata"
                    placeholder='{"key": "value", "category": "example"}'
                    rows={4}
                    {...register('metadata')}
                  />
                  <p className="text-xs text-slate-500">
                    Enter metadata as valid JSON. Leave empty for no metadata.
                  </p>
                  {errors.metadata && (
                    <p className="text-sm text-red-500">{errors.metadata.message}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Add Document
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Documents Table */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No documents found</h3>
            <p className="text-slate-600 text-center mb-4">
              This collection doesn't have any documents yet. Add your first document to get started.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Content Preview</TableHead>
                  <TableHead>Metadata</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-mono text-xs max-w-32 truncate">
                      {document.id}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate">
                        {document.content}
                      </div>
                    </TableCell>
                    <TableCell>
                      {document.metadata && Object.keys(document.metadata).length > 0 ? (
                        <Badge variant="outline">
                          {Object.keys(document.metadata).length} fields
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
                          onClick={() => openEditDialog(document)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteDocument(document.id)}
                        >
                          <Trash2 className="h-3 w-3" />
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Edit the document content and metadata.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEditDocument)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content *</Label>
              <Textarea
                id="edit-content"
                placeholder="Enter document content..."
                rows={6}
                {...register('content')}
              />
              {errors.content && (
                <p className="text-sm text-red-500">{errors.content.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-metadata">Metadata (JSON)</Label>
              <Textarea
                id="edit-metadata"
                placeholder='{"key": "value", "category": "example"}'
                rows={4}
                {...register('metadata')}
              />
              <p className="text-xs text-slate-500">
                Enter metadata as valid JSON. Leave empty for no metadata.
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Document
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
