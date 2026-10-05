import config from '@/blog.config'
import locale from '@/lib/locale'
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/Icons'
import SmoothLink from '@/components/SmoothLink'

export const Pagination = ({
    page,
    hasNext,
    hrefForPage,
}: {
    page: number
    hasNext: boolean
    hrefForPage?: (page: number) => string
}) => {
    const currentPage = page
    const resolveHref = hrefForPage ?? ((targetPage: number) => (targetPage === 1 ? config.path || '/' : `/page/${targetPage}`))
    let additionalClassName = 'justify-between'
    if (currentPage === 1 && hasNext) additionalClassName = 'justify-end'
    if (currentPage !== 1 && !hasNext) additionalClassName = 'justify-start'
    return (
        <div className={`flex font-medium ${additionalClassName}`}>
            {currentPage !== 1 && (
                <SmoothLink
                    rel="prev"
                    className="holmium-text-nav-control"
                    href={resolveHref(currentPage - 1)}
                >
                    <ArrowLeftIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {locale.PAGINATION.PREV}
                </SmoothLink>
            )}
            {hasNext && (
                <SmoothLink
                    rel="next"
                    className="holmium-text-nav-control"
                    href={resolveHref(currentPage + 1)}
                >
                    {locale.PAGINATION.NEXT}
                    <ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                </SmoothLink>
            )}
        </div>
    )
}
