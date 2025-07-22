# HTML File Generation Process

## Overview

This document explains exactly how TSX/React code and CSS files are transformed into a complete, self-contained HTML file that can be opened in any browser.

## Step-by-Step Process

### **Input Example**
```typescript
// Input TSX code
import React from 'react';
import './styles.css';

interface Props {
  title: string;
}

export default function MyComponent({ title }: Props) {
  return (
    <div className="bg-blue-500 text-white p-4 rounded">
      <h1 className="text-xl font-bold">{title}</h1>
      <button onClick={() => alert('clicked')}>
        Click me
      </button>
    </div>
  );
}
```

```css
/* Input CSS file */
.custom-button {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
}
```

### **Step 1: Code Cleaning**
```typescript
// cleanCodeForPreview() function removes:
// ❌ import React from 'react';
// ❌ import './styles.css';
// ❌ interface Props { title: string; }
// ❌ export default function MyComponent({ title }: Props) {
// ❌ }: Props) becomes just )

// Result after cleaning:
function MyComponent({ title }) {
  return (
    <div className="bg-blue-500 text-white p-4 rounded">
      <h1 className="text-xl font-bold">{title}</h1>
      <button onClick={() => alert('clicked')}>
        Click me
      </button>
    </div>
  );
}
```

### **Step 2: CSS Extraction**
```typescript
// Extract CSS from files array
const cssContent = files
  .filter(file => file.type === 'css')
  .map(file => file.content)
  .join('\n\n');

// Result:
const cssContent = `
.custom-button {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
}
`;
```

### **Step 3: HTML Template Generation**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyComponent Preview</title>
    
    <!-- React Dependencies from CDN -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    
    <!-- Tailwind CSS (if styling === 'tailwind') -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <style>
        /* Base preview container styles */
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f8fafc;
        }
        .preview-container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .preview-header { 
            background: #f1f5f9; 
            padding: 20px; 
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .preview-badge {
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
        }
        .preview-content { 
            padding: 24px; 
        }
        
        /* Injected CSS from files */
        .custom-button {
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-header">
            <h1>MyComponent</h1>
            <div class="preview-badge">Copy-Paste Preview</div>
        </div>
        <div class="preview-content">
            <div id="root">
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    Loading component...
                </div>
            </div>
        </div>
    </div>
    
    <script type="text/babel">
        try {
            // Cleaned component code gets inserted here
            function MyComponent({ title }) {
              return (
                <div className="bg-blue-500 text-white p-4 rounded">
                  <h1 className="text-xl font-bold">{title}</h1>
                  <button onClick={() => alert('clicked')}>
                    Click me
                  </button>
                </div>
              );
            }
            
            // Render the component
            const root = ReactDOM.createRoot(document.getElementById('root'));
            
            // Component detection and rendering
            if (typeof MyComponent !== 'undefined') {
                root.render(React.createElement(MyComponent, { title: 'Hello World' }));
            } else {
                throw new Error('Component MyComponent not found');
            }
            
        } catch (error) {
            // Error handling UI
            document.getElementById('root').innerHTML = `
                <div class="error-display">
                    <h3>⚠️ Render Error</h3>
                    <p><strong>Component:</strong> MyComponent</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                </div>
            `;
        }
    </script>
</body>
</html>
```

### **Step 4: File Creation**
```typescript
// Generate safe filename
const safeComponentName = 'MyComponent'.replace(/[^a-zA-Z0-9]/g, '');
const filename = `${safeComponentName}Preview.html`;
const filepath = path.join(process.cwd(), filename);

// Write to file system
writeFileSync(filepath, htmlContent, 'utf8');

// Result: MyComponentPreview.html created in project root
```

## **Key Transformations**

### **TSX → JavaScript**
- **Remove imports**: `import React from 'react'` → (deleted)
- **Remove exports**: `export default function` → `function`
- **Remove TypeScript**: `{ title }: Props` → `{ title }`
- **Remove interfaces**: `interface Props {}` → (deleted)
- **Preserve JSX**: JSX syntax stays intact for Babel

### **CSS → Inline Styles**
- **Extract from files**: Read `.css` files from `files` array
- **Inject into HTML**: Place inside `<style>` tags
- **Combine with base styles**: Merge with preview container styles

### **Dependencies → CDN**
- **React**: Load from unpkg.com CDN
- **ReactDOM**: Load from unpkg.com CDN
- **Babel**: Load from unpkg.com CDN for JSX transformation
- **Tailwind**: Load from CDN if `styling === 'tailwind'`

## **Runtime Execution**

### **Browser Loading Sequence**
1. **HTML parses** → DOM structure created
2. **CSS loads** → Styles applied
3. **React loads** → React library available
4. **Babel loads** → JSX transformation ready
5. **Script executes** → Component code runs
6. **Component renders** → UI appears

### **Component Detection**
```javascript
// The system tries multiple ways to find the component:
1. Direct reference: `MyComponent`
2. Window object: `window.MyComponent`
3. Function scan: Look for capitalized functions
4. Fallback: Use any available component function
```

### **Error Handling**
```javascript
// If anything goes wrong:
try {
    // Component rendering
} catch (error) {
    // Show friendly error UI with:
    // - Component name
    // - Error message
    // - Debug information
    // - Stack trace
}
```

## **Example Transformation**

### **Input**
```typescript
import React from 'react';
import './Button.css';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

export default function Button({ onClick, children }: ButtonProps) {
  return (
    <button className="btn-primary" onClick={onClick}>
      {children}
    </button>
  );
}
```

### **Output HTML**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Button Preview</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        /* Preview container styles */
        .preview-container { /* ... */ }
        
        /* Injected CSS from Button.css */
        .btn-primary {
            background: blue;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-header">
            <h1>Button</h1>
            <div class="preview-badge">Preview</div>
        </div>
        <div class="preview-content">
            <div id="root"></div>
        </div>
    </div>
    
    <script type="text/babel">
        function Button({ onClick, children }) {
          return (
            <button className="btn-primary" onClick={onClick}>
              {children}
            </button>
          );
        }
        
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(Button, { 
            onClick: () => alert('clicked'), 
            children: 'Test Button' 
        }));
    </script>
</body>
</html>
```

## **Why This Works**

### **Self-Contained**
- All dependencies from CDN
- All CSS inlined
- All JavaScript inlined
- No external file references

### **Browser Compatible**
- Standard HTML5 structure
- CDN libraries are stable
- Babel handles JSX transformation
- Works in any modern browser

### **Error Resistant**
- Component detection fallbacks
- Graceful error handling
- Debug information available
- Always shows something

The result is a complete, standalone HTML file that perfectly renders your React component with all its styling, exactly as it would appear in a real application.