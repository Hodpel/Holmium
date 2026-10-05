'use client'

import type { ReactNode } from 'react'
import PersonAvatar from '../PersonAvatar'
import { useNotionContext } from 'react-notion-x'
import { getBlockValue } from 'notion-utils'


export default function PersonMention({ id, children }: { id: string; children: ReactNode }) {
    const { recordMap } = useNotionContext()
    const photo = getBlockValue(recordMap.notion_user?.[id])?.profile_photo
    const src = typeof photo === 'string' && /^(https?:\/\/|\/(?!\/))/.test(photo) ? photo : undefined
    return <span className="holmium-person-mention">
        <PersonAvatar key={src || ''} src={src} />
        {children}
    </span>
}
