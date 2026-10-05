'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useHeader } from '@/components/ContextLayout'
import config from '@/blog.config'
import type { ArticleCover as Cover } from '@/lib/notion/articleCover'

function CoverImage({ cover }: { cover: Cover }) {
    const [loaded, setLoaded] = useState(false)
    const reduceMotion = useReducedMotion()
    const transition = { duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' as const }
    const imageStyle = { objectPosition: `center ${cover.position}%` }
    return (
        <motion.div
            className="article-cover-background"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: cover.preview || loaded ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={transition}
        >
            {/* Decorative, low-priority image; keep the existing Notion proxy URL
                and do not broaden Next Image's remote-host allowlist. */}
            {cover.preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.preview} alt="" style={imageStyle} />
            )}
            <motion.img
                src={cover.src}
                alt=""
                decoding="async"
                fetchPriority="low"
                initial={{ opacity: cover.preview ? 0 : 1 }}
                animate={{ opacity: !cover.preview || loaded ? 1 : 0 }}
                transition={transition}
                onLoad={event => { void event.currentTarget.decode().then(() => setLoaded(true), () => {}) }}
                onError={() => setLoaded(false)}
                style={imageStyle}
            />
            <div className="article-cover-overlay" />
        </motion.div>
    )
}

export default function ArticleCover() {
    const { cover } = useHeader()
    if (!config.showArticleCover) return null
    return <AnimatePresence>{cover ? <CoverImage key={cover.src} cover={cover} /> : null}</AnimatePresence>
}
