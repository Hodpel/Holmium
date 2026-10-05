'use client'

// 外部依赖
import { useLayoutEffect } from 'react'
import type { ReactNode } from 'react'

// 通用组件
import { useHeader } from '@/components/ContextLayout'
import type { ArticleCover } from '@/lib/notion/articleCover'

export default function Container({ children, fullWidth, postTitle, cover = null }: { children: ReactNode; fullWidth?: boolean; postTitle?: string; cover?: ArticleCover | null }) {
    const { setFullWidth, setPostTitle, setCover } = useHeader()

    useLayoutEffect(() => {
        setFullWidth(Boolean(fullWidth))
        setPostTitle(postTitle ?? '')
        setCover(cover)
    }, [fullWidth, postTitle, cover, setFullWidth, setPostTitle, setCover])

    return (
        <>
            {!fullWidth && <div className="flex-1 hidden lg:block" />}

            <div className={`flex-none w-full px-4 max-w-2xl ${fullWidth ? 'md:max-w-[unset] lg:px-24' : ''}`}>{children}</div>
            {!fullWidth && <div className="flex-1 hidden lg:block" />}
        </>
    )
}
