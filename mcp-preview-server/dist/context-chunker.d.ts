/**
 * Context Chunker - Handles Claude Desktop's context limitations
 *
 * This module breaks large code contexts into manageable chunks
 * and provides strategies for incremental building when Claude
 * requires multiple "continue" prompts.
 */
export interface CodeChunk {
    id: string;
    content: string;
    type: 'metadata' | 'imports' | 'component' | 'styles' | 'types';
    size: number;
    priority: number;
}
export interface ChunkingStrategy {
    maxChunkSize: number;
    priorityOrder: string[];
    includeContext: boolean;
}
export declare class ContextChunker {
    private readonly DEFAULT_MAX_CHUNK_SIZE;
    /**
     * Analyze code and break it into manageable chunks
     */
    chunkCode(code: string, componentName: string, files?: Array<{
        name: string;
        content: string;
        type: string;
    }>): CodeChunk[];
    /**
     * Create a focused prompt for Claude Desktop that handles context limitations
     */
    createFocusedPrompt(chunks: CodeChunk[], chunkIndex?: number): string;
    /**
     * Create metadata chunk with component information
     */
    private createMetadataChunk;
    /**
     * Extract import statements from code
     */
    private extractImports;
    /**
     * Extract TypeScript type definitions
     */
    private extractTypes;
    /**
     * Clean code by removing imports and types (already extracted)
     */
    private cleanCodeForChunking;
    /**
     * Break large content into smaller chunks
     */
    private chunkLargeContent;
    /**
     * Split content by logical boundaries (functions, components, etc.)
     */
    private splitByLogicalBoundaries;
    /**
     * Split JavaScript/TypeScript by function boundaries
     */
    private splitByFunctions;
    /**
     * Split CSS by rules
     */
    private splitByCSSRules;
    /**
     * Force split content into smaller pieces
     */
    private forceSplit;
    /**
     * Analyze code to determine its characteristics
     */
    private analyzeCode;
    /**
     * Generate a structure overview of the component
     */
    private generateStructure;
    /**
     * Get appropriate language identifier for syntax highlighting
     */
    private getLanguageForType;
}
//# sourceMappingURL=context-chunker.d.ts.map