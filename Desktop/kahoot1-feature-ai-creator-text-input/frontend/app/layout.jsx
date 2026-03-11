import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';
import { FloatingObjectsBackground } from '@/components/floating-objects-background';
import './globals.css';
const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
export const metadata = {
    title: 'QuizBlitz - Real-time Quiz Game',
    description: 'Create and play real-time quizzes with your class. Fast, fun, and engaging.',
    icons: {
        icon: '/sahyadri.png',
        shortcut: '/sahyadri.png',
        apple: '/sahyadri.png',
    },
};
export const viewport = {
    themeColor: '#4338ca',
    width: 'device-width',
    initialScale: 1,
};
export default function RootLayout({ children, }) {
    return (<html lang="en">
            <head>
                <link rel="icon" href="/sahyadri.png"/>
                <link rel="shortcut icon" href="/sahyadri.png"/>
                <link rel="apple-touch-icon" href="/sahyadri.png"/>
            </head>
            <body className="relative font-sans antialiased">
                <FloatingObjectsBackground />
                <div className="relative z-10">
                    {children}
                </div>
        <Toaster position="top-center" richColors/>
        <Analytics />
      </body>
    </html>);
}
