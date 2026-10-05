import Image from 'next/image'

import config from '@/blog.config'
import { resolveHeaderLogo } from '@/lib/branding/icons'

const logoSize = 32

function HeaderLogoImage({ src }: { src: string }) {
    return (
        <Image
            src={src}
            width={logoSize}
            height={logoSize}
            alt={config.title}
            loading="eager"
            fetchPriority="high"
        />
    )
}

export default function HeaderLogo() {
    const lightLogo = resolveHeaderLogo(config.icons, 'light')
    const darkLogo = resolveHeaderLogo(config.icons, 'dark')

    if (config.appearance !== 'auto' || lightLogo === darkLogo) {
        const logo = config.appearance === 'dark' ? darkLogo : lightLogo
        return <HeaderLogoImage src={logo} />
    }

    return (
        <picture>
            <source media="(prefers-color-scheme: dark)" srcSet={darkLogo} />
            <HeaderLogoImage src={lightLogo} />
        </picture>
    )
}
