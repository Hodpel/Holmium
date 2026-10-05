'use client'

import { useState } from 'react'
import { MentionIcon } from '../LinkMentionIcon'
import { readWebMention } from '@/lib/notion/webMention'

export default function LinkMention({ encoded }: { encoded: string }) {
    let value: unknown
    try { value = JSON.parse(decodeURIComponent(encoded)) } catch { /* Render the static fallback. */ }
    const metadata = readWebMention(value)
    const [failedThumbnail, setFailedThumbnail] = useState<string>()
    const icon = metadata.icon ? { type: 'image' as const, src: metadata.icon } : { type: 'link' as const }
    const label = <><span className="notion-link-mention-icon"><MentionIcon icon={icon} /></span><span className="notion-link-mention-title">{metadata.title}</span></>
    return <span className="notion-link-mention">
        {metadata.href ? <a className="notion-link-mention-link" href={metadata.href} target="_blank" rel="noopener noreferrer">{label}</a>
            : <span className="text-gray-500 dark:text-gray-400">{label}</span>}
        {metadata.href && <span className="notion-link-mention-preview"><span className="notion-link-mention-card">
            {metadata.thumbnail && failedThumbnail !== metadata.thumbnail &&
                // eslint-disable-next-line @next/next/no-img-element
                <img className="notion-link-mention-preview-thumbnail" src={metadata.thumbnail} alt="" referrerPolicy="same-origin"
                    ref={image => { if (image?.complete && image.currentSrc && image.naturalWidth === 0) setFailedThumbnail(metadata.thumbnail) }}
                    onError={() => setFailedThumbnail(metadata.thumbnail)} />}
            <span className="notion-link-mention-preview-content">
                <span className="notion-link-mention-preview-title">{metadata.title}</span>
                {metadata.description && <span className="notion-link-mention-preview-description">{metadata.description}</span>}
                {metadata.provider && <span className="notion-link-mention-preview-footer"><MentionIcon icon={icon} /><span className="notion-link-mention-preview-provider">{metadata.provider}</span></span>}
            </span>
        </span></span>}
    </span>
}
