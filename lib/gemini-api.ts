import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProcessedNode } from '../types/figma';

/**
 * Gemini API client for code generation
 */
export class GeminiAPI {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Generate component code from processed Figma node
   */
  async generateComponent(
    node: ProcessedNode,
    options: {
      framework?: 'react' | 'vue' | 'angular';
      styling?: 'tailwind' | 'css' | 'styled-components';
      typescript?: boolean;
      includeProps?: boolean;
      responsive?: boolean;
    } = {}
  ): Promise<{ tsx: string; css?: string; files: { name: string; content: string; type: string }[] }> {
    const {
      framework = 'react',
      styling = 'tailwind',
      typescript = true,
      includeProps = true,
      responsive = true,
    } = options;

    const prompt = framework === 'angular' && styling === 'styled-components' ? 
      this.buildAngularComponentPrompt(node, { typescript, responsive }) :
      this.buildComponentPrompt(node, {
        framework,
        styling,
        typescript,
        includeProps, 
        responsive,
      });

    try {
      // Use Gemini 2.5 Flash for optimal performance
      // Adjust token limits for Angular generation
      const maxTokens = framework === 'angular' && styling === 'styled-components' ?  32768 : 32768;
      const model = this.client.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.1,
        },
      });

      console.log(`🔥 Generating ${framework} component with Gemini...`);
      console.log(`📏 Prompt length: ${prompt.length} chars, Max tokens: ${maxTokens}`);
      
      // Add timeout wrapper for long-running requests
      const timeoutSeconds = framework === 'angular' && styling === 'styled-components' ? 180 : 120;
      const generateWithTimeout = Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Gemini API timeout after ${timeoutSeconds} seconds. Try again or switch to a different AI provider.`)), timeoutSeconds * 1000)
        )
      ]);

      const result = await generateWithTimeout as any;
      const response = result.response;
      const content = response.text();
      
      console.log(`✅ Gemini generation completed, response length: ${content?.length || 0} chars`);

      if (content) {
        // Handle Angular specifically
        if (framework === 'angular' && styling === 'styled-components') {
          return this.extractAngularFilesFromResponse(content, node.componentName || node.name);
        }
        return this.extractMultipleFilesFromResponse(content, node.componentName || node.name, styling);
      }

      throw new Error('No content received from Gemini API');
    } catch (error) {
      if (error instanceof Error) {
        // Check for specific API errors
        if (error.message.includes('429') || error.message.includes('RATE_LIMIT')) {
          throw new Error('429 Rate limit exceeded');
        }
        if (error.message.includes('503') || error.message.includes('UNAVAILABLE')) {
          throw new Error('503 Gemini service temporarily unavailable');
        }
        if (error.message.includes('SAFETY')) {
          throw new Error('Content filtered by Gemini safety systems');
        }
      }
      throw new Error(`Failed to generate component: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate multiple components from a list of nodes
   */
  async generateMultipleComponents(
    nodes: ProcessedNode[],
    options: {
      framework?: 'react' | 'vue' | 'angular';
      styling?: 'tailwind' | 'css' | 'styled-components';
      typescript?: boolean;
      includeProps?: boolean;
      responsive?: boolean;
    } = {}
  ): Promise<{ componentName: string; files: { name: string; content: string; type: string }[] }[]> {
    const results: { componentName: string; files: { name: string; content: string; type: string }[] }[] = [];
    const { framework = 'react', styling = 'tailwind' } = options;

    console.log(`🔄 Starting multiple component generation: ${nodes.length} components (${framework}/${styling})`);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      try {
        console.log(`📦 Generating component ${i + 1}/${nodes.length}: ${node.name}`);
        const generated = await this.generateComponent(node, options);
        results.push({
          componentName: node.componentName || node.name,
          files: generated.files,
        });
        console.log(`✅ Component ${i + 1}/${nodes.length} completed: ${node.name}`);
      } catch (error) {
        console.error(`❌ Failed to generate component ${i + 1}/${nodes.length} (${node.name}):`, error);
        // Continue with other components even if one fails
        
        // Add a minimal fallback component for failed generations
        results.push({
          componentName: node.componentName || node.name,
          files: [{
            name: `${(node.componentName || node.name).replace(/[^a-zA-Z0-9]/g, '')}.error.txt`,
            content: `Error generating component: ${error instanceof Error ? error.message : 'Unknown error'}`,
            type: 'text'
          }]
        });
      }
    }

    console.log(`🎯 Multiple component generation completed: ${results.length}/${nodes.length} successful`);
    return results;
  }

  /**
   * Generate a complete page from processed nodes
   */
  async generatePage(
    nodes: ProcessedNode[],
    options: {
      framework?: 'react' | 'vue' | 'angular';
      styling?: 'tailwind' | 'css' | 'styled-components';
      typescript?: boolean;
      responsive?: boolean;
      pageName?: string;
    } = {}
  ): Promise<{ tsx: string; css?: string; files: { name: string; content: string; type: string }[] }> {
    const {
      framework = 'react',
      styling = 'tailwind',
      typescript = true,
      responsive = true,
      pageName = 'HomePage',
    } = options;

    const prompt = this.buildPagePrompt(nodes, {
      framework,
      styling,
      typescript,
      responsive,
      pageName,
    });

    try {
      // Use Gemini 2.5 Flash for optimal performance
      const model = this.client.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          maxOutputTokens:  32768,
          temperature: 0.1,
        },
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const content = response.text();

      if (content) {
        return this.extractMultipleFilesFromResponse(content, pageName, styling);
      }

      throw new Error('No content received from Gemini API');
    } catch (error) {
      if (error instanceof Error) {
        // Check for specific API errors
        if (error.message.includes('429') || error.message.includes('RATE_LIMIT')) {
          throw new Error('429 Rate limit exceeded');
        }
        if (error.message.includes('503') || error.message.includes('UNAVAILABLE')) {
          throw new Error('503 Gemini service temporarily unavailable');
        }
        if (error.message.includes('SAFETY')) {
          throw new Error('Content filtered by Gemini safety systems');
        }
      }
      throw new Error(`Failed to generate page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze design content to extract meaningful information
   */
  private analyzeDesignContent(node: ProcessedNode): string {
    const analysis: string[] = [];
    
    // Component overview
    analysis.push(`COMPONENT: ${node.componentName || node.name}`);
    analysis.push(`TYPE: ${node.type}`);
    
    // Dimensions
    if (node.styles.width && node.styles.height) {
      analysis.push(`DIMENSIONS: ${node.styles.width}×${node.styles.height}px`);
    }
    
    // Layout analysis
    const layoutInfo = this.analyzeLayout(node);
    if (layoutInfo) {
      analysis.push(`LAYOUT: ${layoutInfo}`);
    }
    
    // Content extraction with positioning
    const content = this.extractAllTextWithPosition(node);
    if (content.length > 0) {
      analysis.push(`TEXT CONTENT (with positions):`);
      content.forEach((text, index) => {
        const pos = text.position ? ` at (${text.position.x}, ${text.position.y})` : '';
        analysis.push(`  ${index + 1}. "${text.content}" (${text.type}, ${text.styles}${pos})`);
      });
    }
    
    // Color scheme with context
    const colors = this.extractColorSchemeWithContext(node);
    if (colors.length > 0) {
      analysis.push(`COLORS WITH CONTEXT:`);
      colors.forEach(color => analysis.push(`  ${color}`));
    }
    
    // Spacing and layout details
    const spacing = this.analyzeSpacing(node);
    if (spacing.length > 0) {
      analysis.push(`SPACING & LAYOUT:`);
      spacing.forEach(space => analysis.push(`  ${space}`));
    }
    
    // Visual elements (boxes, shapes, etc.)
    const visualElements = this.analyzeVisualElements(node);
    if (visualElements.length > 0) {
      analysis.push(`VISUAL ELEMENTS:`);
      visualElements.forEach(element => analysis.push(`  ${element}`));
    }
    
    // Interactive elements with more detail
    const interactive = this.findInteractiveElementsDetailed(node);
    if (interactive.length > 0) {
      analysis.push(`INTERACTIVE ELEMENTS:`);
      interactive.forEach(element => analysis.push(`  ${element}`));
    }
    
    return analysis.join('\n');
  }

  /**
   * Analyze layout structure
   */
  private analyzeLayout(node: ProcessedNode): string | null {
    if (node.styles.display === 'flex') {
      const direction = node.styles.flexDirection || 'row';
      const align = node.styles.alignItems || 'stretch';
      const justify = node.styles.justifyContent || 'flex-start';
      const gap = node.styles.gap ? ` with ${node.styles.gap}px gap` : '';
      return `Flexbox ${direction}${gap}, align: ${align}, justify: ${justify}`;
    }
    return null;
  }

  /**
   * Extract all text content with position and detailed styling
   */
  private extractAllTextWithPosition(node: ProcessedNode): Array<{
    content: string;
    type: string;
    styles: string;
    position?: { x: number; y: number };
  }> {
    const texts: Array<{
      content: string;
      type: string;
      styles: string;
      position?: { x: number; y: number };
    }> = [];
    
    if (node.content) {
      const type = this.categorizeText(node.content, node.styles);
      const styles = this.formatTextStyles(node.styles);
      const position = node.absoluteBoundingBox ? 
        { x: node.absoluteBoundingBox.x, y: node.absoluteBoundingBox.y } : undefined;
      
      texts.push({ content: node.content, type, styles, position });
    }
    
    if (node.children) {
      node.children.forEach(child => {
        texts.push(...this.extractAllTextWithPosition(child));
      });
    }
    
    return texts;
  }

  /**
   * Categorize text based on styling
   */
  private categorizeText(content: string, styles: any): string {
    const fontSize = styles.fontSize || 16;
    const fontWeight = styles.fontWeight || 400;
    
    if (fontSize >= 32) return 'Large Heading';
    if (fontSize >= 24) return 'Medium Heading';
    if (fontSize >= 18) return 'Small Heading';
    if (fontWeight >= 600) return 'Bold Text';
    if (content.length < 30) return 'Label/Button';
    return 'Body Text';
  }

  /**
   * Format text styles for display
   */
  private formatTextStyles(styles: any): string {
    const parts: string[] = [];
    
    if (styles.fontSize) parts.push(`${styles.fontSize}px`);
    if (styles.fontWeight) parts.push(`weight-${styles.fontWeight}`);
    if (styles.fontFamily) parts.push(styles.fontFamily);
    if (styles.color) parts.push(`color: ${styles.color}`);
    
    return parts.join(', ') || 'default styling';
  }

  /**
   * Extract colors with context
   */
  private extractColorSchemeWithContext(node: ProcessedNode): string[] {
    const colors: string[] = [];
    
    const addColorWithContext = (color: string, context: string, nodeName: string) => {
      colors.push(`${color} (${context} on "${nodeName}")`);
    };
    
    if (node.styles.backgroundColor) {
      addColorWithContext(node.styles.backgroundColor, 'background', node.name);
    }
    if (node.styles.color) {
      addColorWithContext(node.styles.color, 'text', node.name);
    }
    
    if (node.children) {
      node.children.forEach(child => {
        colors.push(...this.extractColorSchemeWithContext(child));
      });
    }
    
    return colors;
  }

  /**
   * Analyze spacing and layout details
   */
  private analyzeSpacing(node: ProcessedNode): string[] {
    const spacing: string[] = [];
    
    if (node.styles.padding) {
      const p = node.styles.padding;
      spacing.push(`Padding: ${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`);
    }
    
    if (node.styles.gap) {
      spacing.push(`Gap between children: ${node.styles.gap}px`);
    }
    
    if (node.styles.borderRadius) {
      spacing.push(`Border radius: ${node.styles.borderRadius}px`);
    }
    
    return spacing;
  }

  /**
   * Analyze visual elements like shapes, containers
   */
  private analyzeVisualElements(node: ProcessedNode): string[] {
    const elements: string[] = [];
    
    // Container analysis
    if (node.styles.backgroundColor && node.children && node.children.length > 0) {
      elements.push(`Container with ${node.styles.backgroundColor} background containing ${node.children.length} elements`);
    }
    
    // Shape analysis
    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
      const color = node.styles.backgroundColor || 'transparent';
      elements.push(`${node.type.toLowerCase()} shape with ${color} fill`);
    }
    
    // Card-like structures
    if (this.looksLikeCard(node)) {
      elements.push(`Card-like container (has background, padding, and content)`);
    }
    
    if (node.children) {
      node.children.forEach(child => {
        elements.push(...this.analyzeVisualElements(child));
      });
    }
    
    return elements;
  }

  /**
   * Find interactive elements with detailed info
   */
  private findInteractiveElementsDetailed(node: ProcessedNode): string[] {
    const interactive: string[] = [];
    
    if (node.content) {
      if (this.looksLikeButton(node)) {
        const color = node.styles.backgroundColor || 'default';
        const size = node.styles.width && node.styles.height ? 
          `${node.styles.width}×${node.styles.height}px` : 'auto';
        interactive.push(`Button: "${node.content}" (${color} background, ${size})`);
      }
      
      if (this.looksLikeLink(node)) {
        interactive.push(`Link: "${node.content}" (${node.styles.color || 'default color'})`);
      }
    }
    
    if (node.children) {
      node.children.forEach(child => {
        interactive.push(...this.findInteractiveElementsDetailed(child));
      });
    }
    
    return interactive;
  }

  /**
   * Determine if a node looks like a button
   */
  private looksLikeButton(node: ProcessedNode): boolean {
    const hasBackground = !!node.styles.backgroundColor;
    const hasBorder = !!node.styles.borderRadius;
    const hasButtonText = !!(node.content && /^(button|click|submit|send|save|cancel|ok|yes|no|confirm)$/i.test(node.content.trim()));
    const isShortText = !!(node.content && node.content.length < 20);
    
    return (hasBackground && hasBorder) || hasButtonText || (isShortText && hasBackground);
  }

  /**
   * Determine if a node looks like a link
   */
  private looksLikeLink(node: ProcessedNode): boolean {
    const hasUnderline = node.styles.textAlign === 'underline';
    const hasLinkColor = !!(node.styles.color && (node.styles.color.includes('blue') || node.styles.color.includes('#00')));
    const hasLinkText = !!(node.content && /^(learn more|read more|view|see|visit|go to|link)/.test(node.content.toLowerCase()));
    
    return hasUnderline || hasLinkColor || hasLinkText;
  }

  /**
   * Check if node looks like a card
   */
  private looksLikeCard(node: ProcessedNode): boolean {
    return !!(
      node.styles.backgroundColor &&
      node.styles.borderRadius &&
      node.children &&
      node.children.length > 1 &&
      node.children.some(child => child.content)
    );
  }

  /**
   * Build prompt for component generation
   */
  private buildComponentPrompt(
    node: ProcessedNode,
    options: {
      framework: string;
      styling: string;
      typescript: boolean;
      includeProps: boolean;
      responsive: boolean;
    }
  ): string {
    const { framework, styling, typescript, includeProps, responsive } = options;

    // Analyze the design content
    const designAnalysis = this.analyzeDesignContent(node);
    
    return `You are an expert ${framework} developer. Generate a production-ready component that EXACTLY matches this Figma design.

=== DESIGN ANALYSIS ===
${designAnalysis}

=== FIGMA DESIGN DATA ===
${JSON.stringify(node, null, 2)}

=== REQUIREMENTS ===
- Framework: ${framework} (functional components with hooks)
- Styling: ${styling}
- TypeScript: ${typescript ? 'Yes - include proper type definitions' : 'No'}
- Props Interface: ${includeProps ? 'Yes - create reusable props' : 'No'}
- Responsive: ${responsive ? 'Yes - mobile-first approach' : 'No'}

=== CRITICAL INSTRUCTIONS ===
1. **EXACT CONTENT REPLICATION**: Use EVERY SINGLE piece of text content from the design analysis above - do not invent or skip any text
2. **PRECISE LAYOUT**: Create the EXACT same visual structure with accurate spacing, positioning, and element arrangement
3. **ACCURATE STYLING**: Match every color, font size, font weight, and visual property exactly as specified
4. **STRUCTURE FIDELITY**: Recreate the exact hierarchy and nesting of elements as described in the structure analysis
5. **VISUAL ELEMENT RECREATION**: Include all containers, shapes, cards, and visual elements described
6. **INTERACTIVE ELEMENT IMPLEMENTATION**: Create all buttons, links, and interactive elements with exact styling and positioning
7. **SPACING PRECISION**: Use the exact padding, margins, and gaps specified in the spacing analysis
8. **RESPONSIVE BEHAVIOR**: Maintain the design's visual integrity across screen sizes
9. **NO PLACEHOLDER CONTENT**: Do not use lorem ipsum or generic content - use only the actual text from the design

=== STYLING APPROACH ===
${styling === 'tailwind' ? `
- Use Tailwind CSS utility classes ONLY (no CSS imports)
- Match exact colors using arbitrary values if needed: bg-[#FF5733]
- Use exact spacing and sizing from the design
- Implement responsive breakpoints: sm:, md:, lg:, xl:
- DO NOT include any import statements for CSS files
- All styling must be done through className attributes
` : styling === 'css' ? `
- Use CSS modules with descriptive class names
- Create exact color values and measurements from the design
- Use flexbox/grid for layouts
- Include responsive media queries
- MANDATORY: You MUST generate a separate CSS file with all styles
- The CSS file should contain complete styling for the component
- Use semantic class names that match the JSX structure
- Include hover effects, transitions, and responsive design
- The TSX file should import and use these CSS classes
` : `
- Use styled-components for styling
- Create theme-aware styled elements
- Implement exact design tokens
- Add responsive styling
`}

=== OUTPUT FORMAT ===
${styling === 'css' ? `
You MUST generate BOTH files. Follow this EXACT format:

--- TSX FILE ---
\`\`\`tsx
import './${node.componentName || node.name.replace(/[^a-zA-Z0-9]/g, '')}.css';

export default function ${node.componentName || node.name.replace(/[^a-zA-Z0-9]/g, '')}() {
  return (
    [Complete JSX with exact content and className attributes]
  );
}
\`\`\`

--- CSS FILE ---
\`\`\`css
/* Complete CSS styles for the component */
.component-container {
  /* Main container styles */
}

.component-title {
  /* Title styles */
}

/* Add all necessary CSS classes with exact design values */
/* Include responsive breakpoints */
/* Include hover effects and transitions */
\`\`\`

CRITICAL: You MUST generate BOTH the TSX file AND the CSS file. The CSS file must contain ALL styling for the component.
` : `
Return ONLY the code files in this exact format:

--- TSX FILE ---
\`\`\`tsx
export default function ${node.componentName || node.name.replace(/[^a-zA-Z0-9]/g, '')}() {
  return (
    [Complete JSX with exact content and styling]
  );
}
\`\`\`
`}

CRITICAL COMPONENT REQUIREMENTS:
1. **COMPLETE FUNCTION COMPONENT**: Must be a complete, exportable React function component
2. **PROPER JSX STRUCTURE**: All JSX must be properly nested and closed
3. **EXACT CONTENT**: Use the exact text content from the design analysis
4. **PIXEL-PERFECT STYLING**: Match all colors, fonts, spacing, and layout exactly
5. **FUNCTIONAL CODE**: The component must compile and render without errors
6. **NO IMPORTS**: Do not include any import statements (React, CSS, or other modules)
7. **SELF-CONTAINED**: The component must work independently without external dependencies

IMPORTANT: The generated component must be a pixel-perfect recreation of the design. Every text element, color, spacing, and visual element must match exactly. Do not create simplified or generic versions.

Generate the complete, functional component now with EXACT fidelity to the design:`;
  }

  /**
   * Build prompt for page generation
   */
  private buildPagePrompt(
    nodes: ProcessedNode[],
    options: {
      framework: string;
      styling: string;
      typescript: boolean;
      responsive: boolean;
      pageName: string;
    }
  ): string {
    const { framework, styling, typescript, responsive, pageName } = options;

    // Analyze each frame in detail
    const frameAnalyses = nodes.map((node, index) => {
      const analysis = this.analyzeDesignContent(node);
      return `
=== FRAME ${index + 1}: ${node.name} ===
${analysis}
`;
    }).join('\n');

    return `You are an expert ${framework} developer. Generate a complete, professional page component that EXACTLY recreates these Figma frames as a cohesive website.

=== COMPLETE DESIGN ANALYSIS ===
${frameAnalyses}

=== DETAILED FIGMA DATA ===
${JSON.stringify(nodes, null, 2)}

=== REQUIREMENTS ===
- Framework: ${framework} (functional components with hooks)
- Styling: ${styling}
- TypeScript: ${typescript ? 'Yes - include proper type definitions' : 'No'}
- Responsive: ${responsive ? 'Yes - mobile-first approach' : 'No'}
- Page Name: ${pageName}

=== CRITICAL INSTRUCTIONS ===
1. **EXACT CONTENT REPLICATION**: Use ALL the exact text content from the design analysis above
2. **FRAME-TO-SECTION MAPPING**: Convert each frame into a semantic page section
3. **PRECISE STYLING**: Match all colors, fonts, spacing, and layouts exactly
4. **PROFESSIONAL STRUCTURE**: Create a cohesive, production-ready website
5. **SEMANTIC HTML**: Use header, main, section, footer, nav appropriately
6. **ACCESSIBILITY**: Include proper ARIA labels and semantic structure

=== FRAME CONVERSION STRATEGY ===
- Frame 1 → Usually Header/Hero section
- Frame 2+ → Main content sections (features, products, services, etc.)
- Last Frame → Often Footer or CTA section
- Maintain exact visual hierarchy and content from each frame

=== STYLING APPROACH ===
${styling === 'tailwind' ? `
- Use Tailwind CSS utility classes exclusively (no CSS imports)
- Match exact colors with arbitrary values: bg-[#FF5733], text-[#333333]
- Use exact spacing and sizing from designs
- Implement responsive breakpoints: sm:, md:, lg:, xl:
- Add hover effects and transitions: hover:bg-blue-600 transition-colors
- DO NOT include any import statements for CSS files
` : styling === 'css' ? `
- Use CSS modules with semantic class names
- Create exact color values and measurements from design
- Use flexbox/grid for complex layouts
- Include responsive media queries
- Add hover effects and smooth transitions
- MANDATORY: You MUST generate a separate CSS file with all styles
- The CSS file should contain complete styling for the entire page
- Use semantic class names that match the JSX structure
- Include section-specific styles for each frame
- The TSX file should import and use these CSS classes
` : `
- Use styled-components for all styling
- Create theme-aware components
- Implement exact design tokens and values
- Add responsive styling and interactions
`}

=== OUTPUT FORMAT ===
${styling === 'css' ? `
You MUST generate BOTH files. Follow this EXACT format:

--- TSX FILE ---
\`\`\`tsx
import './${pageName}.css';

export default function ${pageName}() {
  return (
    [Complete page component with exact content from all frames using className attributes]
  );
}
\`\`\`

--- CSS FILE ---
\`\`\`css
/* Complete CSS styles for the entire page */
.page-container {
  /* Main page container styles */
}

.header-section {
  /* Header/Hero section styles */
}

.main-content {
  /* Main content area styles */
}

.footer-section {
  /* Footer section styles */
}

/* Add all necessary CSS classes with exact design values from all frames */
/* Include responsive breakpoints */
/* Include hover effects and transitions */
/* Include section-specific styles */
\`\`\`

CRITICAL: You MUST generate BOTH the TSX file AND the CSS file. The CSS file must contain ALL styling for the entire page.
` : `
Return ONLY the complete page component code:

--- TSX FILE ---
[Complete page component with exact content from all frames]
`}

Generate the complete website now with EXACT fidelity to all frame designs:`;
  }

  /**
   * Extract code from response
   */
  private extractCodeFromResponse(response: string): string {
    // Remove markdown code blocks if present - expanded to handle Angular file types
    const codeBlockRegex = /```(?:typescript|tsx|javascript|jsx|ts|html|scss|css)?\n?([\s\S]*?)\n?```/;
    const match = response.match(codeBlockRegex);
    
    if (match) {
      return match[1].trim();
    }
    
    // If no code blocks found, return the response as-is
    return response.trim();
  }

  /**
   * Extract multiple files from response
   */
  private extractMultipleFilesFromResponse(
    response: string, 
    componentName: string, 
    styling: string
  ): { tsx: string; css?: string; files: { name: string; content: string; type: string }[] } {
    const files: { name: string; content: string; type: string }[] = [];
    
    try {
      // Check if response contains file separators
      if (response.includes('--- TSX FILE ---')) {
        const tsxMatch = response.match(/--- TSX FILE ---\s*([\s\S]*?)(?=--- \w+ FILE ---|$)/);
        const cssMatch = response.match(/--- CSS FILE ---\s*([\s\S]*?)(?=--- \w+ FILE ---|$)/);
        
        let tsxCode = '';
        let cssCode = '';
        
        if (tsxMatch) {
          tsxCode = this.extractCodeFromResponse(tsxMatch[1].trim());
          files.push({
            name: `${componentName}.tsx`,
            content: tsxCode,
            type: 'tsx'
          });
        }
        
        if (cssMatch && styling === 'css') {
          cssCode = this.extractCodeFromResponse(cssMatch[1].trim());
          files.push({
            name: `${componentName}.css`,
            content: cssCode,
            type: 'css'
          });
        }
        
        return {
          tsx: tsxCode,
          css: cssCode || undefined,
          files
        };
      }
      
      // Fallback: treat entire response as TSX
      const tsxCode = this.extractCodeFromResponse(response);
      files.push({
        name: `${componentName}.tsx`,
        content: tsxCode,
        type: 'tsx'
      });
      
      return {
        tsx: tsxCode,
        files
      };
    } catch (error) {
      console.error('Error extracting files from response:', error);
      // Emergency fallback
      const tsxCode = response;
      files.push({
        name: `${componentName}.tsx`,
        content: tsxCode,
        type: 'tsx'
      });
      
      return {
        tsx: tsxCode,
        files
      };
    }
  }

  /**
   * Build Angular-specific prompt with Bootstrap 4.3 and Material 8
   */
  private buildAngularComponentPrompt(
    node: ProcessedNode,
    _options: {
      typescript: boolean;
      responsive: boolean;
    }
  ): string {
    const componentName = (node.componentName || node.name).replace(/[^a-zA-Z0-9]/g, '');
    
    return `Create Angular 8 component: ${componentName}

DESIGN INFO:
Name: ${node.name}
Size: ${node.styles.width}x${node.styles.height}px
Background: ${node.styles.backgroundColor || 'transparent'}
Text: ${this.extractAllTextWithPosition(node).map(t => t.content).join(', ') || 'No text'}

REQUIREMENTS:
- Angular 8 + Bootstrap 4.3 + Material 8
- TypeScript component with proper imports
- 3 separate files: .ts, .html, .scss
- Use Bootstrap grid and Material components

OUTPUT 3 FILES:

--- TYPESCRIPT FILE ---
\`\`\`typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-${componentName.toLowerCase()}',
  templateUrl: './${componentName.toLowerCase()}.component.html',
  styleUrls: ['./${componentName.toLowerCase()}.component.scss']
})
export class ${componentName}Component {
  constructor() { }
}
\`\`\`

--- HTML FILE ---
\`\`\`html
<div class="container ${componentName.toLowerCase()}-container">
  <!-- Bootstrap + Material template here -->
</div>
\`\`\`

--- SCSS FILE ---
\`\`\`scss
.${componentName.toLowerCase()}-container {
  /* Component styles */
}
\`\`\``;
  }

  /**
   * Extract Angular files from response (TypeScript, HTML, SCSS)
   */
  private extractAngularFilesFromResponse(
    response: string, 
    componentName: string
  ): { tsx: string; css?: string; files: { name: string; content: string; type: string }[] } {
    const files: { name: string; content: string; type: string }[] = [];
    const cleanComponentName = componentName.replace(/[^a-zA-Z0-9]/g, '');
    
    console.log(`🔍 Extracting Angular files for component: ${cleanComponentName}`);
    console.log(`📄 Response length: ${response.length} chars`);
    console.log(`📋 Response preview: ${response.substring(0, 200)}...`);
    
    try {
      // Extract TypeScript file
      const tsMatch = response.match(/--- TYPESCRIPT FILE ---\s*([\s\S]*?)(?=--- \w+ FILE ---|$)/);
      // Extract HTML file  
      const htmlMatch = response.match(/--- HTML FILE ---\s*([\s\S]*?)(?=--- \w+ FILE ---|$)/);
      // Extract SCSS file
      const scssMatch = response.match(/--- SCSS FILE ---\s*([\s\S]*?)(?=--- \w+ FILE ---|$)/);
      
      console.log(`🔍 File matches found: TS=${!!tsMatch}, HTML=${!!htmlMatch}, SCSS=${!!scssMatch}`);
      
      let tsCode = '';
      let htmlCode = '';
      let scssCode = '';
      
      if (tsMatch) {
        tsCode = this.extractCodeFromResponse(tsMatch[1].trim());
        console.log(`✅ TypeScript code extracted: ${tsCode.length} chars`);
        files.push({
          name: `${cleanComponentName.toLowerCase()}.component.ts`,
          content: tsCode,
          type: 'typescript'
        });
      } else {
        console.log(`❌ No TypeScript file section found in response`);
      }
      
      if (htmlMatch) {
        htmlCode = this.extractCodeFromResponse(htmlMatch[1].trim());
        console.log(`✅ HTML code extracted: ${htmlCode.length} chars`);
        files.push({
          name: `${cleanComponentName.toLowerCase()}.component.html`,
          content: htmlCode,
          type: 'html'
        });
      } else {
        console.log(`❌ No HTML file section found in response`);
      }
      
      if (scssMatch) {
        scssCode = this.extractCodeFromResponse(scssMatch[1].trim());
        console.log(`✅ SCSS code extracted: ${scssCode.length} chars`);
        files.push({
          name: `${cleanComponentName.toLowerCase()}.component.scss`,
          content: scssCode,
          type: 'scss'
        });
      } else {
        console.log(`❌ No SCSS file section found in response`);
      }

      console.log(`📁 Total files extracted: ${files.length}`);

      // For backward compatibility, return the TypeScript content as 'tsx'
      return {
        tsx: tsCode,
        css: scssCode || undefined,
        files
      };
    } catch (error) {
      console.error('❌ Error extracting Angular files from response:', error);
      console.log('🔧 Using emergency fallback');
      // Emergency fallback
      const fallbackCode = response;
      files.push({
        name: `${cleanComponentName.toLowerCase()}.component.ts`,
        content: fallbackCode,
        type: 'typescript'
      });
      
      return {
        tsx: fallbackCode,
        files
      };
    }
  }
}