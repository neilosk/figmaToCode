import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * MCP Preview API Route
 * 
 * This route handles communication with our MCP preview server
 * to generate stable component previews using Claude's artifact system.
 */

interface MCPRequest {
  tool: string;
  arguments: {
    code: string;
    componentName: string;
    framework?: string;
    styling?: string;
    files?: Array<{ name: string; content: string; type: string }>;
    options?: any;
  };
}

interface MCPResponse {
  success: boolean;
  previewId?: string;
  previewUrl?: string;
  focusedPrompt?: string;
  chunks?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: MCPRequest = await request.json();
    
    if (!body.tool || !body.arguments) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format'
      }, { status: 400 });
    }

    // Call MCP server
    const result = await callMCPServer(body.tool, body.arguments);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('MCP Preview API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Call the MCP server using stdio transport
 */
async function callMCPServer(toolName: string, args: any): Promise<MCPResponse> {
  return new Promise((resolve, reject) => {
    const mcpServerPath = path.join(process.cwd(), 'mcp-preview-server', 'dist', 'index.js');
    
    // Spawn the MCP server process
    const mcpProcess = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    
    mcpProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    mcpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    mcpProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Parse the MCP response
          const response = parseMCPResponse(stdout);
          resolve(response);
        } catch (parseError) {
          reject(new Error(`Failed to parse MCP response: ${parseError}`));
        }
      } else {
        reject(new Error(`MCP server exited with code ${code}: ${stderr}`));
      }
    });

    mcpProcess.on('error', (error) => {
      reject(new Error(`Failed to start MCP server: ${error.message}`));
    });

    // Send the request to MCP server
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
    mcpProcess.stdin.end();
  });
}

/**
 * Parse MCP server response and extract relevant information
 */
function parseMCPResponse(stdout: string): MCPResponse {
  try {
    // Look for JSON response in stdout
    const lines = stdout.split('\n');
    let mcpResponse = null;
    
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        try {
          mcpResponse = JSON.parse(line);
          break;
        } catch (e) {
          // Continue looking for valid JSON
        }
      }
    }
    
    if (!mcpResponse) {
      throw new Error('No valid JSON response found');
    }
    
    // Extract information from MCP response
    const content = mcpResponse.result?.content?.[0]?.text || '';
    
    // Parse the structured response
    const previewIdMatch = content.match(/\*\*Preview ID\*\*: `([^`]+)`/);
    const chunksMatch = content.match(/\*\*Chunks\*\*: (\d+) parts/);
    const promptMatch = content.match(/## Prompt for Claude Desktop\n\n([\s\S]*?)\n\n---/);
    
    const previewId = previewIdMatch ? previewIdMatch[1] : null;
    const chunks = chunksMatch ? parseInt(chunksMatch[1]) : 0;
    const focusedPrompt = promptMatch ? promptMatch[1] : null;
    
    return {
      success: true,
      previewId,
      previewUrl: previewId ? `http://localhost:3015/preview/${previewId}` : undefined,
      focusedPrompt,
      chunks
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse MCP response: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * GET endpoint to check MCP server status
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Simple health check
    const mcpServerPath = path.join(process.cwd(), 'mcp-preview-server', 'dist', 'index.js');
    const exists = require('fs').existsSync(mcpServerPath);
    
    return NextResponse.json({
      status: 'ok',
      mcpServerExists: exists,
      mcpServerPath
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}