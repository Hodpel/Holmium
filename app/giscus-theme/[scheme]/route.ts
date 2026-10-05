import config from '@/blog.config'

const COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function safeColor(value: string, fallback: string): string {
    return COLOR_PATTERN.test(value.trim()) ? value.trim() : fallback
}

function createGiscusTheme(scheme: 'light' | 'dark'): string {
    const dark = scheme === 'dark'
    const accent = safeColor(config.themeColor, '#6b69d6')
    const background = safeColor(dark ? config.darkBackground : config.lightBackground, dark ? '#2f3437' : '#ffffff')
    const foreground = dark ? '#d1d5db' : '#4b5563'
    const muted = dark ? '#9ca3af' : '#6b7280'
    const subtle = dark ? '#6b7280' : '#9ca3af'
    const border = dark ? '#4b5563' : '#e5e7eb'

    return `@import url("https://giscus.app/themes/${scheme}.css");

main {
    --color-btn-text: ${foreground};
    --color-btn-bg: transparent;
    --color-btn-border: ${border};
    --color-btn-shadow: none;
    --color-btn-inset-shadow: none;
    --color-btn-hover-bg: color-mix(in srgb, ${accent} 10%, ${background});
    --color-btn-hover-border: ${accent};
    --color-btn-active-bg: color-mix(in srgb, ${accent} 16%, ${background});
    --color-btn-active-border: ${accent};
    --color-btn-selected-bg: color-mix(in srgb, ${accent} 12%, ${background});
    --color-btn-primary-text: #ffffff;
    --color-btn-primary-bg: ${accent};
    --color-btn-primary-border: ${accent};
    --color-btn-primary-shadow: none;
    --color-btn-primary-inset-shadow: none;
    --color-btn-primary-hover-bg: color-mix(in srgb, ${accent} 84%, #000000);
    --color-btn-primary-hover-border: color-mix(in srgb, ${accent} 84%, #000000);
    --color-btn-primary-selected-bg: color-mix(in srgb, ${accent} 74%, #000000);
    --color-btn-primary-selected-shadow: none;
    --color-btn-primary-disabled-text: rgba(255, 255, 255, 0.72);
    --color-btn-primary-disabled-bg: color-mix(in srgb, ${accent} 48%, ${background});
    --color-btn-primary-disabled-border: transparent;
    --color-action-list-item-default-hover-bg: color-mix(in srgb, ${accent} 10%, transparent);
    --color-segmented-control-bg: transparent;
    --color-segmented-control-button-bg: ${background};
    --color-segmented-control-button-selected-border: ${accent};
    --color-fg-default: ${foreground};
    --color-fg-muted: ${muted};
    --color-fg-subtle: ${subtle};
    --color-canvas-default: ${background};
    --color-canvas-overlay: ${background};
    --color-canvas-inset: ${background};
    --color-canvas-subtle: ${background};
    --color-border-default: ${border};
    --color-border-muted: color-mix(in srgb, ${border} 70%, transparent);
    --color-neutral-muted: color-mix(in srgb, ${muted} 18%, transparent);
    --color-accent-fg: ${accent};
    --color-accent-emphasis: ${accent};
    --color-accent-muted: color-mix(in srgb, ${accent} 40%, transparent);
    --color-accent-subtle: color-mix(in srgb, ${accent} 12%, transparent);
    --color-success-fg: ${accent};
    --color-primer-shadow-inset: none;
    --color-social-reaction-bg-hover: color-mix(in srgb, ${accent} 10%, transparent);
    --color-social-reaction-bg-reacted-hover: color-mix(in srgb, ${accent} 18%, transparent);
}

body,
main {
    font-family: 'IBM Plex Sans', 'PingFang SC', 'Microsoft YaHei', ui-sans-serif, system-ui, sans-serif;
}

::selection {
    background-color: color-mix(in srgb, ${accent} 30%, transparent) !important;
    color: inherit !important;
}

::-moz-selection {
    background-color: color-mix(in srgb, ${accent} 30%, transparent) !important;
    color: inherit !important;
}

.gsc-reactions {
    margin-bottom: 1.5rem;
    text-align: center;
}

.gsc-reactions .justify-center {
    justify-content: center !important;
}

.gsc-reactions-count {
    font-weight: 600;
    text-align: center;
}

.gsc-comments-count {
    font-weight: 600;
    text-align: left;
}

.gsc-comment-author > div > span {
    border-color: color-mix(in srgb, ${accent} 42%, transparent);
    background-color: color-mix(in srgb, ${accent} 10%, ${background});
    color: ${accent};
    font-weight: 600;
}

.gsc-comment-box,
.gsc-comment > div {
    border-radius: 0.375rem;
    box-shadow: none;
    transition:
        border-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
        box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1),
        background-color 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.gsc-comment-box:focus-within {
    border-color: ${accent};
    box-shadow: 0 0 0 1px color-mix(in srgb, ${accent} 24%, transparent);
}

.gsc-comment-box-tabs {
    background: transparent;
}

.gsc-comment-box-textarea,
.btn,
a,
summary {
    transition:
        color 180ms ease,
        background-color 180ms ease,
        border-color 180ms ease,
        box-shadow 180ms ease,
        opacity 180ms ease;
}

.gsc-comment-box-textarea:focus {
    border-color: ${accent};
    box-shadow: 0 0 0 1px color-mix(in srgb, ${accent} 44%, transparent);
}

.BtnGroup-item--selected .btn {
    border-color: ${accent};
    color: ${accent};
}

a {
    text-underline-offset: 0.18em;
}

@media (prefers-reduced-motion: reduce) {
    .gsc-comment-box,
    .gsc-comment > div,
    .gsc-comment-box-textarea,
    .btn,
    a,
    summary {
        transition: none;
    }
}
`
}

export async function GET(_request: Request, { params }: { params: Promise<{ scheme: string }> }) {
    const { scheme } = await params
    const normalizedScheme = scheme.replace(/\.css$/, '')

    if (normalizedScheme !== 'light' && normalizedScheme !== 'dark') {
        return new Response(null, { status: 404 })
    }

    return new Response(createGiscusTheme(normalizedScheme), {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
            'Content-Type': 'text/css; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
        },
    })
}
