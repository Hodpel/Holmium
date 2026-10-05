import SmoothLink from '@/components/SmoothLink'
import { buildTagHref } from '@/lib/blog/tags'

export interface TagsItemProps {
    tag: string
}

const TagItem = ({ tag }: TagsItemProps) => (
    <SmoothLink
        href={buildTagHref(tag)}
        className="holmium-tag-control inline-flex max-w-full shrink-0 items-center rounded-full border border-gray-200 px-2 py-1 text-sm leading-none whitespace-nowrap dark:border-gray-600"
    >
        <span className="block min-w-0 truncate">{tag}</span>
    </SmoothLink>
)

export default TagItem
