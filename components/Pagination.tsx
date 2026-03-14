import Link from 'next/link'
import config from '@/blog.config'
import locale from '@/lib/locale'

const Pagination = ({ page, showPagination }: { page: number; showPagination: boolean }) => {
    const currentPage = +page
    let additionalClassName = 'justify-between'
    if (currentPage === 1 && showPagination) additionalClassName = 'justify-end'
    if (currentPage !== 1 && !showPagination) additionalClassName = 'justify-start'
    return (
        <div className={`flex font-medium text-gray-500 dark:text-gray-400 hover:text-theme ${additionalClassName}`}>
            {currentPage !== 1 && (
                <Link scroll={false} href={currentPage - 1 === 1 ? `${config.path || '/'}` : `/page/${currentPage - 1}`}>
                    <button rel="prev" className="block cursor-pointer">
                        ← {locale.PAGINATION.PREV}
                    </button>
                </Link>
            )}
            {showPagination && (
                <Link scroll={false} href={`/page/${currentPage + 1}`}>
                    <button rel="next" className="block cursor-pointer">
                        {locale.PAGINATION.NEXT} →
                    </button>
                </Link>
            )}
        </div>
    )
}

export default Pagination
