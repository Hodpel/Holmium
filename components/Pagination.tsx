import Link from 'next/link'
import config from '@/blog.config'
import locale from '@/lib/locale'

const Pagination = ({ page, showNext }: { page: number; showNext: boolean }) => {
    const currentPage = +page
    let additionalClassName = 'justify-between'
    if (currentPage === 1 && showNext) additionalClassName = 'justify-end'
    if (currentPage !== 1 && !showNext) additionalClassName = 'justify-start'
    return (
        <div className={`flex font-medium text-black dark:text-gray-100 ${additionalClassName}`}>
            {currentPage !== 1 && (
                <Link scroll={false} href={currentPage - 1 === 1 ? `${config.path || '/'}` : `/page/${currentPage - 1}`}>
                    <button rel="prev" className="block cursor-pointer">
                        ← {locale.PAGINATION.PREV}
                    </button>
                </Link>
            )}
            {showNext && (
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
