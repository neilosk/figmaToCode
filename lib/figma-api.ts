import { FigmaFile, FigmaNode } from '../types/figma';

/**
 * Figma API client for fetching design files
 */
export class FigmaAPI {
  private accessToken: string;
  private baseURL = 'https://api.figma.com/v1';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make a request to the Figma API
   */
  private async request(endpoint: string): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    console.log('Making Figma API request to:', url);
    
    try {
      const response = await fetch(url, {
        headers: {
          'X-Figma-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      });

      console.log('Figma API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Figma API error response:', errorText);
        
        // Try to parse as JSON first, fallback to text
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorText;
        } catch {
          errorMessage = errorText;
        }
        
        throw new Error(`Figma API error (${response.status}): ${errorMessage}`);
      }

      const data = await response.json();
      console.log('Figma API success, received data keys:', Object.keys(data));
      return data;
      
    } catch (error) {
      console.error('Figma API request failed:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Figma API. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  /**
   * Get a file by file key
   */
  async getFile(fileKey: string): Promise<FigmaFile> {
    try {
      const data = await this.request(`/files/${fileKey}`);
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch Figma file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get specific nodes from a file
   */
  async getNodes(fileKey: string, nodeIds: string[]): Promise<{ nodes: Record<string, FigmaNode> }> {
    try {
      const idsParam = nodeIds.join(',');
      const data = await this.request(`/files/${fileKey}/nodes?ids=${idsParam}`);
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch Figma nodes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file images (exports)
   */
  async getImages(
    fileKey: string,
    nodeIds: string[],
    options: {
      format?: 'jpg' | 'png' | 'svg' | 'pdf';
      scale?: number;
      svg_outline_text?: boolean;
      svg_include_id?: boolean;
      svg_simplify_stroke?: boolean;
    } = {}
  ): Promise<{ images: Record<string, string> }> {
    try {
      const idsParam = nodeIds.join(',');
      const params = new URLSearchParams({
        ids: idsParam,
        format: options.format || 'png',
        scale: (options.scale || 1).toString(),
      });

      if (options.svg_outline_text !== undefined) {
        params.append('svg_outline_text', options.svg_outline_text.toString());
      }
      if (options.svg_include_id !== undefined) {
        params.append('svg_include_id', options.svg_include_id.toString());
      }
      if (options.svg_simplify_stroke !== undefined) {
        params.append('svg_simplify_stroke', options.svg_simplify_stroke.toString());
      }

      const data = await this.request(`/images/${fileKey}?${params.toString()}`);
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch Figma images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file comments
   */
  async getComments(fileKey: string): Promise<{ comments: any[] }> {
    try {
      const data = await this.request(`/files/${fileKey}/comments`);
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch Figma comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get team projects
   */
  async getTeamProjects(teamId: string): Promise<{ projects: any[] }> {
    try {
      const data = await this.request(`/teams/${teamId}/projects`);
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch team projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get project files
   */
  async getProjectFiles(projectId: string): Promise<{ files: any[] }> {
    try {
      const data = await this.request(`/projects/${projectId}/files`);
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch project files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate access token by making a simple API call
   */
  async validateToken(): Promise<boolean> {
    try {
      // Try to get user info to validate token
      const response = await this.request('/me');
      console.log('Token validation successful for user:', response.email || response.handle || 'Unknown user');
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Get file version history
   */
  async getVersions(fileKey: string): Promise<{ versions: any[] }> {
    try {
      const data = await this.request(`/files/${fileKey}/versions`);
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch file versions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}