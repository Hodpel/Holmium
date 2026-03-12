import Image from 'next/image'

export default async function BlogPost({
    params,
}: {
    params: { slug: string } // 这里的 slug 对应文件夹名 [slug]
}) {
    const { slug } = await params
    return (
        // <div className="self-stretch flex flex-col items-center lg:flex-row lg:items-stretch">
        //     <div className="flex-1 hidden lg:block"></div>
        //     <div className="flex-none w-full max-w-2xl px-4"> </div>
        //     <div className="flex-1 hidden lg:block"></div>
        // </div>
        <div className="h-999">
            <span>{slug}</span>
        </div>
    )
}
