'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Eye, 
  Search, 
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import { chromaDBService } from '@/lib/chromadb-client';
import { Document } from '@/types/chromadb';
import { EmbeddingFunction } from 'chromadb';

interface DocumentViewerProps {
  collectionName: string;
  onEditDocument?: (document: Document) => void;
}

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

export function DocumentViewer({ collectionName, onEditDocument }: DocumentViewerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const documentsPerPage = 20;

  const fetchDocuments = async (page = 1, search = '') => {
    setLoading(true);
    setError(null);
    
    try {
      // For now, we'll fetch documents with pagination
      // In a real implementation, we'd add proper pagination support
      const collection = await chromaDBService.getClient()?.getCollection({ 
        name: collectionName,
        embeddingFunction: new SimpleEmbeddingFunction()
      });
      if (!collection) {
        throw new Error('Collection not found');
      }
      
      const limit = documentsPerPage;
      const offset = (page - 1) * documentsPerPage;
      
      let results;
      if (search) {
        // Simple text search using ChromaDB's query functionality
        results = await collection.query({
          queryTexts: [search],
          nResults: limit,
          include: ['documents', 'metadatas', 'distances']
        });
        
        // Query results come back in nested arrays, so we need to handle that
        const docs: Document[] = [];
        if (results.ids && results.ids.length > 0 && results.ids[0]) {
          for (let i = 0; i < results.ids[0].length; i++) {
            docs.push({
              id: results.ids[0][i],
              content: results.documents?.[0]?.[i] || '',
              metadata: results.metadatas?.[0]?.[i] as Record<string, any> || undefined,
            });
          }
        }
        setDocuments(docs);
        setTotalDocuments(docs.length);
        setLoading(false);
        return;
      } else {
        // Get all documents with pagination
        results = await collection.get({ 
          limit: limit,
          offset: offset
        });
      }
      
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
      
      // Get total count
      const count = await collection.count();
      setTotalDocuments(count);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(currentPage, searchTerm);
  }, [collectionName, currentPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDocuments(1, searchTerm);
  };

  const handleRefresh = () => {
    fetchDocuments(currentPage, searchTerm);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setIsDetailModalOpen(true);
  };

  const totalPages = Math.ceil(totalDocuments / documentsPerPage);

  if (loading && currentPage === 1) {
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
            Viewing documents in <code className="bg-slate-100 px-1 rounded">{collectionName}</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Documents Table */}
      {documents.length === 0 && !loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No documents found</h3>
            <p className="text-slate-600 text-center">
              {searchTerm ? 'No documents match your search.' : 'This collection doesn\'t have any documents yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents ({totalDocuments} total)
              </div>
              {searchTerm && (
                <Badge variant="secondary">
                  Search: "{searchTerm}"
                </Badge>
              )}
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
                          onClick={() => handleViewDocument(document)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {onEditDocument && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onEditDocument(document)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-slate-600">
                  Showing {((currentPage - 1) * documentsPerPage) + 1} to{' '}
                  {Math.min(currentPage * documentsPerPage, totalDocuments)} of {totalDocuments} documents
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="flex items-center px-3 py-1 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Detail Modal */}
      {isDetailModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Document Details</h3>
                <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)}>
                  ×
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Document ID</label>
                <div className="mt-1 p-2 bg-slate-50 rounded text-sm font-mono">
                  {selectedDocument.id}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700">Content</label>
                <div className="mt-1 p-3 bg-slate-50 rounded text-sm max-h-64 overflow-auto">
                  {selectedDocument.content}
                </div>
              </div>
              
              {selectedDocument.metadata && Object.keys(selectedDocument.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Metadata</label>
                  <div className="mt-1 p-3 bg-slate-50 rounded text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedDocument.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                {onEditDocument && (
                  <Button onClick={() => {
                    onEditDocument(selectedDocument);
                    setIsDetailModalOpen(false);
                  }}>
                    Edit Document
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
