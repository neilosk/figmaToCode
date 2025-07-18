/**
 * Context Chunker - Handles Claude Desktop's context limitations
 *
 * This module breaks large code contexts into manageable chunks
 * and provides strategies for incremental building when Claude
 * requires multiple "continue" prompts.
 */
export class ContextChunker {
    DEFAULT_MAX_CHUNK_SIZE = 8000; // Conservative token limit
    // Removed unused DEFAULT_STRATEGY
    /**
     * Analyze code and break it into manageable chunks
     */
    chunkCode(code, componentName, files) {
        const chunks = [];
        let chunkId = 0;
        // 1. Create metadata chunk (always first)
        chunks.push({
            id: `chunk-${chunkId++}`,
            content: this.createMetadataChunk(componentName, code),
            type: 'metadata',
            size: componentName.length + 200,
            priority: 1
        });
        // 2. Extract and chunk imports
        const imports = this.extractImports(code);
        if (imports.length > 0) {
            chunks.push({
                id: `chunk-${chunkId++}`,
                content: imports.join('\n'),
                type: 'imports',
                size: imports.join('\n').length,
                priority: 2
            });
        }
        // 3. Process CSS files if present
        const cssFiles = files?.filter(f => f.type === 'css') || [];
        if (cssFiles.length > 0) {
            for (const cssFile of cssFiles) {
                const cssChunks = this.chunkLargeContent(cssFile.content, 'styles');
                chunks.push(...cssChunks.map(chunk => ({
                    ...chunk,
                    id: `chunk-${chunkId++}`,
                    priority: 3
                })));
            }
        }
        // 4. Extract TypeScript types
        const types = this.extractTypes(code);
        if (types.length > 0) {
            chunks.push({
                id: `chunk-${chunkId++}`,
                content: types.join('\n\n'),
                type: 'types',
                size: types.join('\n\n').length,
                priority: 4
            });
        }
        // 5. Main component code (most important)
        const cleanedCode = this.cleanCodeForChunking(code);
        const componentChunks = this.chunkLargeContent(cleanedCode, 'component');
        chunks.push(...componentChunks.map(chunk => ({
            ...chunk,
            id: `chunk-${chunkId++}`,
            priority: 5
        })));
        return chunks;
    }
    /**
     * Create a focused prompt for Claude Desktop that handles context limitations
     */
    createFocusedPrompt(chunks, chunkIndex = 0) {
        const currentChunk = chunks[chunkIndex];
        const isFirstChunk = chunkIndex === 0;
        const isLastChunk = chunkIndex === chunks.length - 1;
        const totalChunks = chunks.length;
        let prompt = '';
        if (isFirstChunk) {
            prompt += `# React Component Preview Request [Part ${chunkIndex + 1}/${totalChunks}]

I need you to create a stable HTML preview for a React component. Due to context limitations, I'm sending this in ${totalChunks} parts.

## Instructions:
1. Create a complete HTML page with React component preview
2. Include all necessary dependencies (React, CSS, etc.)
3. Make it render-ready in a browser
4. If you need more context, I'll provide it in the next part

## Current Part (${currentChunk.type}):
`;
        }
        else {
            prompt += `# Continuing React Component Preview [Part ${chunkIndex + 1}/${totalChunks}]

This is part ${chunkIndex + 1} of ${totalChunks}. Please continue building the preview.

## Current Part (${currentChunk.type}):
`;
        }
        prompt += `\n\`\`\`${this.getLanguageForType(currentChunk.type)}\n${currentChunk.content}\n\`\`\`\n`;
        if (isLastChunk) {
            prompt += `\n## Final Instructions:
- This was the last part
- Please complete the HTML preview
- Ensure all parts are integrated properly
- The preview should be fully functional`;
        }
        else {
            prompt += `\n## Next Steps:
- This is part ${chunkIndex + 1} of ${totalChunks}
- Wait for the next part before completing
- Say "Ready for next part" when you've processed this`;
        }
        return prompt;
    }
    /**
     * Create metadata chunk with component information
     */
    createMetadataChunk(componentName, code) {
        const analysis = this.analyzeCode(code);
        return `Component Name: ${componentName}
Framework: React
Styling: ${analysis.stylingType}
Has TypeScript: ${analysis.hasTypeScript}
Component Type: ${analysis.componentType}
Lines of Code: ${code.split('\n').length}

Component Structure:
${analysis.structure}`;
    }
    /**
     * Extract import statements from code
     */
    extractImports(code) {
        const imports = [];
        const lines = code.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
                imports.push(line);
            }
        }
        return imports;
    }
    /**
     * Extract TypeScript type definitions
     */
    extractTypes(code) {
        const types = [];
        const lines = code.split('\n');
        let currentType = '';
        let inType = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('interface ') || trimmed.startsWith('type ')) {
                inType = true;
                currentType = line;
            }
            else if (inType) {
                currentType += '\n' + line;
                if (trimmed.includes('}') || trimmed.includes(';')) {
                    types.push(currentType);
                    currentType = '';
                    inType = false;
                }
            }
        }
        return types;
    }
    /**
     * Clean code by removing imports and types (already extracted)
     */
    cleanCodeForChunking(code) {
        const lines = code.split('\n');
        const cleanedLines = lines.filter(line => {
            const trimmed = line.trim();
            return !trimmed.startsWith('import ') &&
                !trimmed.startsWith('export ') &&
                !trimmed.startsWith('interface ') &&
                !trimmed.startsWith('type ');
        });
        return cleanedLines.join('\n');
    }
    /**
     * Break large content into smaller chunks
     */
    chunkLargeContent(content, type) {
        const chunks = [];
        if (content.length <= this.DEFAULT_MAX_CHUNK_SIZE) {
            return [{
                    content,
                    type,
                    size: content.length
                }];
        }
        // Split by logical boundaries (functions, components, etc.)
        const parts = this.splitByLogicalBoundaries(content, type);
        for (const part of parts) {
            if (part.length <= this.DEFAULT_MAX_CHUNK_SIZE) {
                chunks.push({
                    content: part,
                    type,
                    size: part.length
                });
            }
            else {
                // Force split large parts
                const forcedChunks = this.forceSplit(part, this.DEFAULT_MAX_CHUNK_SIZE);
                chunks.push(...forcedChunks.map(chunk => ({
                    content: chunk,
                    type,
                    size: chunk.length
                })));
            }
        }
        return chunks;
    }
    /**
     * Split content by logical boundaries (functions, components, etc.)
     */
    splitByLogicalBoundaries(content, type) {
        if (type === 'component') {
            // Split by function boundaries
            return this.splitByFunctions(content);
        }
        else if (type === 'styles') {
            // Split by CSS rules
            return this.splitByCSSRules(content);
        }
        else {
            // Default: split by logical sections
            return [content];
        }
    }
    /**
     * Split JavaScript/TypeScript by function boundaries
     */
    splitByFunctions(content) {
        const functions = [];
        const lines = content.split('\n');
        let currentFunction = '';
        let braceCount = 0;
        let inFunction = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes('function ') || trimmed.includes('const ') || trimmed.includes('export ')) {
                if (currentFunction && inFunction) {
                    functions.push(currentFunction);
                }
                currentFunction = line;
                inFunction = true;
                braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            }
            else if (inFunction) {
                currentFunction += '\n' + line;
                braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
                if (braceCount <= 0) {
                    functions.push(currentFunction);
                    currentFunction = '';
                    inFunction = false;
                }
            }
        }
        if (currentFunction) {
            functions.push(currentFunction);
        }
        return functions.length > 0 ? functions : [content];
    }
    /**
     * Split CSS by rules
     */
    splitByCSSRules(content) {
        const rules = content.split('}').map(rule => rule.trim() + '}').filter(rule => rule.length > 1);
        return rules.length > 0 ? rules : [content];
    }
    /**
     * Force split content into smaller pieces
     */
    forceSplit(content, maxSize) {
        const chunks = [];
        let currentChunk = '';
        const lines = content.split('\n');
        for (const line of lines) {
            if (currentChunk.length + line.length + 1 > maxSize) {
                if (currentChunk) {
                    chunks.push(currentChunk);
                    currentChunk = line;
                }
                else {
                    // Line is too long, split it
                    chunks.push(line.substring(0, maxSize));
                    currentChunk = line.substring(maxSize);
                }
            }
            else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        return chunks;
    }
    /**
     * Analyze code to determine its characteristics
     */
    analyzeCode(code) {
        const hasTypeScript = code.includes('interface ') || code.includes('type ') || code.includes(': React.');
        const hasTailwind = code.includes('className=') && (code.includes('bg-') || code.includes('text-'));
        const hasCSSModules = code.includes('styles.');
        const hasStyledComponents = code.includes('styled.');
        let stylingType = 'CSS';
        if (hasTailwind)
            stylingType = 'Tailwind';
        else if (hasCSSModules)
            stylingType = 'CSS Modules';
        else if (hasStyledComponents)
            stylingType = 'Styled Components';
        const isFunctionComponent = code.includes('function ') || code.includes('const ') && code.includes('=>');
        const componentType = isFunctionComponent ? 'Function Component' : 'Class Component';
        const structure = this.generateStructure(code);
        return {
            stylingType,
            hasTypeScript,
            componentType,
            structure
        };
    }
    /**
     * Generate a structure overview of the component
     */
    generateStructure(code) {
        const lines = code.split('\n');
        const structure = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('function ') || trimmed.startsWith('const ') || trimmed.startsWith('export ')) {
                structure.push(`- ${trimmed.split('(')[0]}`);
            }
            else if (trimmed.startsWith('return')) {
                structure.push('- JSX Return Statement');
            }
        }
        return structure.join('\n');
    }
    /**
     * Get appropriate language identifier for syntax highlighting
     */
    getLanguageForType(type) {
        switch (type) {
            case 'component':
            case 'types':
                return 'typescript';
            case 'styles':
                return 'css';
            case 'imports':
                return 'javascript';
            case 'metadata':
                return 'yaml';
            default:
                return 'text';
        }
    }
}
//# sourceMappingURL=context-chunker.js.map