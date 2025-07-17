import Anthropic from '@anthropic-ai/sdk';
import { ProcessedNode } from '../types/figma';

/**
 * Claude API client for code generation
 */
export class ClaudeAPI {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  /**
   * Generate React component code from processed Figma node
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

    const prompt = this.buildComponentPrompt(node, {
      framework,
      styling,
      typescript,
      includeProps,
      responsive,
    });

    // Compress prompt if too large
    let finalPrompt = prompt;
    // if (prompt.length > 50000) {
    //   console.warn(`Large prompt detected: ${prompt.length} characters. Compressing...`);
    //   finalPrompt = this.compressPrompt(prompt);
    //   console.log(`Compressed prompt to ${finalPrompt.length} characters`);
    // }

    // Retry logic for 529 errors with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        console.log(`Claude API attempt ${attempt}/5`);
        
        // Use progressively smaller token limits on retry
        const maxTokens = Math.max(3000, 12000 - (attempt - 1) * 1000);
        console.log(`Using max_tokens: ${maxTokens}`);
        
        const response = await this.client.messages.create({
          model: attempt >= 4 ? 'claude-3-5-sonnet-20241022' : 'claude-sonnet-4-20250514', // Fallback to 3.5 on later attempts
          max_tokens: maxTokens,
          messages: [
            {
              role: 'user',
              content: finalPrompt,
            },
          ],
        }, {
          //set timeout to 5 minutes
          timeout: 240000
        });

        const content = response.content[0];
        if (content.type === 'text') {
          return this.extractMultipleFilesFromResponse(content.text, node.componentName || node.name, styling);
        }

        throw new Error('Unexpected response format from Claude API');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (lastError.message.includes('529') || lastError.message.includes('overloaded')) {
          const waitTime = Math.min(attempt * attempt * 3000, 30000); // Exponential backoff: 3s, 12s, 27s, 48s, 75s (capped at 30s)
          console.warn(`Claude API overloaded (529) on attempt ${attempt}/5. Retrying in ${waitTime/1000} seconds...`);
          if (attempt < 5) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error('529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}');
        }
        
        if (lastError.message.includes('429') || lastError.message.includes('rate_limit')) {
          const waitTime = Math.min(attempt * 8000, 60000); // 8s, 16s, 24s, 32s, 40s (capped at 60s)
          console.warn(`Claude API rate limited (429) on attempt ${attempt}/5. Retrying in ${waitTime/1000} seconds...`);
          if (attempt < 5) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error('429 Rate limit exceeded');
        }
        
        // For other errors, don't retry
        throw new Error(`Failed to generate component: ${lastError.message}`);
      }
    }

    throw new Error(`Failed to generate component after 5 attempts: ${lastError?.message || 'Unknown error'}`);
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

    for (const node of nodes) {
      try {
        const generated = await this.generateComponent(node, options);
        results.push({
          componentName: node.componentName || node.name,
          files: generated.files,
        });
      } catch (error) {
        console.error(`Failed to generate component for ${node.name}:`, error);
        // Continue with other components even if one fails
      }
    }

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

    // Compress prompt if too large
    let finalPrompt = prompt;
    // if (prompt.length > 50000) {
    //   console.warn(`Large prompt detected: ${prompt.length} characters. Compressing...`);
    //   finalPrompt = this.compressPrompt(prompt);
    //   console.log(`Compressed prompt to ${finalPrompt.length} characters`);
    // }

    // Retry logic for 529 errors with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        console.log(`Claude API attempt ${attempt}/5`);
        
        // Use progressively smaller token limits on retry
        const maxTokens = Math.max(3000, 12000 - (attempt - 1) * 1000);
        console.log(`Using max_tokens: ${maxTokens}`);
        
        const response = await this.client.messages.create({
          model: attempt >= 4 ? 'claude-3-5-sonnet-20241022' : 'claude-sonnet-4-20250514', // Fallback to 3.5 on later attempts
          max_tokens: maxTokens,
          messages: [
            {
              role: 'user',
              content: finalPrompt,
            },
          ],
        }, {
          timeout: 120000, // Reduced timeout to 1.5 minutes
        });

        const content = response.content[0];
        if (content.type === 'text') {
          return this.extractMultipleFilesFromResponse(content.text, pageName, styling);
        }

        throw new Error('Unexpected response format from Claude API');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (lastError.message.includes('529') || lastError.message.includes('overloaded')) {
          const waitTime = Math.min(attempt * attempt * 3000, 30000); // Exponential backoff: 3s, 12s, 27s, 48s, 75s (capped at 30s)
          console.warn(`Claude API overloaded (529) on attempt ${attempt}/5. Retrying in ${waitTime/1000} seconds...`);
          if (attempt < 5) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error('529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}');
        }
        
        if (lastError.message.includes('429') || lastError.message.includes('rate_limit')) {
          const waitTime = Math.min(attempt * 8000, 60000); // 8s, 16s, 24s, 32s, 40s (capped at 60s)
          console.warn(`Claude API rate limited (429) on attempt ${attempt}/5. Retrying in ${waitTime/1000} seconds...`);
          if (attempt < 5) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error('429 Rate limit exceeded');
        }
        
        // For other errors, don't retry
        throw new Error(`Failed to generate page: ${lastError.message}`);
      }
    }

    throw new Error(`Failed to generate page after 5 attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Compress prompt by removing verbose parts while keeping essential information
   */
  private compressPrompt(prompt: string): string {
    // Remove extensive JSON data that's causing overload
    const compressedPrompt = prompt
      // Truncate very long JSON strings
      .replace(/"([^"]{200,})":/g, '"[TRUNCATED]":') 
      // Remove excessive whitespace in JSON
      .replace(/\n\s{4,}/g, '\n  ')
      // Shorten very detailed style descriptions
      .replace(/STRUCTURE:\s*([\s\S]{500,}?)(?=\n[A-Z]|$)/g, 'STRUCTURE: [SIMPLIFIED]')
      // Compress color descriptions
      .replace(/COLORS WITH CONTEXT:\s*([\s\S]{300,}?)(?=\n[A-Z]|$)/g, 'COLORS WITH CONTEXT: [SIMPLIFIED]')
      // Compress spacing details
      .replace(/SPACING & LAYOUT:\s*([\s\S]{300,}?)(?=\n[A-Z]|$)/g, 'SPACING & LAYOUT: [SIMPLIFIED]')
      // Keep only first 3 text content items
      .replace(/TEXT CONTENT \(with positions\):\s*([\s\S]*?)(?=\n[A-Z]|$)/g, (match, content) => {
        const lines = content.split('\n').slice(0, 5); // Keep first 5 lines only
        return `TEXT CONTENT (with positions):\n${lines.join('\n')}\n  [... additional content truncated]`;
      })
      // Compress the detailed JSON data
      .replace(/=== DETAILED FIGMA DATA ===\s*([\s\S]*?)(?==== |$)/g, (match, data) => {
        try {
          const parsed = JSON.parse(data);
          // Keep only essential fields
          const essential = {
            name: parsed.name || 'Component',
            type: parsed.type,
            styles: {
              width: parsed.styles?.width,
              height: parsed.styles?.height,
              backgroundColor: parsed.styles?.backgroundColor,
              color: parsed.styles?.color,
              fontSize: parsed.styles?.fontSize,
              fontWeight: parsed.styles?.fontWeight
            },
            content: parsed.content,
            children: parsed.children ? '[CHILDREN_PRESENT]' : null
          };
          return `=== ESSENTIAL FIGMA DATA ===\n${JSON.stringify(essential, null, 2)}\n\n`;
        } catch {
          return match.substring(0, 1000) + '\n[... data truncated due to size]\n\n';
        }
      });
    
