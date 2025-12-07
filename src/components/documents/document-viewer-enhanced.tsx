'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  Edit,
  Copy,
  Calendar,
  User,
  FileText
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

interface DocumentViewerProps {
  collectionName: string;
  onEditDocument?: (document: Document) => void;
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
  const [searchType, setSearchType] = useState<'text' | 'semantic' | 'regex' | 'id' | 'metadata'>('text');
  const [metadataFilters, setMetadataFilters] = useState<Array<{field: string, operator: string, value: string, type: string}>>([]);

  const documentsPerPage = 20;

  const fetchDocuments = async (page = 1, search = '', type = 'text', filters: Array<{field: string, operator: string, value: string, type: string}> = []) => {
    setLoading(true);
    setError(null);
    
    try {
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
      if (search && type === 'semantic') {
        // Semantic search using ChromaDB's query functionality
        results = await collection.query({
          queryTexts: [search],
          nResults: limit,
          include: ['documents', 'metadatas', 'distances']
        });
        
        const docs: Document[] = [];
        if (results.ids && results.ids[0]) {
          for (let i = 0; i < results.ids[0].length; i++) {
            docs.push({
              id: results.ids[0][i],
              content: results.documents?.[0]?.[i] || '',
              metadata: results.metadatas?.[0]?.[i] as Record<string, any> || undefined,
            });
          }
        }
        setDocuments(docs);
      } else if (search && type === 'text') {
        // Text search using whereDocument
        results = await collection.get({
          whereDocument: { $contains: search },
          limit: limit,
          offset: offset
        });
        
        const docs: Document[] = [];
        if (results.ids && results.ids.length > 0) {
          for (let i = 0; i < results.ids.length; i++) {
            docs.push({
              id: results.ids[i],
              content: results.documents?.[i] || '',
              metadata: results.metadatas?.[i] as Record<string, any> || undefined,
            });
          }
        }
        setDocuments(docs);
      } else if (search && type === 'metadata') {
        // Metadata search using where clause
        const whereClause: any = {};
        filters.forEach(filter => {
          if (filter.field && filter.value) {
            switch (filter.operator) {
              case 'equals':
                whereClause[filter.field] = filter.value;
                break;
              case 'contains':
                whereClause[filter.field] = { $contains: filter.value };
                break;
              case 'greater':
                whereClause[filter.field] = { $gt: filter.value };
                break;
              case 'less':
                whereClause[filter.field] = { $lt: filter.value };
                break;
            }
          }
        });
        
        results = await collection.get({
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          limit: limit,
          offset: offset
        });
        
        const docs: Document[] = [];
        if (results.ids && results.ids.length > 0) {
          for (let i = 0; i < results.ids.length; i++) {
            docs.push({
              id: results.ids[i],
              content: results.documents?.[i] || '',
              metadata: results.metadatas?.[i] as Record<string, any> || undefined,
            });
          }
        }
        setDocuments(docs);
      } else if (search && type === 'id') {
        // Search by ID
        results = await collection.get({
          ids: [search],
          limit: limit
        });
        
        const docs: Document[] = [];
        if (results.ids && results.ids.length > 0) {
          for (let i = 0; i < results.ids.length; i++) {
            docs.push({
              id: results.ids[i],
              content: results.documents?.[i] || '',
              metadata: results.metadatas?.[i] as Record<string, any> || undefined,
            });
          }
        }
        setDocuments(docs);
      } else {
        // Get all documents with pagination
        results = await collection.get({
          limit: limit,
          offset: offset
        });
        
        const docs: Document[] = [];
        if (results.ids && results.ids.length > 0) {
          for (let i = 0; i < results.ids.length; i++) {
            docs.push({
              id: results.ids[i],
              content: results.documents?.[i] || '',
              metadata: results.metadatas?.[i] as Record<string, any> || undefined,
            });
          }
        }
        setDocuments(docs);
      }
      
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
    fetchDocuments(currentPage, searchTerm, searchType, metadataFilters);
  }, [collectionName, currentPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDocuments(1, searchTerm, searchType, metadataFilters);
  };

  const handleRefresh = () => {
    fetchDocuments(currentPage, searchTerm, searchType, metadataFilters);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setIsDetailModalOpen(true);
  };

  const handleEditDocument = (document: Document) => {
    if (onEditDocument) {
      onEditDocument(document);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExportDocuments = () => {
    const dataStr = JSON.stringify(documents, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${collectionName}_documents.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const addMetadataFilter = () => {
    setMetadataFilters([...metadataFilters, { field: '', operator: 'equals', value: '', type: 'string' }]);
  };

  const removeMetadataFilter = (index: number) => {
    setMetadataFilters(metadataFilters.filter((_, i) => i !== index));
  };

  const updateMetadataFilter = (index: number, field: string, value: string) => {
    const newFilters = [...metadataFilters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setMetadataFilters(newFilters);
  };

  const totalPages = Math.ceil(totalDocuments / documentsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">
            Browse and search documents in {collectionName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportDocuments}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={searchType} onValueChange={(value) => setSearchType(value as any)}>
            <TabsList>
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="semantic">Semantic</TabsTrigger>
              <TabsTrigger value="regex">Regex</TabsTrigger>
              <TabsTrigger value="id">ID</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="semantic" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Semantic search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="regex" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Regex pattern..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="id" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Document ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="metadata" className="space-y-4">
              <div className="space-y-3">
                {metadataFilters.map((filter, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Field name"
                      value={filter.field}
                      onChange={(e) => updateMetadataFilter(index, 'field', e.target.value)}
                      className="w-[150px]"
                    />
                    <select
                      value={filter.operator}
                      onChange={(e) => updateMetadataFilter(index, 'operator', e.target.value)}
                      className="px-3 py-2 border rounded-md w-[120px] text-sm"
                    >
                      <option value="equals">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="greater">Greater</option>
                      <option value="less">Less</option>
                    </select>
                    <Input
                      placeholder="Value"
                      value={filter.value}
                      onChange={(e) => updateMetadataFilter(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMetadataFilter(index)}
                      className="h-8 w-8 p-0"
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addMetadataFilter}>
                    Add Filter
                  </Button>
                  <Button onClick={handleSearch} disabled={metadataFilters.length === 0}>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>
            </TabsContent>
      </Tabs>
    </CardContent>
  </Card>

      {/* Documents Table */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading documents...</span>
          </CardContent>
        </Card>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm ? 'No documents match your search criteria.' : 'This collection doesn\'t have any documents yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Documents ({totalDocuments})
              </div>
              <Badge variant="secondary">
                Page {currentPage} of {totalPages || 1}
              </Badge>
            </CardTitle>
            <CardDescription>
              Showing {documents.length} of {totalDocuments} documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">ID</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead className="w-[150px]">Metadata</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="truncate flex-1" title={document.id}>
                          {document.id}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyToClipboard(document.id)}
                          className="h-6 w-6 p-0 flex-shrink-0 ml-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="truncate text-sm" title={document.content}>
                          {document.content}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {document.metadata && Object.keys(document.metadata).length > 0 ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {Object.keys(document.metadata).length} fields
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {Object.entries(document.metadata).slice(0, 2).map(([key, value]) => (
                              <div key={key} className="truncate">
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">None</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDocument(document)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {onEditDocument && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditDocument(document)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
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
                <div className="text-sm text-muted-foreground">
                  Showing {documents.length} of {totalDocuments} documents
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
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
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Details
            </DialogTitle>
            <DialogDescription>
              View the complete document content and metadata
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Document ID</h3>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-2 rounded text-sm flex-1 font-mono">
                    {selectedDocument.id}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyToClipboard(selectedDocument.id)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Content
                </h3>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{selectedDocument.content}</pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyToClipboard(selectedDocument.content)}
                    className="mt-2"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Content
                  </Button>
                </div>
              </div>
              
              {selectedDocument.metadata && (
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Metadata
                  </h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm">{JSON.stringify(selectedDocument.metadata, null, 2)}</pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(JSON.stringify(selectedDocument.metadata, null, 2))}
                      className="mt-2"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Metadata
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
