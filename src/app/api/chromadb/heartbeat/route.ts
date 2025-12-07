import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('http://localhost:8000/api/v2/heartbeat');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('ChromaDB heartbeat error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to ChromaDB' },
      { status: 500 }
    );
  }
}
