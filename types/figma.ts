// Basic Figma API response types
export interface FigmaFile {
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  schemaVersion: number;
  styles: Record<string, FigmaStyle>;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: NodeType;
  children?: FigmaNode[];
  backgroundColor?: Color;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: string;
  cornerRadius?: number;
  constraints?: Constraints;
  layoutMode?: string;
  layoutGrow?: number;
  layoutAlign?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  absoluteBoundingBox?: Rectangle;
  size?: Vector;
  relativeTransform?: Transform;
  effects?: Effect[];
  isMask?: boolean;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  blendMode?: string;
  // Text-specific properties
  characters?: string;
  style?: TypeStyle;
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<string, TypeStyle>;
  // Vector-specific properties
  fillGeometry?: Path[];
  strokeGeometry?: Path[];
  // Frame-specific properties
  clipsContent?: boolean;
  background?: Paint[];
  // Component-specific properties
  componentId?: string;
  componentSetId?: string;
  // Instance-specific properties
  mainComponent?: FigmaNode;
  overrides?: ComponentOverride[];
}

export type NodeType = 
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'GROUP'
  | 'VECTOR'
  | 'BOOLEAN_OPERATION'
  | 'STAR'
  | 'LINE'
  | 'ELLIPSE'
  | 'REGULAR_POLYGON'
  | 'RECTANGLE'
  | 'TEXT'
  | 'SLICE'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'STICKY'
  | 'SHAPE_WITH_TEXT'
  | 'CONNECTOR';

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Paint {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: Color;
  blendMode?: string;
  gradientHandlePositions?: Vector[];
  gradientStops?: ColorStop[];
  scaleMode?: string;
  imageTransform?: Transform;
  scalingFactor?: number;
  rotation?: number;
  imageRef?: string;
  filters?: ImageFilters;
  gifRef?: string;
  boundVariables?: Record<string, VariableAlias>;
}

export interface ColorStop {
  position: number;
  color: Color;
  boundVariables?: Record<string, VariableAlias>;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  0: number[];
  1: number[];
  2: number[];
}

export interface Constraints {
  vertical: string;
  horizontal: string;
}

export interface Effect {
  type: string;
  visible?: boolean;
  radius?: number;
  color?: Color;
  blendMode?: string;
  offset?: Vector;
  spread?: number;
  showShadowBehindNode?: boolean;
  boundVariables?: Record<string, VariableAlias>;
}

export interface Path {
  path: string;
  windingRule?: string;
}

export interface TypeStyle {
  fontFamily?: string;
  fontPostScriptName?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  lineHeightPercentFontSize?: number;
  lineHeightUnit?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textAutoResize?: string;
  textCase?: string;
  textDecoration?: string;
  fills?: Paint[];
  hyperlink?: Hyperlink;
  opentypeFlags?: Record<string, number>;
  boundVariables?: Record<string, VariableAlias>;
}

export interface Hyperlink {
  type: string;
  url?: string;
  nodeID?: string;
}

export interface ComponentOverride {
  id: string;
  overriddenFields: string[];
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
  documentationLinks: DocumentationLink[];
  remote: boolean;
}

export interface DocumentationLink {
  uri: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  description: string;
  remote: boolean;
  styleType: string;
}

export interface ImageFilters {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  tint?: number;
  highlights?: number;
  shadows?: number;
}

export interface VariableAlias {
  type: string;
  id: string;
}

// Processed types for our app
export interface ProcessedNode {
  id: string;
  name: string;
  type: NodeType;
  children?: ProcessedNode[];
  absoluteBoundingBox?: Rectangle;
  styles: {
    width?: number;
    height?: number;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    display?: string;
    flexDirection?: string;
    alignItems?: string;
    justifyContent?: string;
    gap?: number;
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    color?: string;
    textAlign?: string;
    border?: string;
    boxShadow?: string;
    opacity?: number;
  };
  content?: string; // For text nodes
  isComponent?: boolean;
  componentName?: string;
}