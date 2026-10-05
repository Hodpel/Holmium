import config from '@/blog.config'

export default function Footer() {
    const d = new Date()
    const y = d.getFullYear()
    const from = config.since
    return (
        <div className="mt-6 m-auto w-full max-w-2xl shrink-0 px-4 text-gray-500 transition-all dark:text-gray-400">
            <hr className="border-gray-200 dark:border-gray-600" />
            <div className="my-4 text-sm leading-6">
                <div className="flex align-baseline justify-between flex-wrap">
                    <p>
                        © {config.author.name} {from === y || !from ? y : `${from} - ${y}`}
                    </p>
                </div>
            </div>
        </div>
    )
}
