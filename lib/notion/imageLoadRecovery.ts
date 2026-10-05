type CachedImageState = {
    complete: boolean
    naturalWidth: number
}

export function recoverCachedImageLoads<T extends CachedImageState>(
    images: Iterable<T>,
    recover: (image: T) => void,
): number {
    let recovered = 0

    for (const image of images) {
        if (!image.complete || image.naturalWidth <= 0) continue

        recover(image)
        recovered += 1
    }

    return recovered
}
