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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Play, 
  RefreshCw,
  Target,
  FileText,
  Hash,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { chromaDBService } from '@/lib/chromadb-client';
import { QueryResult } from '@/types/chromadb';

const querySchema = z.object({
  queryText: z.string().min(1, 'Query text is required'),
  nResults: z.number().min(1).max(100, 'Number of results must be between 1 and 100'),
  where: z.string().optional(),
  whereDocument: z.string().optional(),
});

type QueryFormData = z.infer<typeof querySchema>;

interface QueryInterfaceProps {
  collectionName: string;
}

export function QueryInterface({ collectionName }: QueryInterfaceProps) {
  const [results, setResults] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch
  } = useForm<QueryFormData>({
    resolver: zodResolver(querySchema),
    defaultValues: {
      queryText: '',
      nResults: 10,
      where: '',
      whereDocument: '',
    }
  });

  const handleQuery = async (data: QueryFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryRequest: any = {
        queryText: data.queryText,
        nResults: data.nResults,
        include: ['documents', 'metadatas', 'distances']
      };

      // Parse where clauses if provided
      if (data.where) {
        try {
          queryRequest.where = JSON.parse(data.where);
        } catch (e) {
          throw new Error('Invalid JSON in where filter');
        }
      }

      if (data.whereDocument) {
        try {
          queryRequest.whereDocument = JSON.parse(data.whereDocument);
        } catch (e) {
          throw new Error('Invalid JSON in whereDocument filter');
        }
      }

      const queryResults = await chromaDBService.queryCollection(collectionName, queryRequest);
      setResults(queryResults);
      
      // Add to history
      if (!queryHistory.includes(data.queryText)) {
        setQueryHistory(prev => [data.queryText, ...prev.slice(0, 4)]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const getDistanceColor = (distance: number) => {
    if (distance < 0.3) return 'bg-green-100 text-green-800';
    if (distance < 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getDistanceLabel = (distance: number) => {
    if (distance < 0.3) return 'Very Similar';
    if (distance < 0.6) return 'Similar';
    return 'Less Similar';
  };

  const loadHistoryQuery = (queryText: string) => {
    setValue('queryText', queryText);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Similarity Search</h2>
          <p className="text-slate-600">
            Search for similar documents in <code className="bg-slate-100 px-1 rounded">{collectionName}</code>
          </p>
        </div>
        <Button variant="outline" onClick={() => reset()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Query Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Query Builder
            </CardTitle>
            <CardDescription>
              Enter your search query to find similar documents using vector similarity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(handleQuery)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="queryText">Search Query *</Label>
                <Textarea
                  id="queryText"
                  placeholder="Enter your search query..."
                  rows={3}
                  {...register('queryText')}
                />
                {errors.queryText && (
                  <p className="text-sm text-red-500">{errors.queryText.message}</p>
                )}
              </div>

              {/* Query History */}
              {queryHistory.length > 0 && (
                <div className="space-y-2">
                  <Label>Recent Queries</Label>
                  <div className="flex flex-wrap gap-2">
                    {queryHistory.map((query, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-slate-100"
                        onClick={() => loadHistoryQuery(query)}
                      >
                        {query.length > 20 ? `${query.substring(0, 20)}...` : query}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="nResults">Number of Results</Label>
                <Select 
                  defaultValue="10" 
                  onValueChange={(value) => setValue('nResults', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 results</SelectItem>
                    <SelectItem value="10">10 results</SelectItem>
                    <SelectItem value="20">20 results</SelectItem>
                    <SelectItem value="50">50 results</SelectItem>
                    <SelectItem value="100">100 results</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Options */}
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Advanced Options
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="where">Metadata Filter (JSON)</Label>
                      <Textarea
                        id="where"
                        placeholder='{"category": "news", "source": "web"}'
                        rows={3}
                        {...register('where')}
                      />
                      <p className="text-xs text-slate-500">
                        Filter results by metadata fields. Enter as valid JSON.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whereDocument">Document Filter (JSON)</Label>
                      <Textarea
                        id="whereDocument"
                        placeholder='$or: [{"$contains": "machine"}, {"$contains": "learning"}]'
                        rows={3}
                        {...register('whereDocument')}
                      />
                      <p className="text-xs text-slate-500">
                        Filter results by document content. Enter as valid JSON.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Search Documents
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Search Results
            </CardTitle>
            <CardDescription>
              {results.length > 0 ? `Found ${results.length} similar documents` : 'Results will appear here'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="border-red-200 bg-red-50 mb-4">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-600">Searching...</span>
              </div>
            )}

            {!loading && !error && results.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">No results yet</p>
                <p className="text-sm text-slate-500">
                  Enter a query and search to see results.
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <Card key={result.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              #{index + 1}
                            </Badge>
                            <Badge className={getDistanceColor(result.distance)}>
                              {getDistanceLabel(result.distance)}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              Distance: {result.distance.toFixed(4)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mb-2 line-clamp-3">
                            {result.content}
                          </p>
                          {result.metadata && Object.keys(result.metadata).length > 0 && (
                            <div className="text-xs">
                              <span className="font-medium text-slate-600">Metadata:</span>
                              <div className="mt-1 p-2 bg-slate-50 rounded text-xs">
                                {JSON.stringify(result.metadata, null, 2)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Query Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Search Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Basic Search</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Use natural language queries</li>
                <li>• Try keywords or phrases</li>
                <li>• Questions work well for semantic search</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Advanced Filtering</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Use metadata filters to narrow results</li>
                <li>• Combine filters for precise searches</li>
                <li>• Document filters search within content</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
