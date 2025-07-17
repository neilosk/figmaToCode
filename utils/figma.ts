import { FigmaNode, ProcessedNode, Color, Paint, TypeStyle } from '../types/figma';

/**
 * Extract file key from Figma URL
 * Supports various Figma URL formats including direct API URLs
 */
export function extractFileKey(url: string): string | null {
  // Handle direct API URL format: https://api.figma.com/v1/files/FILE_KEY
  const apiUrlMatch = url.match(/api\.figma\.com\/v1\/files\/([a-zA-Z0-9]+)/);
  if (apiUrlMatch) {
    return apiUrlMatch[1];
  }

  // Handle different Figma URL formats
  const patterns = [
    /figma\.com\/file\/([a-zA-Z0-9]+)/,
    /figma\.com\/design\/([a-zA-Z0-9]+)/,
    /figma\.com\/proto\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // If it's already just a file key
  if (/^[a-zA-Z0-9]+$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Convert Figma Color to CSS color string
 */
export function figmaColorToCSS(color: Color): string {
  if (!color) return 'transparent';
  
  const { r, g, b, a = 1 } = color;
  
  // Convert from 0-1 range to 0-255 range
  const red = Math.round(r * 255);
  const green = Math.round(g * 255);
  const blue = Math.round(b * 255);
  
  if (a === 1) {
    return `rgb(${red}, ${green}, ${blue})`;
  } else {
    return `rgba(${red}, ${green}, ${blue}, ${a})`;
  }
}

/**
 * Extract background color from fills
 */
export function extractBackgroundColor(fills: Paint[] | undefined): string | undefined {
  if (!fills || fills.length === 0) return undefined;
  
  const solidFill = fills.find(fill => fill.type === 'SOLID' && fill.visible !== false);
  if (solidFill && solidFill.color) {
    return figmaColorToCSS(solidFill.color);
  }
  
  return undefined;
}

/**
 * Extract text color from style
 */
export function extractTextColor(style: TypeStyle | undefined): string | undefined {
  if (!style || !style.fills || style.fills.length === 0) return undefined;
  
  const textFill = style.fills.find(fill => fill.type === 'SOLID' && fill.visible !== false);
  if (textFill && textFill.color) {
    return figmaColorToCSS(textFill.color);
  }
  
  return undefined;
}

/**
 * Convert Figma layout properties to CSS flexbox
 */
export function convertLayoutMode(layoutMode: string | undefined): {
  display: string;
  flexDirection?: string;
} {
  if (!layoutMode || layoutMode === 'NONE') {
    return { display: 'block' };
  }
  
  return {
    display: 'flex',
    flexDirection: layoutMode === 'HORIZONTAL' ? 'row' : 'column',
  };
}

/**
 * Convert Figma alignment to CSS alignment
 */
export function convertAlignment(
  primaryAxisAlignItems: string | undefined,
  counterAxisAlignItems: string | undefined,
  layoutMode: string | undefined
): {
  alignItems?: string;
  justifyContent?: string;
} {
  const result: { alignItems?: string; justifyContent?: string } = {};
  
  if (layoutMode === 'HORIZONTAL') {
    // In horizontal layout, primary axis is horizontal
    if (primaryAxisAlignItems) {
      result.justifyContent = convertAlignmentValue(primaryAxisAlignItems);
    }
    if (counterAxisAlignItems) {
      result.alignItems = convertAlignmentValue(counterAxisAlignItems);
    }
  } else if (layoutMode === 'VERTICAL') {
    // In vertical layout, primary axis is vertical
    if (primaryAxisAlignItems) {
      result.alignItems = convertAlignmentValue(primaryAxisAlignItems);
    }
    if (counterAxisAlignItems) {
      result.justifyContent = convertAlignmentValue(counterAxisAlignItems);
    }
  }
  
  return result;
}

/**
 * Convert Figma alignment value to CSS value
 */
function convertAlignmentValue(alignment: string): string {
  switch (alignment) {
    case 'MIN':
      return 'flex-start';
    case 'CENTER':
      return 'center';
    case 'MAX':
      return 'flex-end';
    case 'SPACE_BETWEEN':
      return 'space-between';
    case 'SPACE_AROUND':
      return 'space-around';
    case 'SPACE_EVENLY':
      return 'space-evenly';
    default:
      return 'flex-start';
  }
}

/**
 * Convert Figma text alignment to CSS text-align
 */
export function convertTextAlign(textAlign: string | undefined): string | undefined {
  if (!textAlign) return undefined;
  
  switch (textAlign) {
    case 'LEFT':
      return 'left';
    case 'CENTER':
      return 'center';
    case 'RIGHT':
      return 'right';
    case 'JUSTIFIED':
      return 'justify';
    default:
      return undefined;
  }
}

/**
 * Generate a clean component name from Figma node name
 */
export function generateComponentName(name: string): string {
  // Remove special characters and convert to PascalCase
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Check if a node should be treated as a component
 */
export function shouldTreatAsComponent(node: FigmaNode): boolean {
  // Treat as component if:
  // 1. It's actually a component or instance
  // 2. It's a frame with multiple children that looks reusable
  // 3. It has a name that suggests it's a component (starts with uppercase)
  
  if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    return true;
  }
  
  if (node.type === 'FRAME' && node.children && node.children.length > 1) {
    // Check if name suggests it's a component
    const name = node.name.trim();
    return /^[A-Z]/.test(name) && !name.startsWith('Frame');
  }
  
  return false;
}

/**
 * Process a Figma node tree into our simplified format
 */
export function processNode(node: FigmaNode): ProcessedNode {
  const processed: ProcessedNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    styles: {},
    isComponent: shouldTreatAsComponent(node),
  };

  // Add component name if it should be treated as a component
  if (processed.isComponent) {
    processed.componentName = generateComponentName(node.name);
  }

  // Extract dimensions
  if (node.absoluteBoundingBox) {
    processed.styles.width = node.absoluteBoundingBox.width;
    processed.styles.height = node.absoluteBoundingBox.height;
  }

  // Extract background color
  const backgroundColor = extractBackgroundColor(node.fills);
  if (backgroundColor) {
    processed.styles.backgroundColor = backgroundColor;
  }

  // Extract border radius
  if (node.cornerRadius) {
    processed.styles.borderRadius = node.cornerRadius;
  }

  // Extract padding
  if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
    processed.styles.padding = {
      top: node.paddingTop || 0,
      right: node.paddingRight || 0,
      bottom: node.paddingBottom || 0,
      left: node.paddingLeft || 0,
    };
  }

  // Extract layout properties
  if (node.layoutMode) {
    const layoutStyles = convertLayoutMode(node.layoutMode);
    processed.styles.display = layoutStyles.display;
    processed.styles.flexDirection = layoutStyles.flexDirection;

    const alignmentStyles = convertAlignment(
      node.primaryAxisAlignItems,
      node.counterAxisAlignItems,
      node.layoutMode
    );
    processed.styles.alignItems = alignmentStyles.alignItems;
    processed.styles.justifyContent = alignmentStyles.justifyContent;

    if (node.itemSpacing) {
      processed.styles.gap = node.itemSpacing;
    }
  }

  // Extract text content and styles
  if (node.type === 'TEXT') {
    processed.content = node.characters || '';
    
    if (node.style) {
      processed.styles.fontSize = node.style.fontSize;
      processed.styles.fontWeight = node.style.fontWeight;
      processed.styles.fontFamily = node.style.fontFamily;
      processed.styles.textAlign = convertTextAlign(node.style.textAlignHorizontal);
      
      const textColor = extractTextColor(node.style);
      if (textColor) {
        processed.styles.color = textColor;
      }
    }
  }

  // Also extract text from child nodes for better content capture
  if (node.children && node.children.length > 0) {
    const childTexts = node.children
      .filter(child => child.type === 'TEXT' && child.characters)
      .map(child => child.characters)
      .filter(Boolean);
    
    if (childTexts.length > 0 && !processed.content) {
      processed.content = childTexts.join(' ');
    }
  }

  // Extract opacity
  if (node.opacity !== undefined && node.opacity !== 1) {
    processed.styles.opacity = node.opacity;
  }

  // Process children
  if (node.children && node.children.length > 0) {
    processed.children = node.children.map(child => processNode(child));
  }

  return processed;
}

/**
 * Find all components in a processed node tree
 */
export function findComponents(node: ProcessedNode): ProcessedNode[] {
  const components: ProcessedNode[] = [];
  
  if (node.isComponent) {
    components.push(node);
  }
  
  if (node.children) {
    node.children.forEach(child => {
      components.push(...findComponents(child));
    });
  }
  
  return components;
}

/**
 * Calculate responsive breakpoints based on frame sizes
 */
export function calculateBreakpoints(frames: ProcessedNode[]): {
  mobile: number;
  tablet: number;
  desktop: number;
} {
  const widths = frames
    .filter(frame => frame.styles.width)
    .map(frame => frame.styles.width as number)
    .sort((a, b) => a - b);

  if (widths.length === 0) {
    return { mobile: 375, tablet: 768, desktop: 1024 };
  }

  const mobile = widths[0] || 375;
  const tablet = widths[Math.floor(widths.length / 2)] || 768;
  const desktop = widths[widths.length - 1] || 1024;

  return { mobile, tablet, desktop };
}

/**
 * Extract all text content from a node tree
 */
export function extractAllTextContent(node: ProcessedNode): string[] {
  const texts: string[] = [];
  
  if (node.content && node.content.trim()) {
    texts.push(node.content.trim());
  }
  
  if (node.children) {
    node.children.forEach(child => {
      texts.push(...extractAllTextContent(child));
    });
  }
  
  return texts;
}

/**
 * Analyze content type based on text and structure
 */
export function analyzeContentType(node: ProcessedNode): string {
  const text = node.content?.toLowerCase() || '';
  const hasChildren = node.children && node.children.length > 0;
  const hasBackground = !!node.styles.backgroundColor;
  const hasRounding = !!node.styles.borderRadius;
  
  // Button detection
  if ((hasBackground && hasRounding) || 
      /^(click|submit|send|buy|purchase|add|remove|save|cancel|confirm|ok|yes|no)$/i.test(text) ||
      (text.length < 20 && hasBackground)) {
    return 'button';
  }
  
  // Heading detection
  if (node.styles.fontSize && node.styles.fontSize > 18) {
    if (node.styles.fontSize > 32) return 'main-heading';
    if (node.styles.fontSize > 24) return 'sub-heading';
    return 'section-heading';
  }
  
  // Card/Container detection
  if (hasChildren && hasBackground) {
    return 'card';
  }
  
  // Navigation detection
  if (text.includes('home') || text.includes('about') || text.includes('contact') || 
      text.includes('menu') || text.includes('nav')) {
    return 'navigation';
  }
  
  // Form field detection
  if (node.name.toLowerCase().includes('input') || 
      node.name.toLowerCase().includes('field') ||
      node.name.toLowerCase().includes('form')) {
    return 'form-field';
  }
  
  return 'content';
}

/**
 * Extract structured information about the design
 */
export function extractDesignStructure(node: ProcessedNode): {
  headings: string[];
  buttons: string[];
  content: string[];
  navigation: string[];
  formFields: string[];
  colors: string[];
} {
  const structure = {
    headings: [] as string[],
    buttons: [] as string[],
    content: [] as string[],
    navigation: [] as string[],
    formFields: [] as string[],
    colors: [] as string[]
  };
  
  function analyzeNode(n: ProcessedNode) {
    const contentType = analyzeContentType(n);
    const text = n.content?.trim();
    
    if (text) {
      switch (contentType) {
        case 'main-heading':
        case 'sub-heading':
        case 'section-heading':
          structure.headings.push(text);
          break;
        case 'button':
          structure.buttons.push(text);
          break;
        case 'navigation':
          structure.navigation.push(text);
          break;
        case 'form-field':
          structure.formFields.push(text);
          break;
        default:
          if (text.length > 3) { // Ignore very short text
            structure.content.push(text);
          }
      }
    }
    
    // Extract colors
    if (n.styles.backgroundColor) {
      structure.colors.push(n.styles.backgroundColor);
    }
    if (n.styles.color) {
      structure.colors.push(n.styles.color);
    }
    
    // Recursively analyze children
    if (n.children) {
      n.children.forEach(analyzeNode);
    }
  }
  
  analyzeNode(node);
  
  // Remove duplicates
  structure.colors = Array.from(new Set(structure.colors));
  structure.headings = Array.from(new Set(structure.headings));
  structure.buttons = Array.from(new Set(structure.buttons));
  structure.content = Array.from(new Set(structure.content));
  structure.navigation = Array.from(new Set(structure.navigation));
  structure.formFields = Array.from(new Set(structure.formFields));
  
  return structure;
}