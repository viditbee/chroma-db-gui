export interface ChromaConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  connected: boolean;
  createdAt: Date;
}

export interface Collection {
  id: string;
  name: string;
  count: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface QueryResult {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  distance: number;
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
}

export interface CollectionSchema {
  name: string;
  vectorDimension: number;
  distanceFunction: 'cosine' | 'euclidean' | 'manhattan';
  fields: SchemaField[];
}

export interface QueryRequest {
  queryText?: string;
  queryVector?: number[];
  nResults?: number;
  where?: Record<string, any>;
  whereDocument?: Record<string, any>;
  include?: ('documents' | 'embeddings' | 'metadatas' | 'distances')[];
}
