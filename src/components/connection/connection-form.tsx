'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plug, Wifi, WifiOff } from 'lucide-react';
import { chromaDBService } from '@/lib/chromadb-client';
import { ChromaConnection } from '@/types/chromadb';

const connectionSchema = z.object({
  name: z.string().min(1, 'Connection name is required'),
  host: z.string().min(1, 'Host is required'),
  port: z.number().min(1).max(65535, 'Port must be between 1 and 65535'),
});

type ConnectionFormData = z.infer<typeof connectionSchema>;

interface ConnectionFormProps {
  onConnectionSuccess: (connection: ChromaConnection) => void;
  onConnectionError: (error: string) => void;
}

export function ConnectionForm({ onConnectionSuccess, onConnectionError }: ConnectionFormProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      name: 'Local ChromaDB',
      host: 'localhost',
      port: 8000,
    }
  });

  const watchedValues = watch();

  const testConnection = async () => {
    setIsConnecting(true);
    setTestResult(null);

    try {
      const connection = await chromaDBService.connect(watchedValues);
      setTestResult({
        success: true,
        message: 'Connection successful! ChromaDB is responding.'
      });
      onConnectionSuccess(connection);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setTestResult({
        success: false,
        message: errorMessage
      });
      onConnectionError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const onSubmit = async (data: ConnectionFormData) => {
    await testConnection();
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Connect to ChromaDB
          </CardTitle>
          <CardDescription>
            Enter your ChromaDB connection details to get started. Make sure your ChromaDB instance is running.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Connection Name</Label>
              <Input
                id="name"
                placeholder="My ChromaDB Instance"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                placeholder="localhost"
                {...register('host')}
              />
              {errors.host && (
                <p className="text-sm text-red-500">{errors.host.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                placeholder="8000"
                {...register('port', { valueAsNumber: true })}
              />
              {errors.port && (
                <p className="text-sm text-red-500">{errors.port.message}</p>
              )}
            </div>

            {testResult && (
              <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                    {testResult.message}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plug className="mr-2 h-4 w-4" />
                  Connect to ChromaDB
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Quick Start with Docker:</h4>
            <code className="text-xs bg-slate-100 p-2 rounded block">
              docker run -d --name chromadb -p 8000:8000 chromadb/chroma
            </code>
            <p className="text-xs text-slate-600 mt-2">
              Run this command to start a local ChromaDB instance, then use the default settings above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
