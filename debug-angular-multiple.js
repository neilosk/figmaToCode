/**
 * Debug script for the Angular multiple components generation issue
 * This specifically tests the scenario: Frame -> "Multiple Components" -> "Gemini" -> "Angular 8" -> "Styled Components"
 */

// Mock a typical Figma frame with multiple child elements
const mockFrameWithMultipleElements = {
  name: 'ProductListing',
  type: 'FRAME',
  componentName: 'ProductListing',
  styles: {
    backgroundColor: '#f8fafc',
    width: 800,
    height: 600,
    padding: { top: 24, right: 24, bottom: 24, left: 24 }
  },
  children: [
    {
      name: 'Header',
      type: 'FRAME',
      content: null,
      isComponent: true, // This should be detected by findComponents
      styles: {
        backgroundColor: '#ffffff',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        padding: { top: 16, right: 20, bottom: 16, left: 20 }
      },
      children: [
        {
          name: 'Logo',
          type: 'TEXT',
          content: 'ShopCorp',
          styles: { fontSize: 24, fontWeight: 700, color: '#1f2937' }
        },
        {
          name: 'Nav Menu',
          type: 'TEXT', 
          content: 'Products | About | Contact',
          styles: { fontSize: 16, color: '#6b7280' }
        }
      ]
    },
    {
      name: 'ProductCard',
      type: 'FRAME',
      content: null,
      isComponent: true, // This should be detected by findComponents
      styles: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        width: 280,
        height: 320,
        padding: { top: 16, right: 16, bottom: 16, left: 16 }
      },
      children: [
        {
          name: 'Product Image',
          type: 'RECTANGLE',
          content: null,
          styles: {
            backgroundColor: '#e5e7eb',
            width: 248,
            height: 200,
            borderRadius: 4
          }
        },
        {
          name: 'Product Title',
          type: 'TEXT',
          content: 'Premium Bluetooth Speaker',
          styles: {
            fontSize: 18,
            fontWeight: 600,
            color: '#111827'
          }
        },
        {
          name: 'Product Price',
          type: 'TEXT',
          content: '$149.99',
          styles: {
            fontSize: 20,
            fontWeight: 700,
            color: '#059669'
          }
        },
        {
          name: 'Add to Cart Button',
          type: 'RECTANGLE',
          content: 'Add to Cart',
          styles: {
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            borderRadius: 6,
            padding: { top: 12, right: 16, bottom: 12, left: 16 }
          }
        }
      ]
    },
    {
      name: 'FilterSidebar', 
      type: 'FRAME',
      content: null,
      isComponent: true, // This should be detected by findComponents
      styles: {
        backgroundColor: '#f9fafb',
        width: 200,
        padding: { top: 20, right: 16, bottom: 20, left: 16 }
      },
      children: [
        {
          name: 'Filter Title',
          type: 'TEXT',
          content: 'Filters',
          styles: {
            fontSize: 20,
            fontWeight: 600,
            color: '#111827'
          }
        },
        {
          name: 'Category Filter',
          type: 'TEXT',
          content: 'Categories\nElectronics\nAccessories\nHome',
          styles: {
            fontSize: 14,
            color: '#4b5563'
          }
        }
      ]
    }
  ],
  absoluteBoundingBox: { x: 0, y: 0, width: 800, height: 600 }
};

async function debugAngularMultipleGeneration() {
  console.log('🐛 Debugging Angular Multiple Components Generation...');
  console.log('📋 Test scenario: Frame -> "Multiple Components" -> "Gemini" -> "Angular 8" -> "Styled Components"');
  console.log('');
  
  console.log('📊 Mock frame structure:');
  console.log(`  - Main Frame: ${mockFrameWithMultipleElements.name}`);
  console.log(`  - Child components: ${mockFrameWithMultipleElements.children.filter(c => c.isComponent).length}`);
  mockFrameWithMultipleElements.children.forEach((child, i) => {
    if (child.isComponent) {
      console.log(`    ${i + 1}. ${child.name} (${child.type})`);
    }
  });
  console.log('');

  const testRequest = {
    nodes: [mockFrameWithMultipleElements],
    generationType: 'multiple',
    provider: 'gemini',
    options: {
      framework: 'angular',
      styling: 'styled-components',
      typescript: true,
      includeProps: false,
      responsive: true
    }
  };

  console.log('🚀 Sending request to /api/generate...');
  console.log('⏰ Starting timer...');
  
  const startTime = Date.now();
  let timeoutId;
  
  // Set up a progress tracker
  const progressInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`⏳ Still waiting... ${elapsed}s elapsed`);
  }, 10000); // Log every 10 seconds

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request timeout after 5 minutes'));
      }, 300000); // 5 minute timeout for debugging
    });

    const requestPromise = fetch('http://localhost:3013/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
    });

    const response = await Promise.race([requestPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    clearInterval(progressInterval);
    
    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 1000);
    
    console.log(`⏱️  Request completed in ${totalTime}s`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error:', response.status, response.statusText);
      console.error('📄 Error details:', errorText);
      return;
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Generation successful!');
      console.log(`📦 Generated components: ${result.data.components.length}`);
      
      result.data.components.forEach((comp, i) => {
        console.log(`\n📁 Component ${i + 1}: ${comp.componentName}`);
        console.log(`   Files: ${comp.files.length}`);
        comp.files.forEach(file => {
          console.log(`   - ${file.name} (${file.type}) - ${file.content.length} chars`);
        });
      });
      
      // Check if we got Angular files
      const hasAngularFiles = result.data.components.some(comp => 
        comp.files.some(file => 
          file.type === 'typescript' || 
          file.type === 'html' || 
          file.type === 'scss'
        )
      );
      
      if (hasAngularFiles) {
        console.log('✅ Angular files detected successfully');
      } else {
        console.log('⚠️  No Angular-specific files found');
      }
      
    } else {
      console.error('❌ Generation failed:', result.error);
    }

  } catch (error) {
    clearTimeout(timeoutId);
    clearInterval(progressInterval);
    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 1000);
    
    console.error(`❌ Request failed after ${totalTime}s:`, error.message);
    
    if (error.message.includes('timeout')) {
      console.log('\n🔍 Timeout Analysis:');
      console.log('   - This suggests the Gemini API is taking too long to respond');
      console.log('   - Possible causes:');
      console.log('     1. Complex prompt taking too long to process');
      console.log('     2. Gemini API rate limits or service issues'); 
      console.log('     3. Network connectivity problems');
      console.log('     4. Server-side timeout before completion');
      console.log('\n💡 Suggested fixes:');
      console.log('   - Reduce prompt complexity');
      console.log('   - Add retry logic with exponential backoff');
      console.log('   - Check Gemini API status');
      console.log('   - Consider switching to a different AI provider temporarily');
    }
  }
}

// Run the debug test
console.log('🧪 Starting Angular Multiple Components Debug Test');
console.log('📅 ' + new Date().toISOString());
console.log('');

debugAngularMultipleGeneration();