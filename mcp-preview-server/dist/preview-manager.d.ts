/**
 * Preview Manager - Handles preview storage, URLs, and lifecycle
 */
import { CodeChunk } from './context-chunker.js';
export interface PreviewRequest {
    id: string;
    componentName: string;
    framework: string;
    styling: string;
    chunks: CodeChunk[];
    files: Array<{
        name: string;
        content: string;
        type: string;
    }>;
    options: any;
    status: 'processing' | 'ready' | 'error';
    createdAt: string;
    previewUrl?: string;
    error?: string;
}
export declare class PreviewManager {
    private previews;
    private readonly BASE_URL;
    /**
     * Generate a unique preview ID
     */
    generatePreviewId(componentName: string): string;
    /**
     * Store a preview request
     */
    storePreviewRequest(previewId: string, request: PreviewRequest): void;
    /**
     * Get a preview request
     */
    getPreviewRequest(previewId: string): PreviewRequest | undefined;
    /**
     * Update preview status
     */
    updatePreviewStatus(previewId: string, status: PreviewRequest['status'], error?: string): void;
    /**
     * Get preview URL
     */
    getPreviewUrl(previewId: string): string;
    /**
     * Generate HTML preview content
     */
    generatePreviewHTML(previewId: string): string;
    /**
     * Reconstruct complete code from chunks
     */
    private reconstructCodeFromChunks;
    /**
     * Create HTML template for preview
     */
    private createHTMLTemplate;
    /**
     * Clean up old previews
     */
    cleanup(maxAge?: number): void;
    /**
     * Get all previews (for debugging)
     */
    getAllPreviews(): PreviewRequest[];
}
//# sourceMappingURL=preview-manager.d.ts.map