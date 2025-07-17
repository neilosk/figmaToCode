import { NextRequest, NextResponse } from 'next/server';
import { ClaudeAPI } from '../../../lib/claude-api';
import { OpenAIAPI } from '../../../lib/openai-api';
import { GeminiAPI } from '../../../lib/gemini-api';
import { ProcessedNode } from '../../../types/figma';
import { findComponents } from '../../../utils/figma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      nodes, 
      generationType, 
      options = {},
      provider = 'gemini'
    }: {
      nodes: ProcessedNode[];
      generationType: 'component' | 'page' | 'multiple';
      provider?: 'claude' | 'openai' | 'gemini';
      options: {
        framework?: 'react' | 'vue' | 'angular';
        styling?: 'tailwind' | 'css' | 'styled-components';
        typescript?: boolean;
        includeProps?: boolean;
        responsive?: boolean;
        pageName?: string;
      };
    } = body;

    // Validate required fields
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return NextResponse.json(
        { error: 'Nodes array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!generationType || !['component', 'page', 'multiple'].includes(generationType)) {
      return NextResponse.json(
        { error: 'Valid generation type is required (component, page, or multiple)' },
        { status: 400 }
      );
    }

    // Get API keys from environment
    const claudeApiKey = process.env.ANTHROPIC_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Initialize API client based on provider
    let apiClient: ClaudeAPI | OpenAIAPI | GeminiAPI;
    
    if (provider === 'openai') {
      if (!openaiApiKey) {
        return NextResponse.json(
          { error: 'OpenAI API key is not configured' },
          { status: 500 }
        );
      }
      apiClient = new OpenAIAPI(openaiApiKey);
    } else if (provider === 'gemini') {
      if (!geminiApiKey) {
        return NextResponse.json(
          { error: 'Gemini API key is not configured' },
          { status: 500 }
        );
      }
      apiClient = new GeminiAPI(geminiApiKey);
    } else {
      if (!claudeApiKey) {
        return NextResponse.json(
          { error: 'Claude API key is not configured' },
          { status: 500 }
        );
      }
      apiClient = new ClaudeAPI(claudeApiKey);
    }

    let result;

    switch (generationType) {
      case 'component':
        // Generate single component from first node
        const node = nodes[0];
        try {
          const generated = await apiClient.generateComponent(node, options);
          result = {
            type: 'component',
            componentName: node.componentName || node.name,
            code: generated.tsx, // Keep backwards compatibility
            files: generated.files,
          };
        } catch (error) {
          console.error('Error in component generation:', error);
          throw error;
        }
        break;

      case 'multiple':
        // Find all components in the nodes
        const allComponents: ProcessedNode[] = [];
        nodes.forEach(node => {
          allComponents.push(...findComponents(node));
        });

        if (allComponents.length === 0) {
          return NextResponse.json(
            { error: 'No components found in the provided nodes' },
            { status: 400 }
          );
        }

        // Generate code for each component
        const components = await apiClient.generateMultipleComponents(allComponents, options);
        result = {
          type: 'multiple',
          components: components.map(comp => ({
            componentName: comp.componentName,
            code: comp.files.find(f => f.type === 'tsx')?.content || '', // Keep backwards compatibility
            files: comp.files,
          })),
        };
        break;

      case 'page':
        // Generate complete page
        try {
          const pageGenerated = await apiClient.generatePage(nodes, options);
          result = {
            type: 'page',
            pageName: options.pageName || 'HomePage',
            code: pageGenerated.tsx, // Keep backwards compatibility
            files: pageGenerated.files,
          };
        } catch (error) {
          console.error('Error in page generation:', error);
          throw error;
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid generation type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Error generating code:', error);
    
    // Get provider from request body for error messages
    let errorProvider = 'AI';
    try {
      const errorBody = await request.clone().json();
      errorProvider = errorBody.provider === 'openai' ? 'OpenAI' : 
                     errorBody.provider === 'gemini' ? 'Gemini' : 'Claude';
    } catch {
      // Fallback if can't parse body again
    }
    
    if (error instanceof Error) {
      // Handle specific API errors
      if (error.message.includes('401') || error.message.includes('authentication')) {
        return NextResponse.json(
          { error: `Invalid ${errorProvider} API key. Please check your configuration.` },
          { status: 401 }
        );
      }
      
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('529') || error.message.includes('Overloaded')) {
        return NextResponse.json(
          { error: `${errorProvider} API is currently overloaded. Please wait a few minutes and try again.` },
          { status: 529 }
        );
      }
      
      if (error.message.includes('503') || error.message.includes('service')) {
        return NextResponse.json(
          { error: `${errorProvider} service is temporarily unavailable. Please try again later.` },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: `Code generation failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during code generation.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Code generation API endpoint. Use POST to generate code from Figma designs.' },
    { status: 200 }
  );
}