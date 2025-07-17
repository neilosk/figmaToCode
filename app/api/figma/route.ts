// 


import { NextRequest, NextResponse } from 'next/server';
import { processNode } from '../../../utils/figma';


export async function GET() {
  return NextResponse.json({ 
    message: 'Figma API endpoint is working!', 
    instructions: 'Use POST with figmaUrl and accessToken to fetch Figma files'
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Figma API route: POST request received');
    
    const body = await request.json();
    const { figmaUrl, accessToken } = body;
    
    console.log('📝 Request data:', { 
      figmaUrl: figmaUrl?.substring(0, 50) + '...', 
      hasToken: !!accessToken 
    });

    if (!figmaUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Missing figmaUrl or accessToken' },
        { status: 400 }
      );
    }

    // Extract file key from URL
    let fileKey = '';
    const apiUrlMatch = figmaUrl.match(/api\.figma\.com\/v1\/files\/([a-zA-Z0-9]+)/);
    if (apiUrlMatch) {
      fileKey = apiUrlMatch[1];
    } else {
      const urlMatch = figmaUrl.match(/figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)/);
      if (urlMatch) {
        fileKey = urlMatch[1];
      } else if (/^[a-zA-Z0-9]+$/.test(figmaUrl)) {
        fileKey = figmaUrl;
      }
    }

    if (!fileKey) {
      return NextResponse.json(
        { error: 'Could not extract file key from URL' },
        { status: 400 }
      );
    }

    console.log('📝 File key extracted:', fileKey);

    // For large files, we'll need to use a different strategy
    // Start with basic request and handle large responses in processing
    const figmaApiUrl = `https://api.figma.com/v1/files/${fileKey}`;
    console.log('📝 Making GET request to:', figmaApiUrl);

    const figmaResponse = await fetch(figmaApiUrl, {
      method: 'GET',
      headers: {
        'X-Figma-Token': accessToken,
      },
    });

    console.log('📝 Figma response status:', figmaResponse.status);

    // If the request is still too large, try with more restrictive parameters
    if (!figmaResponse.ok) {
      const errorText = await figmaResponse.text();
      console.error('📝 First attempt failed:', errorText);
      
      if (figmaResponse.status === 400 && errorText.includes('Request too large')) {
        console.log('📝 File too large - providing guidance to user...');
        
        return NextResponse.json(
          { 
            error: `Figma file is too large (375,000+ elements)`,
            details: errorText,
            suggestions: [
              '1. Break your Figma file into smaller files (recommended)',
              '2. Create a separate "Components" page with only the frames you want to convert',
              '3. Use Figma\'s "Export" feature to create smaller component files',
              '4. Consider using frame-specific URLs if Figma supports them'
            ],
            tip: 'For best results, keep Figma files under 50-100 frames for code generation.'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Figma API error: ${figmaResponse.status} - ${errorText}` },
        { status: figmaResponse.status }
      );
    }

    const figmaData = await figmaResponse.json();
    console.log('📝 Success! File name:', figmaData.name);

    // Simple processing - just get the frames without complex processing for now
    const pages = figmaData.document?.children || [];
    let allFrames: any[] = [];
    
    // Extract frames from all pages
    pages.forEach((page: any) => {
      if (page.type === 'CANVAS' && page.children) {
        const pageFrames = page.children.filter((child: any) => child.type === 'FRAME');
        allFrames.push(...pageFrames);
      }
    });

    // Convert to our comprehensive format using processNode
    const processedFrames = allFrames.map((frame: any) => processNode(frame));

    return NextResponse.json({
      success: true,
      data: {
        fileName: figmaData.name,
        fileKey,
        lastModified: figmaData.lastModified,
        thumbnailUrl: figmaData.thumbnailUrl,
        frames: processedFrames,
        totalFrames: processedFrames.length,
        rawDocument: figmaData.document, // Include raw data for debugging
      },
    });

  } catch (error) {
    console.error('📝 Server error:', error);
    return NextResponse.json(
      { 
        error: 'Server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}