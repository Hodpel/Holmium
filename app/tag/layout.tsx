import type { ReactNode } from 'react'

import TagTransition from '@/components/TagTransition'

export default function TagLayout({ children }: { children: ReactNode }) {
    return <TagTransition>{children}</TagTransition>
}
