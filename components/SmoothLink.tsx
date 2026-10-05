'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

import { clearPostOrigin } from '@/lib/navigation/post-origin'
import { scrollToPageTop } from '@/lib/navigation/scroll'

type SmoothLinkProps = Omit<ComponentProps<typeof Link>, 'onNavigate' | 'scroll'>

export default function SmoothLink(props: SmoothLinkProps) {
    return (
        <Link
            {...props}
            scroll={false}
            onNavigate={() => {
                clearPostOrigin()
                scrollToPageTop()
            }}
        />
    )
}
