'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'

export async function copyCodeText(text: string, writeText: ((text: string) => Promise<void>) | undefined): Promise<boolean> {
    if (!writeText) return false
    try {
        await writeText(text)
        return true
    } catch {
        return false
    }
}

export default function CodeFrame({ children, content, labels }: { children: ReactNode; content: string; labels: { copy: string; copied: string; failed: string } }) {
    const [feedback, setFeedback] = useState<{ content: string; copied: boolean } | null>(null)
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const request = useRef(0)
    const currentFeedback = feedback?.content === content ? feedback : null
    const copied = currentFeedback?.copied === true

    useEffect(() => () => {
        request.current += 1
        if (timeout.current) clearTimeout(timeout.current)
    }, [])

    async function handleCopy() {
        const currentRequest = ++request.current
        if (timeout.current) clearTimeout(timeout.current)
        setFeedback(null)
        const clipboard = navigator.clipboard
        const success = await copyCodeText(content, clipboard?.writeText.bind(clipboard))
        if (currentRequest !== request.current) return
        setFeedback({ content, copied: success })
        timeout.current = setTimeout(() => setFeedback(null), 1200)
    }

    return (
        <div className="holmium-code-frame">
            {children}
            <button
                className="holmium-code-copy"
                type="button"
                aria-label={copied ? labels.copied : labels.copy}
                onClick={() => { void handleCopy() }}
                data-copied={copied || undefined}
            >
                <Copy className="holmium-code-copy-icon" aria-hidden="true" />
                <Check className="holmium-code-check-icon" aria-hidden="true" />
            </button>
            <span className="sr-only" role="status" aria-live="polite">
                {currentFeedback ? (copied ? labels.copied : labels.failed) : ''}
            </span>
        </div>
    )
}