    return compressedPrompt;
  }

  /**
   * Optimize generated code
   */
  async optimizeCode(
    code: string,
    optimizationType: 'performance' | 'accessibility' | 'responsive' | 'clean-code'
  ): Promise<string> {
    const prompt = `Please optimize the following React component code for ${optimizationType}. 
    
Provide the optimized code with improvements for:
${optimizationType === 'performance' ? '- React.memo, useMemo, useCallback where appropriate\n- Lazy loading\n- Efficient re-renders' : ''}
${optimizationType === 'accessibility' ? '- ARIA labels and roles\n- Keyboard navigation\n- Screen reader support\n- Color contrast' : ''}
${optimizationType === 'responsive' ? '- Mobile-first design\n- Flexible layouts\n- Responsive typography\n- Touch-friendly interactions' : ''}
${optimizationType === 'clean-code' ? '- Better naming conventions\n- Proper code organization\n- Remove duplications\n- Add helpful comments' : ''}

Original code:
\`\`\`typescript
${code}
\`\`\`

Return only the optimized code without explanations.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-4-sonnet',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return this.extractCodeFromResponse(content.text);
      }

      throw new Error('Unexpected response format from Claude API');
    } catch (error) {
      throw new Error(`Failed to optimize code: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    // Detailed structure analysis
    const structure = this.analyzeNodeStructure(node);
    if (structure.length > 0) {
      analysis.push(`STRUCTURE:`);
      structure.forEach(item => analysis.push(`  ${item}`));
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
    
    // Debug: Log the full node structure for debugging
    console.log('🔍 Full node structure for analysis:', JSON.stringify(node, null, 2));
    
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
   * Extract all text content recursively
   */
  private extractAllText(node: ProcessedNode): Array<{content: string, type: string}> {
    const texts: Array<{content: string, type: string}> = [];
    
    if (node.content) {
      const type = this.categorizeText(node.content, node.styles);
      texts.push({ content: node.content, type });
    }
    
    if (node.children) {
      node.children.forEach(child => {
        texts.push(...this.extractAllText(child));
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
   * Extract color scheme from the design
   */
  private extractColorScheme(node: ProcessedNode): string[] {
    const colors = new Set<string>();
    
    if (node.styles.backgroundColor) {
      colors.add(node.styles.backgroundColor);
    }
    if (node.styles.color) {
      colors.add(node.styles.color);
    }
    
    if (node.children) {
      node.children.forEach(child => {
        this.extractColorScheme(child).forEach(color => colors.add(color));
      });
    }
    
    return Array.from(colors);
  }
  
  /**
   * Extract typography information
   */
  private extractTypography(node: ProcessedNode): string[] {
    const typography = new Set<string>();
    
    if (node.styles.fontSize || node.styles.fontFamily || node.styles.fontWeight) {
      const family = node.styles.fontFamily || 'Default';
      const size = node.styles.fontSize ? `${node.styles.fontSize}px` : '';
      const weight = node.styles.fontWeight ? `${node.styles.fontWeight}` : '';
      typography.add(`${family} ${size} ${weight}`.trim());
    }
    
    if (node.children) {
      node.children.forEach(child => {
        this.extractTypography(child).forEach(typo => typography.add(typo));
      });
    }
    
    return Array.from(typography);
  }
  
  /**
   * Analyze visual hierarchy
   */
  private analyzeHierarchy(node: ProcessedNode): string[] {
    const hierarchy: string[] = [];
    
    // Sort children by font size to determine hierarchy
    const textNodes = this.getAllTextNodes(node);
    const sortedBySize = textNodes.sort((a, b) => (b.styles.fontSize || 16) - (a.styles.fontSize || 16));
    
    sortedBySize.forEach((textNode, index) => {
      if (textNode.content && index < 3) { // Only top 3 levels
        const size = textNode.styles.fontSize || 16;
        hierarchy.push(`${textNode.content} (${size}px)`);
      }
    });
    
    return hierarchy;
  }
  
  /**
   * Get all text nodes recursively
   */
  private getAllTextNodes(node: ProcessedNode): ProcessedNode[] {
    const textNodes: ProcessedNode[] = [];
    
    if (node.content) {
      textNodes.push(node);
    }
    
    if (node.children) {
      node.children.forEach(child => {
        textNodes.push(...this.getAllTextNodes(child));
      });
    }
    
    return textNodes;
  }
  
  /**
   * Find interactive elements
   */
  private findInteractiveElements(node: ProcessedNode): string[] {
    const interactive: string[] = [];
    
    // Look for button-like elements
    if (node.content && this.looksLikeButton(node)) {
      interactive.push(`Button: "${node.content}"`);
    }
    
    // Look for link-like elements
    if (node.content && this.looksLikeLink(node)) {
      interactive.push(`Link: "${node.content}"`);
    }
    
    if (node.children) {
      node.children.forEach(child => {
        interactive.push(...this.findInteractiveElements(child));
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
   * Analyze node structure in detail
   */
  private analyzeNodeStructure(node: ProcessedNode): string[] {
    const structure: string[] = [];
    
    if (node.children && node.children.length > 0) {
      structure.push(`Has ${node.children.length} child elements`);
      
      // Group children by type
      const childTypes = node.children.reduce((acc, child) => {
        acc[child.type] = (acc[child.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(childTypes).forEach(([type, count]) => {
        structure.push(`  - ${count} ${type} element(s)`);
      });
      
      // Analyze layout patterns
      const hasGridPattern = this.detectGridPattern(node.children);
      if (hasGridPattern) {
        structure.push(`  - Grid layout pattern detected (${hasGridPattern})`);
      }
      
      const hasListPattern = this.detectListPattern(node.children);
      if (hasListPattern) {
        structure.push(`  - List layout pattern detected`);
      }
    }
    
    return structure;
  }

  /**
   * Extract text with position and detailed styling
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
   * Detect grid pattern in children
   */
  private detectGridPattern(children: ProcessedNode[]): string | null {
    if (children.length < 4) return null;
    
    // Check if children have similar sizes (suggesting grid)
    const sizes = children
      .filter(child => child.styles.width && child.styles.height)
      .map(child => ({ w: child.styles.width!, h: child.styles.height! }));
    
    if (sizes.length < 3) return null;
    
    const avgWidth = sizes.reduce((sum, s) => sum + s.w, 0) / sizes.length;
    const avgHeight = sizes.reduce((sum, s) => sum + s.h, 0) / sizes.length;
    
    const similarSizes = sizes.filter(s => 
      Math.abs(s.w - avgWidth) < avgWidth * 0.1 && 
      Math.abs(s.h - avgHeight) < avgHeight * 0.1
    );
    
    if (similarSizes.length >= sizes.length * 0.7) {
      const cols = Math.ceil(Math.sqrt(children.length));
      return `${cols} columns`;
    }
    
    return null;
  }

  /**
   * Detect list pattern in children
   */
  private detectListPattern(children: ProcessedNode[]): boolean {
    if (children.length < 2) return false;
    
    // Check if children are stacked vertically with similar content structure
    const textChildren = children.filter(child => 
      child.content || (child.children && child.children.some(c => c.content))
    );
    
    return textChildren.length >= children.length * 0.8;
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
- Create exact color values and measurements
- Use flexbox/grid for layouts
- Include responsive media queries
` : `
- Use styled-components for styling
- Create theme-aware styled elements
- Implement exact design tokens
- Add responsive styling
`}

=== OUTPUT FORMAT ===
Return ONLY the code files in this exact format:

--- TSX FILE ---
\`\`\`tsx
export default function ${node.componentName || node.name.replace(/[^a-zA-Z0-9]/g, '')}() {
  return (
    [Complete JSX with exact content and styling]
  );
}
\`\`\`

${styling === 'css' ? '--- CSS FILE ---\n[CSS styles with exact design values]\n' : ''}

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
` : `
- Use styled-components for all styling
- Create theme-aware components
- Implement exact design tokens and values
- Add responsive styling and interactions
`}

=== OUTPUT FORMAT ===
Return ONLY the complete page component code:

--- TSX FILE ---
[Complete page component with exact content from all frames]

${styling === 'css' ? '--- CSS FILE ---\n[CSS styles with exact design values from all frames]\n' : ''}

Generate the complete website now with EXACT fidelity to all frame designs:`;
  }

  /**
   * Extract code from Claude's response
   */
  private extractCodeFromResponse(response: string): string {
    // Remove markdown code blocks if present
    const codeBlockRegex = /```(?:typescript|tsx|javascript|jsx)?\n?([\s\S]*?)\n?```/;
    const match = response.match(codeBlockRegex);
    
    if (match) {
      return match[1].trim();
    }
    
    // If no code blocks found, return the response as-is
    return response.trim();
  }

  /**
   * Extract multiple files from Claude's response
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
}