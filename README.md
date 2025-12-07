# ChromaDB GUI

A modern, full-fledged web interface for ChromaDB vector databases, enabling seamless exploration, management, and modification of collections, schemas, and data. Built with Next.js, TypeScript, and the official ChromaDB TS SDK.

## Features

- **Connection Management**: Secure setup wizard to connect to local ChromaDB instances running in Docker
- **Collection Browser**: Intuitive interface to list, select, and navigate through all collections
- **Schema Viewer**: Visual representation of collection schemas with data types and metadata fields
- **Document Management**: CRUD operations for adding, editing, and deleting documents
- **Similarity Search**: Advanced query interface for vector similarity searches with filters
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS for a beautiful, responsive interface

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Database Client**: ChromaDB TypeScript SDK
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Quick Start

### Prerequisites

- Node.js 18+ 
- A running ChromaDB instance (Docker recommended)

### 1. Start ChromaDB with Docker

```bash
docker run -d --name chromadb -p 8000:8000 chromadb/chroma
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### 4. Connect to ChromaDB

1. Open the application
2. Use the default connection settings (localhost:8000) or customize as needed
3. Click "Connect to ChromaDB"
4. Start exploring your collections!

## Project Structure

```
src/
├── app/                    # Next.js app directory
├── components/
│   ├── app/               # Main application component
│   ├── connection/        # Connection management
│   ├── collections/       # Collection browser
│   ├── schema/           # Schema viewer
│   ├── documents/        # Document management
│   ├── query/            # Query interface
│   ├── layout/           # Layout components
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── chromadb-client.ts # ChromaDB service wrapper
│   └── utils.ts          # Utility functions
└── types/
    └── chromadb.ts       # TypeScript type definitions
```

## Usage

### Connecting to ChromaDB

1. Launch the application
2. Enter your ChromaDB connection details:
   - **Host**: localhost (for Docker instances)
   - **Port**: 8000 (default ChromaDB port)
   - **Connection Name**: A friendly name for your connection
3. Click "Connect to ChromaDB"

### Managing Collections

- **Browse**: View all collections with document counts and metadata
- **View Schema**: Examine collection structure, vector dimensions, and metadata fields
- **Manage Documents**: Add, edit, or delete documents in collections
- **Query**: Perform similarity searches with advanced filtering options

### Similarity Search

1. Select a collection from the sidebar
2. Navigate to the Query page
3. Enter your search query in natural language
4. Use advanced filters for precise results:
   - Metadata filters: `{"category": "news"}`
   - Document content filters: `{"$contains": "machine learning"}`
5. View ranked results with similarity scores

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

1. Create new components in the appropriate `src/components/` subdirectory
2. Add TypeScript types in `src/types/chromadb.ts`
3. Extend the ChromaDB service in `src/lib/chromadb-client.ts`
4. Update the main app component in `src/components/app/chromadb-gui.tsx`

## MVP Scope

The current MVP includes:

- ✅ Connection management for local ChromaDB instances
- ✅ Collection browsing and management
- ✅ Schema visualization
- ✅ Basic CRUD operations for documents
- ✅ Similarity search with filtering
- ✅ Responsive web UI

### Future Enhancements

- Advanced analytics and performance monitoring
- Batch operations for bulk imports/exports
- User authentication and multi-tenant support
- Real-time collaboration features
- Mobile responsiveness and PWA capabilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues and questions:

1. Check the [GitHub Issues](https://github.com/your-repo/chromadb-gui/issues)
2. Review the ChromaDB [official documentation](https://docs.trychroma.com/)
3. Join our community discussions

---

Built with ❤️ for the ChromaDB community
