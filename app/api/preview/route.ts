import { NextRequest, NextResponse } from 'next/server';

interface ComponentData {
  componentName: string;
  code: string;
  timestamp: number;
  lineCount: number;
  frameName?: string;
  files?: Array<{ name: string; content: string; type: string }>;
}

// In-memory storage for components
let components: ComponentData[] = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const frameName = searchParams.get('frame');
    
    if (frameName) {
      // Filter components by frame name
      const frameComponents = components.filter(comp => 
        comp.frameName?.toLowerCase() === frameName.toLowerCase()
      );
      return NextResponse.json({ components: frameComponents });
    }
    
    // Return all components with metadata
    return NextResponse.json({ 
      components,
      total: components.length,
      lastUpdated: components.length > 0 ? Math.max(...components.map(c => c.timestamp)) : null
    });
  } catch (error) {
    console.error('Error fetching components:', error);
    return NextResponse.json({ error: 'Failed to fetch components' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { componentName, code, frameName, files } = body;
    
    if (!componentName || !code) {
      return NextResponse.json({ error: 'Component name and code are required' }, { status: 400 });
    }
    
    const newComponent: ComponentData = {
      componentName,
      code,
      frameName: frameName || 'default',
      timestamp: Date.now(),
      lineCount: code.split('\n').length,
      files: files || []
    };
    
    // Add to components array
    components.unshift(newComponent);
    
    // Keep only the last 10 components
    if (components.length > 10) {
      components = components.slice(0, 10);
    }
    
    return NextResponse.json({ 
      message: 'Component saved successfully',
      component: newComponent,
      total: components.length
    });
  } catch (error) {
    console.error('Error saving component:', error);
    return NextResponse.json({ error: 'Failed to save component' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const frameName = searchParams.get('frame');
    
    if (frameName) {
      // Delete components for specific frame
      const initialCount = components.length;
      components = components.filter(comp => 
        comp.frameName?.toLowerCase() !== frameName.toLowerCase()
      );
      const deletedCount = initialCount - components.length;
      
      return NextResponse.json({ 
        message: `Deleted ${deletedCount} components for frame '${frameName}'`,
        remaining: components.length
      });
    }
    
    // Clear all components
    const deletedCount = components.length;
    components = [];
    
    return NextResponse.json({ 
      message: `Deleted ${deletedCount} components`,
      remaining: 0
    });
  } catch (error) {
    console.error('Error deleting components:', error);
    return NextResponse.json({ error: 'Failed to delete components' }, { status: 500 });
  }
}