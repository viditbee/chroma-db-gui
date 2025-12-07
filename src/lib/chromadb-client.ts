import { ChromaClient, EmbeddingFunction } from 'chromadb';
import type { 
  ChromaConnection, 
  Collection, 
  Document, 
  QueryResult, 
  CollectionSchema,
  QueryRequest 
} from '@/types/chromadb';

// Simple embedding function that uses a placeholder
// In production, you'd use a real embedding model
class SimpleEmbeddingFunction implements EmbeddingFunction {
  async generate(texts: string[]): Promise<number[][]> {
    // This is a placeholder - in real usage, you'd use OpenAI, Cohere, or another embedding service
    // For now, we'll return simple hash-based embeddings with 1536 dimensions (OpenAI default)
    return texts.map(text => {
      // Simple hash-based embedding (1536 dimensions to match OpenAI)
      const embedding = new Array(1536).fill(0);
      for (let i = 0; i < text.length; i++) {
        embedding[i % 1536] = (embedding[i % 1536] + text.charCodeAt(i)) % 1000;
      }
      return embedding;
    });
  }
}

export class ChromaDBService {
  private client: ChromaClient | null = null;
  private connection: ChromaConnection | null = null;

  async connect(connection: Omit<ChromaConnection, 'id' | 'connected' | 'createdAt'>): Promise<ChromaConnection> {
    try {
      console.log('🔗 Connecting to ChromaDB at:', `http://${connection.host}:${connection.port}`);

      this.client = new ChromaClient({
        host: connection.host,
        port: connection.port,
        ssl: false
      });

      console.log('✅ ChromaClient created, testing connection...');

      // Test connection by getting heartbeat
      const heartbeat = await this.client.heartbeat();
      console.log('💓 Heartbeat response:', heartbeat);

      this.connection = {
        ...connection,
        id: `conn_${Date.now()}`,
        connected: true,
        createdAt: new Date()
      };

      console.log('🎉 Successfully connected to ChromaDB');
      return this.connection;
    } catch (error) {
      console.error('❌ ChromaDB connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to connect to ChromaDB: ${errorMessage}`);
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.connection = null;
  }

  isConnected(): boolean {
    return this.client !== null && this.connection?.connected === true;
  }

  getConnection(): ChromaConnection | null {
    return this.connection;
  }

  getClient(): ChromaClient | null {
    return this.client;
  }

  async getCollections(): Promise<Collection[]> {
    if (!this.client) {
      throw new Error('Not connected to ChromaDB');
    }

    try {
      const collections = await this.client.listCollections();
      return collections.map((collection, index) => ({
        id: `collection_${index}`,
        name: collection.name,
        count: 0, // We'll get this when we fetch the collection details
        metadata: collection.metadata,
        createdAt: new Date()
      }));
    } catch (error) {
      throw new Error(`Failed to fetch collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCollectionDetails(collectionName: string): Promise<Collection> {
    if (!this.client) {
      throw new Error('Not connected to ChromaDB');
    }

    try {
      const collection = await this.client.getCollection({ 
        name: collectionName,
        embeddingFunction: new SimpleEmbeddingFunction()
      });
      const count = await collection.count();

      return {
        id: `collection_${collectionName}`,
        name: collectionName,
        count,
        metadata: collection.metadata || undefined,
        createdAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get collection details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCollectionSchema(collectionName: string): Promise<CollectionSchema> {
    if (!this.client) {
      throw new Error('Not connected to ChromaDB');
    }

    try {
      const collection = await this.client.getCollection({ 
        name: collectionName,
        embeddingFunction: new SimpleEmbeddingFunction()
      });

      // Get a sample document to infer schema
      const results = await collection.get({ limit: 1 });

      const fields: any[] = [];

      // Infer fields from sample data
      if (results.metadatas && results.metadatas.length > 0) {
        const metadata = results.metadatas[0];
        if (metadata) {
          Object.entries(metadata).forEach(([key, value]) => {
            fields.push({
              name: key,
              type: typeof value,
              nullable: value === null,
              sample: value
            });
          });
        }
      }

      return {
        name: collectionName,
        vectorDimension: 1536, // Updated to match OpenAI default
        distanceFunction: 'cosine', // Default distance function
        fields
      };
    } catch (error) {
      throw new Error(`Failed to get collection schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async queryCollection(collectionName: string, queryRequest: QueryRequest): Promise<QueryResult[]> {
    if (!this.client) {
      throw new Error('Not connected to ChromaDB');
    }

    try {
      const collection = await this.client.getCollection({ 
        name: collectionName,
        embeddingFunction: new SimpleEmbeddingFunction()
      });

      const queryOptions: any = {
        nResults: queryRequest.nResults || 10,
        include: queryRequest.include || ['documents', 'metadatas', 'distances']
      };

      if (queryRequest.queryText) {
        queryOptions.queryTexts = [queryRequest.queryText];
      }

      if (queryRequest.queryVector) {
        queryOptions.queryEmbeddings = [queryRequest.queryVector];
      }

      if (queryRequest.where) {
        queryOptions.where = queryRequest.where;
      }

      if (queryRequest.whereDocument) {
        queryOptions.whereDocument = queryRequest.whereDocument;
      }

      const results = await collection.query(queryOptions);

      const queryResults: QueryResult[] = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          queryResults.push({
            id: results.ids[0][i],
            content: results.documents?.[0]?.[i] || '',
            metadata: results.metadatas?.[0]?.[i] as Record<string, any> || undefined,
            distance: results.distances?.[0]?.[i] || 0
          });
        }
      }

      return queryResults;
    } catch (error) {
      throw new Error(`Failed to query collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async addDocument(collectionName: string, document: Omit<Document, 'id'>): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to ChromaDB');
    }

    try {
      const collection = await this.client.getCollection({ 
        name: collectionName,
        embeddingFunction: new SimpleEmbeddingFunction()
      });
      
      const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await collection.add({
        ids: [id],
        documents: [document.content],
        metadatas: [document.metadata || {}]
      });

      return id;
    } catch (error) {
      throw new Error(`Failed to add document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateDocument(collectionName: string, document: Document): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to ChromaDB');
    }

    try {
      console.log('🔄 Updating document:', { collectionName, documentId: document.id });
      const collection = await this.client.getCollection({ 
        name: collectionName,
        embeddingFunction: new SimpleEmbeddingFunction()
      });
      
      console.log('📤 Sending update request...');
      await collection.update({
        ids: [document.id],
        documents: [document.content],
        metadatas: [document.metadata || {}]
      });
      
      console.log('✅ Document updated successfully');
    } catch (error) {
      console.error('❌ Update failed:', error);
      throw new Error(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to ChromaDB');
    }

    try {
      const collection = await this.client.getCollection({ 
        name: collectionName,
        embeddingFunction: new SimpleEmbeddingFunction()
      });
      
      await collection.delete({
        ids: [documentId]
      });
    } catch (error) {
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private inferFieldType(value: any): 'string' | 'number' | 'boolean' | 'array' | 'object' {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'string'; // Default fallback
  }
}

export const chromaDBService = new ChromaDBService();
