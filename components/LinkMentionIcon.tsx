'use client'

import { useState, type CSSProperties } from 'react'
import { LinkIcon, SquareTextIcon } from '@/components/Icons'
import type { SummaryMentionIcon } from '@/lib/blog/types'

// Keep decorative icons inline even before the page's utility CSS is available.
const iconStyle: CSSProperties = {
    display: 'inline-block', width: '1em', height: '1em',
    verticalAlign: '-0.125em', marginInlineEnd: '0.25em', objectFit: 'contain',
}

export function MentionIcon({ icon }: { icon: SummaryMentionIcon }) {
    const [failedSrc, setFailedSrc] = useState<string>()
    // An empty inline box shares the img/svg baseline; its positioned glyph can overflow safely.
    if (icon.type === 'emoji') return <span className="holmium-mention-emoji" aria-hidden="true" style={{ ...iconStyle, position: 'relative' }}>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontWeight: 400 }}>{icon.text}</span>
    </span>
    if (icon.type === 'page' || (icon.type === 'image' && failedSrc === icon.src && icon.fallback === 'page')) {
        return <SquareTextIcon style={iconStyle} width="16" height="16" aria-hidden="true" />
    }
    if (icon.type === 'image' && failedSrc !== icon.src) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img style={iconStyle} src={icon.src} alt="" width={16} height={16} loading="lazy" decoding="async" referrerPolicy="no-referrer"
            ref={image => { if (image?.complete && image.currentSrc && image.naturalWidth === 0) setFailedSrc(icon.src) }}
            onError={() => setFailedSrc(icon.src)} />
    }
    if (icon.type !== 'github') {
        return <LinkIcon className="" aria-hidden="true" focusable="false" style={iconStyle} width="16" height="16" />
    }
    return <svg style={iconStyle} width="16" height="16" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill={icon.type === 'github' ? 'currentColor' : 'none'} stroke={icon.type === 'github' ? 'none' : 'currentColor'} strokeWidth={1.7}>
        {icon.type === 'github' ? <path d="M12 .75a11.25 11.25 0 0 0-3.558 21.923c.563.104.768-.244.768-.542 0-.267-.01-.974-.015-1.912-3.13.68-3.791-1.508-3.791-1.508-.512-1.3-1.25-1.646-1.25-1.646-1.022-.699.077-.685.077-.685 1.13.08 1.725 1.16 1.725 1.16 1.005 1.722 2.637 1.225 3.28.937.102-.728.393-1.225.715-1.507-2.499-.284-5.126-1.25-5.126-5.563 0-1.229.44-2.234 1.16-3.022-.116-.284-.503-1.43.11-2.98 0 0 .945-.303 3.094 1.155A10.79 10.79 0 0 1 12 6.18c.956.005 1.918.13 2.816.38 2.148-1.458 3.092-1.155 3.092-1.155.614 1.55.227 2.696.112 2.98.722.788 1.158 1.793 1.158 3.022 0 4.324-2.631 5.276-5.138 5.555.404.35.766 1.042.766 2.1 0 1.517-.014 2.74-.014 3.112 0 .3.203.65.774.54A11.252 11.252 0 0 0 12 .75Z" />
            : null}
    </svg>
}

export function StaticLinkMention({ text, icon }: { text: string; icon: SummaryMentionIcon }) {
    return <span style={{ fontWeight: 600 }}><MentionIcon icon={icon} />{text}</span>
}
