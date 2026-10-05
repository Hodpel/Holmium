'use client'

import type { ReactNode } from 'react'
import type { SummaryPart } from '@/lib/blog/types'
import { StaticLinkMention } from '../LinkMentionIcon'
import PersonAvatar from '../PersonAvatar'
import SummaryDate from './SummaryDate'


export default function SummaryText({
    text,
    parts,
    initialDateSnapshot,
}: {
    text: string
    parts?: readonly SummaryPart[]
    initialDateSnapshot: string
}) {
    if (!parts) return text
    return parts.map((part, index) => part.type === 'text' ? <FormattedText key={index} part={part} /> : part.type === 'date' ? <SummaryDate key={index} value={part.value} initialDateSnapshot={initialDateSnapshot} /> : part.type === 'person' ?
        <span key={index} className="text-gray-500 dark:text-gray-400"><PersonAvatar key={part.avatar || ''} src={part.avatar} />{part.text}</span> :
        <StaticLinkMention key={index} text={part.text} icon={part.icon} />)
}

function FormattedText({ part }: { part: Extract<SummaryPart, { type: 'text' }> }) {
    let content: ReactNode = part.text
    const marks = part.marks ?? []
    if (marks.includes('c')) content = <code className="holmium-summary-code">{content}</code>
    if (marks.includes('b')) content = <strong>{content}</strong>
    if (marks.includes('i')) content = <em>{content}</em>
    if (marks.includes('_') || marks.includes('s')) content = <span style={{ textDecorationLine: [marks.includes('_') && 'underline', marks.includes('s') && 'line-through'].filter(Boolean).join(' ') }}>{content}</span>
    return content
}
