/**
 * Test script for Angular generation with Gemini API
 * This tests the new Angular 8 + Bootstrap 4.3 + Material 8 functionality
 */

async function testAngularGeneration() {
  console.log('🧪 Testing Angular generation with Gemini API...');
  
  // Mock Figma node data for testing
  const mockFigmaNode = {
    name: 'ProductCard',
    componentName: 'ProductCard',
    type: 'FRAME',
    content: null,
    styles: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      width: 300,
      height: 400,
      display: 'flex',
      flexDirection: 'column'
    },
    children: [
      {
        name: 'Product Title',
        type: 'TEXT',
        content: 'Premium Wireless Headphones',
        styles: {
          fontSize: 24,
          fontWeight: 600,
          color: '#1f2937'
        },
        children: []
      },
      {
        name: 'Product Price',
        type: 'TEXT', 
        content: '$299.99',
        styles: {
          fontSize: 20,
          fontWeight: 500,
          color: '#059669'
        },
        children: []
      },
      {
        name: 'Buy Button',
        type: 'RECTANGLE',
        content: 'Buy Now',
        styles: {
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          borderRadius: 4,
          padding: { top: 12, right: 24, bottom: 12, left: 24 }
        },
        children: []
      }
    ],
    absoluteBoundingBox: { x: 100, y: 200, width: 300, height: 400 }
  };

  const testOptions = {
    framework: 'angular',
    styling: 'styled-components', // This triggers Bootstrap + Material
    typescript: true,
    includeProps: false,
    responsive: true
  };

  try {
    // Test the API call
    console.log('📡 Sending test request...');
    
    const response = await fetch('http://localhost:3013/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nodes: [mockFigmaNode],
        generationType: 'component',
        provider: 'gemini',
        options: testOptions
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Angular generation successful!');
      console.log('📁 Generated files:');
      
      result.data.files.forEach(file => {
        console.log(`  - ${file.name} (${file.type})`);
        console.log(`    Content preview: ${file.content.substring(0, 100)}...`);
      });

      // Verify we got all three expected files
      const expectedTypes = ['typescript', 'html', 'scss'];
      const actualTypes = result.data.files.map(f => f.type);
      
      const hasAllFiles = expectedTypes.every(type => actualTypes.includes(type));
      
      if (hasAllFiles) {
        console.log('✅ All expected file types generated (TypeScript, HTML, SCSS)');
      } else {
        console.log('⚠️  Missing expected file types');
        console.log('  Expected:', expectedTypes);
        console.log('  Actual:', actualTypes);
      }

      // Check for Bootstrap and Material references
      const tsFile = result.data.files.find(f => f.type === 'typescript');
      const htmlFile = result.data.files.find(f => f.type === 'html');
      const scssFile = result.data.files.find(f => f.type === 'scss');

      if (tsFile && tsFile.content.includes('@Component')) {
        console.log('✅ TypeScript file contains Angular component structure');
      }

      if (htmlFile && (htmlFile.content.includes('mat-') || htmlFile.content.includes('container'))) {
        console.log('✅ HTML file contains Bootstrap/Material references');
      }

      if (scssFile && scssFile.content.includes('@import')) {
        console.log('✅ SCSS file contains proper imports');
      }

    } else {
      console.error('❌ Generation failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testAngularGeneration();
} else {
  // Browser environment
  console.log('🌐 Run this test in a browser console while the app is running');
  window.testAngularGeneration = testAngularGeneration;
}