import 'server-only'

import { ImageResponse } from 'next/og'

import config from '@/blog.config'
import { socialCardSize } from './social-card-config'

function splitGraphemes(value: string) {
    return Array.from(new Intl.Segmenter(config.locale, { granularity: 'grapheme' }).segment(value), ({ segment }) => segment)
}

function getVisualLength(value: string) {
    return splitGraphemes(value).reduce((length, character) => {
        if (/\s/u.test(character)) return length + 0.35
        if (/^[\u0000-\u00ff]$/u.test(character)) return length + 0.55
        return length + 1
    }, 0)
}

function fitTitle(value: string) {
    const normalized = value.replace(/\s+/gu, ' ').trim()
    const characters = splitGraphemes(normalized)
    const maxVisualLength = 66
    let visualLength = 0
    let end = 0

    while (end < characters.length) {
        const nextLength = getVisualLength(characters[end] ?? '')
        if (visualLength + nextLength > maxVisualLength) break
        visualLength += nextLength
        end += 1
    }

    const title = end < characters.length ? `${characters.slice(0, end).join('').trimEnd()}…` : normalized
    const fittedLength = getVisualLength(title)
    const fontSize = fittedLength <= 18 ? 78 : fittedLength <= 32 ? 70 : fittedLength <= 48 ? 60 : 52

    return { title, fontSize }
}

export function renderHomeSocialCard() {
    return renderCard(config.title, true)
}

function CardOrnament({ height }: { height?: number }) {
    return <div style={{ display: 'flex', alignItems: 'center', ...(height === undefined ? {} : { height }) }}>
        <span style={{ width: 44, height: 2, backgroundColor: '#18181b' }} />
        <span style={{ width: 8, height: 8, margin: '0 12px', borderRadius: 4, backgroundColor: config.themeColor }} />
        <span style={{ width: 44, height: 2, backgroundColor: '#18181b' }} />
    </div>
}

export function renderCard(value: string, homepage = false) {
    const { title, fontSize } = fitTitle(value)
    const accentColor = config.themeColor

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f3',
                    color: '#18181b',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <svg
                    width="1200"
                    height="630"
                    viewBox="0 0 1200 630"
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                    }}
                >
                    <defs>
                        <pattern id="dot-pattern" width="100" height="100" patternUnits="userSpaceOnUse">
                            <circle cx="25" cy="25" r="2" fill="#c9c9c5" />
                            <circle cx="75" cy="75" r="2" fill="#c9c9c5" />
                        </pattern>
                    </defs>
                    <rect width="1200" height="630" fill="url(#dot-pattern)" />
                </svg>

                <div
                    style={{
                        width: 1000,
                        minHeight: 430,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '56px 72px',
                        backgroundColor: '#fafaf8',
                        border: '2px solid #18181b',
                        position: 'relative',
                    }}
                >
                    {homepage ? (
                        <CardOrnament height={30} />
                    ) : <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: 25,
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                        }}
                    >
                        <span
                            style={{
                                width: 9,
                                height: 9,
                                marginRight: 13,
                                borderRadius: 5,
                                backgroundColor: accentColor,
                            }}
                        />
                        {config.title}
                    </div>}

                    <div
                        style={{
                            display: 'flex',
                            maxWidth: 860,
                            maxHeight: 242,
                            overflow: 'hidden',
                            textAlign: 'center',
                            fontSize,
                            lineHeight: 1.15,
                            fontWeight: 700,
                            letterSpacing: '-2px',
                        }}
                    >
                        {title}
                    </div>

                    <CardOrnament />
                </div>
            </div>
        ),
        socialCardSize
    )
}
