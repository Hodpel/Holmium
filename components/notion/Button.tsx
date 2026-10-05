'use client'

import type { CSSProperties } from 'react'
import type { ButtonBlock, ExtendedRecordMap } from 'notion-types'
import { Button as ReactNotionButton, useNotionContext } from 'react-notion-x'

type ButtonProps = {
    block: ButtonBlock
    blockId: string
    className?: string
}

type ButtonAutomation = {
    properties?: {
        icon?: unknown
    }
}

type RecordMapWithAutomations = ExtendedRecordMap & {
    automation?: Record<string, unknown>
}

type ButtonIconStyle = CSSProperties & {
    '--holmium-button-icon-image'?: string
    '--holmium-button-icon-text'?: string
}

function unwrapRecordValue<T>(record: unknown): T | undefined {
    let value = record

    while (value && typeof value === 'object' && 'value' in value) {
        value = (value as { value?: unknown }).value
    }

    return value && typeof value === 'object' ? (value as T) : undefined
}

function getButtonIcon(icon: unknown): { kind: 'image' | 'text'; value: string } | undefined {
    if (typeof icon !== 'string' || !icon.trim()) return undefined

    const value = icon.trim()
    if (value.startsWith('/')) {
        return { kind: 'image', value: new URL(value, 'https://app.notion.com').toString() }
    }
    if (/^(?:https?:|data:image\/)/i.test(value)) return { kind: 'image', value }

    return { kind: 'text', value }
}

export default function Button(props: ButtonProps) {
    const { recordMap } = useNotionContext()
    const automationId = props.block.format?.automation_id
    const automationRecord = automationId
        ? (recordMap as RecordMapWithAutomations).automation?.[automationId]
        : undefined
    const automation = unwrapRecordValue<ButtonAutomation>(automationRecord)
    const icon = getButtonIcon(automation?.properties?.icon)
    const style: ButtonIconStyle | undefined = icon
        ? icon.kind === 'image'
            ? { '--holmium-button-icon-image': `url(${JSON.stringify(icon.value)})` }
            : { '--holmium-button-icon-text': JSON.stringify(icon.value) }
        : undefined

    return (
        <div
            className="holmium-notion-button"
            data-holmium-button-icon={icon?.kind}
            style={style}
        >
            <ReactNotionButton {...props} />
        </div>
    )
}
