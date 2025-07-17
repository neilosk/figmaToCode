# Figma to Code Generator

Convert your Figma designs to production-ready React components using AI. This application uses the Figma API to fetch design files and Claude AI to generate clean, responsive React code.

## Features

- 🎨 **Direct Figma Integration** - Fetch designs directly from Figma using the API
- 🤖 **AI-Powered Code Generation** - Generate React components using Claude AI
- 📱 **Responsive Design** - Output includes mobile-first responsive styles
- 🎯 **Multiple Output Types** - Generate single components, multiple components, or complete pages
- 🛠️ **Flexible Styling** - Support for Tailwind CSS, CSS Modules, or Styled Components
- 📝 **TypeScript Support** - Generate TypeScript code with proper type definitions
- 🔄 **Component Reusability** - Automatically detect and create reusable components

## Prerequisites

Before you begin, you'll need:

1. **Figma Access Token**
   - Go to [Figma Settings](https://www.figma.com/settings)
   - Navigate to "Account" → "Personal Access Tokens"
   - Create a new token with file read permissions

2. **AI API Keys** (Choose one or more)
   - **Anthropic API Key**: Sign up at [Anthropic Console](https://console.anthropic.com) and create an API key with Claude access
   - **OpenAI API Key**: Sign up at [OpenAI Platform](https://platform.openai.com) and create an API key with GPT-4 access
   - **Google Gemini API Key**: Sign up at [Google AI Studio](https://aistudio.google.com) and create an API key with Gemini access

## Installation

1. **Clone and setup the project:**
   ```bash
   npx create-next-app@latest figma-to-code --typescript --tailwind --app
   cd figma-to-code
   ```

2. **Install dependencies:**
   ```bash
   npm install @anthropic-ai/sdk openai lucide-react prismjs @types/prismjs
   ```

3. **Environment Configuration:**
   ```bash
   cp .env.example .env.local
   ```
   
   Then edit `.env.local` and add your API keys:
   ```env
   FIGMA_ACCESS_TOKEN=your_figma_token_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3013
   ```
   
   **Note**: You can add one or more AI provider keys. Having multiple providers gives you fallback options when one service is unavailable.

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Usage

### Step 1: Get Your Figma File Ready
- Make sure your Figma file is organized with frames containing your designs
- Ensure your access token has permission to read the file
- Copy the Figma file URL

### Step 2: Import and Generate
1. **Enter Figma Details:**
   - Paste your Figma file URL
   - Enter your Figma access token
   - Click "Load Figma File"

2. **Select Frames:**
   - Choose which frames/screens you want to convert
   - Preview the frame contents and dimensions

3. **Configure Generation:**
   - Choose AI provider (Claude AI, OpenAI GPT-4, or Gemini 2.5 Flash)
   - Choose generation type (single component, multiple components, or full page)
   - Select your preferred framework (React, Vue, Angular)
   - Pick styling method (Tailwind CSS, CSS Modules, Styled Components)
   - Configure TypeScript, props, and responsive options

4. **Generate Code:**
   - Click "Generate Code"
   - Review the generated components
   - Copy or download the code

## Project Structure

```
figma-to-code-generator/
├── app/
│   ├── api/
│   │   ├── figma/route.ts          # Figma API integration
│   │   └── generate/route.ts       # Code generation endpoint
│   ├── globals.css                 # Global styles
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Main application page
├── components/
│   ├── CodeViewer.tsx              # Code display with syntax highlighting
│   ├── FigmaInput.tsx              # Figma URL and token input
│   ├── FrameSelector.tsx           # Frame selection interface
│   └── GenerationOptions.tsx      # Code generation configuration
├── lib/
│   ├── figma-api.ts               # Figma API client
│   ├── claude-api.ts              # Claude AI client
│   └── openai-api.ts              # OpenAI API client
├── types/
│   └── figma.ts                   # TypeScript type definitions
├── utils/
│   └── figma.ts                   # Figma data processing utilities
└── README.md
```

## API Endpoints

### POST /api/figma
Fetch and process a Figma file.

**Request:**
```json
{
  "figmaUrl": "https://www.figma.com/file/...",
  "accessToken": "figd_..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fileName": "My Design File",
    "fileKey": "abc123",
    "frames": [...],
    "processedDocument": {...}
  }
}
```

### POST /api/generate
Generate code from processed Figma nodes.

**Request:**
```json
{
  "nodes": [...],
  "generationType": "component|page|multiple",
  "provider": "claude|openai",
  "options": {
    "framework": "react",
    "styling": "tailwind",
    "typescript": true,
    "includeProps": true,
    "responsive": true,
    "pageName": "HomePage"
  }
}
```

## Configuration Options

### Generation Types
- **Single Component:** Generate one component from the first selected frame
- **Multiple Components:** Extract and generate all reusable components
- **Complete Page:** Generate a full page layout with all components

### Frameworks
- **React** (default) - Modern React with hooks
- **Vue** - Vue 3 composition API
- **Angular** - Angular with TypeScript

### Styling Methods
- **Tailwind CSS** (recommended) - Utility-first CSS framework
- **CSS Modules** - Scoped CSS with modules
- **Styled Components** - CSS-in-JS solution

### Code Options
- **TypeScript** - Generate TypeScript code with type definitions
- **Props Interface** - Include props interface for component reusability
- **Responsive Design** - Mobile-first responsive styles

## Tips for Best Results

1. **Organize Your Figma File:**
   - Use clear, descriptive names for frames and layers
   - Group related elements together
   - Use consistent spacing and typography

2. **Design System:**
   - Define consistent colors, typography, and spacing
   - Use components and instances where possible
   - Create variants for different states

3. **Layout Structure:**
   - Use auto-layout frames for flexible designs
   - Define clear component boundaries
   - Consider responsive breakpoints

## Troubleshooting

### Common Issues

**Invalid Figma URL**
- Ensure the URL is from figma.com and includes the file ID
- Supported formats: `/file/`, `/design/`, `/proto/`

**Access Token Errors**
- Verify your token has read access to the file
- Check if the file is shared publicly or with your account
- Regenerate your token if it's expired

**Code Generation Fails**
- Check your AI provider API keys (Anthropic/OpenAI) and account limits
- Try switching between Claude and OpenAI if one is experiencing issues
- Ensure selected frames contain valid design elements
- Try with simpler designs first

**Empty or Malformed Code**
- Verify the design has proper structure and content
- Check if frames contain actual design elements
- Try different generation options

### Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Verify your API keys are correctly configured
3. Test with simple Figma files first
4. Review the generated API responses in Network tab

## Contributing

This is a starter template! Feel free to:

- Add support for more frameworks (Svelte, Solid, etc.)
- Implement additional styling systems
- Add component optimization features
- Improve the design detection algorithms
- Add more code generation options

## License

MIT License - feel free to use this project as a starting point for your own Figma-to-code tools.

## Roadmap

- [ ] Component variant detection
- [ ] Design token extraction
- [ ] Animation and interaction generation
- [ ] Component documentation generation
- [ ] Integration with design systems
- [ ] Real-time collaboration features
- [ ] Advanced responsive breakpoint detection
- [ ] Accessibility optimization
- [ ] Performance optimization suggestions