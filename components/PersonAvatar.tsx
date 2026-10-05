'use client'

import { useCallback, useState } from 'react'

import { UserRoundIcon } from '@/components/Icons'

export default function PersonAvatar({ src }: { src?: string }) {
    const [loaded, setLoaded] = useState(false)

    const imageRef = useCallback((image: HTMLImageElement | null) => {
        // Cached images can finish before hydration attaches the load handler.
        if (image?.complete && image.naturalWidth > 0) setLoaded(true)
    }, [])

    return <span className="holmium-person-avatar" aria-hidden="true">
        <UserRoundIcon />
        {/* Keep the image in the initial server and client DOM, even while loading. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src && <img ref={imageRef} src={src} alt="" width={18} height={18}
            loading="lazy" decoding="async" data-loaded={loaded}
            onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />}
    </span>
}
