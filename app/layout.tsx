import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Figma to Code Generator',
  description: 'Convert Figma designs to React components using AI',
  keywords: ['figma', 'react', 'code generation', 'ai', 'design to code'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"></div>
                  <h1 className="text-xl font-bold text-slate-800">
                    Figma to Code
                  </h1>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span>Powered by Claude AI & OpenAI</span>
                </div>
              </div>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 bg-white/50 mt-16">
            <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-600">
              <p>Built with Next.js, Tailwind CSS, and Anthropic Claude API</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}