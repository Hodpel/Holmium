import { renderHomeSocialCard } from '@/lib/metadata/social-card'

// Explicitly referenced by the homepage, not inherited by other page metadata.
export const dynamic = 'force-static'

export function GET() {
    return renderHomeSocialCard()
}
