import type { Metadata } from 'next'

import type { Config } from '@/lib/types'

type Appearance = Config['appearance']
type IconConfig = Config['icons']
type IconTheme = 'light' | 'dark'

function optionalAsset(value: string | undefined): string | undefined {
    const asset = value?.trim()
    return asset || undefined
}

function resolveFavicon(icons: IconConfig, theme: IconTheme): string {
    if (theme === 'dark') return optionalAsset(icons.faviconDark) ?? icons.favicon
    return icons.favicon
}

export function resolveHeaderLogo(icons: IconConfig, theme: IconTheme): string {
    const configuredLogo = theme === 'dark' ? (optionalAsset(icons.headerLogoDark) ?? icons.headerLogo) : icons.headerLogo
    return configuredLogo === 'favicon' ? resolveFavicon(icons, theme) : configuredLogo
}

export function buildFaviconMetadata(icons: IconConfig, appearance: Appearance): NonNullable<Metadata['icons']> {
    const lightFavicon = resolveFavicon(icons, 'light')
    const darkFavicon = resolveFavicon(icons, 'dark')

    if (appearance === 'dark') return { icon: darkFavicon }
    if (appearance === 'light' || darkFavicon === lightFavicon) return { icon: lightFavicon }

    return {
        icon: [
            { url: lightFavicon, media: '(prefers-color-scheme: light)' },
            { url: darkFavicon, media: '(prefers-color-scheme: dark)' },
        ],
    }
}
