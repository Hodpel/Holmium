'use client'

import { createContext, type ReactNode, useContext } from 'react'
import type { EquationBlock } from 'notion-types'
import { getBlockTitle } from 'notion-utils'
import { useNotionContext } from 'react-notion-x'
import type { EquationHtmlMap } from '@/lib/notion/equation'

type EquationProps = {
    block?: EquationBlock
    math?: string
    inline?: boolean
    className?: string
}

const emptyEquationHtml: EquationHtmlMap = { inline: {}, block: {} }
const EquationHtmlContext = createContext<EquationHtmlMap>(emptyEquationHtml)

export function EquationHtmlProvider({ value, children }: { value: EquationHtmlMap; children: ReactNode }) {
    return <EquationHtmlContext.Provider value={value}>{children}</EquationHtmlContext.Provider>
}

export default function Equation({ block, math, inline = false, className }: EquationProps) {
    const { recordMap } = useNotionContext()
    const equationHtml = useContext(EquationHtmlContext)
    const source = math || (block ? getBlockTitle(block, recordMap) : '')

    if (!source) return null

    const html = equationHtml[inline ? 'inline' : 'block'][source]

    return (
        <span
            className={['notion-equation', inline ? 'notion-equation-inline' : 'notion-equation-block', className]
                .filter(Boolean)
                .join(' ')}
            dangerouslySetInnerHTML={html ? { __html: html } : undefined}
        >
            {html ? undefined : source}
        </span>
    )
}
