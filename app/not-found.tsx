import locale from '@/lib/locale'

// export const revalidate = 1
export const revalidate = 100

export default async function NotFound() {
    return (
        <div className="w-full flex flex-col items-center justify-center">
            <h1 className="mt-10 text-5xl text-black dark:text-white text-center">404</h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 text-center">{locale.PAGE.ERROR_404.MESSAGE}</p>
        </div>
    )
}
