'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useState } from 'react'
import type { ArticleCover } from '@/lib/notion/articleCover'

interface HeaderContextType {
    postTitle: string
    setPostTitle: (title: string) => void
    fullWidth: boolean
    setFullWidth: (fullWidth: boolean) => void
    cover: ArticleCover | null
    setCover: (cover: ArticleCover | null) => void
}

const HeaderContext = createContext<HeaderContextType>({
    postTitle: '',
    setPostTitle: () => {},
    fullWidth: false,
    setFullWidth: () => {},
    cover: null,
    setCover: () => {},
})

export default function ContextLayout({ children }: { children: ReactNode }) {
    const [postTitle, setPostTitle] = useState<string>('')
    const [fullWidth, setFullWidth] = useState<boolean>(false)
    const [cover, setCover] = useState<ArticleCover | null>(null)

    return (
        <HeaderContext.Provider
            value={{
                postTitle,
                setPostTitle,
                fullWidth,
                setFullWidth,
                cover,
                setCover,
            }}
        >
            {children}
        </HeaderContext.Provider>
    )
}

export function useHeader() {
    return useContext(HeaderContext)
}
