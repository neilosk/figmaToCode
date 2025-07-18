#!/usr/bin/env node

/**
 * Simple test script for the MCP preview server
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test component code
const testCode = `
import React from 'react';

export default function TestComponent() {
  return (
    <div className="p-8 bg-blue-50 rounded-lg border-2 border-blue-200">
      <h1 className="text-2xl font-bold text-blue-800 mb-4">
        🎉 MCP Preview Test
      </h1>
      <p className="text-blue-600 mb-2">
        ✅ MCP Server: Working
      </p>
      <p className="text-blue-600 mb-2">
        ✅ Context Chunking: Active
      </p>
      <p className="text-blue-600">
        ✅ Claude Desktop Compatible: Yes
      </p>
      <p className="text-sm text-blue-500 mt-4">
        Generated at: {new Date().toLocaleString()}
      </p>
    </div>
  );
}
`;

// Test the MCP server
async function testMCPServer() {
  console.log('🧪 Testing MCP Preview Server...');
  
  try {
    const mcpServerPath = path.join(__dirname, 'dist', 'index.js');
    console.log('📁 MCP Server Path:', mcpServerPath);
    
    // Spawn the MCP server
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
      console.log('🔄 MCP Server exited with code:', code);
      console.log('📤 Stdout:', stdout);
      console.log('📤 Stderr:', stderr);
    });

    // Send test request
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'render_component_preview',
        arguments: {
          code: testCode,
          componentName: 'TestComponent',
          framework: 'react',
          styling: 'tailwind'
        }
      }
    };

    console.log('📨 Sending MCP request...');
    console.log(JSON.stringify(mcpRequest, null, 2));

    mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
    mcpProcess.stdin.end();

    // Wait for response
    setTimeout(() => {
      if (mcpProcess.exitCode === null) {
        console.log('⏰ Timeout - terminating MCP process');
        mcpProcess.kill();
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMCPServer();