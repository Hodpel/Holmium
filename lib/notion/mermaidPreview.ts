type MermaidViewBox = {
    width: number
    height: number
}

function getMermaidViewBox(svg: string): MermaidViewBox | null {
    const match = svg.match(/\bviewBox\s*=\s*["']\s*[-+\d.e]+[,\s]+[-+\d.e]+[,\s]+([-+\d.e]+)[,\s]+([-+\d.e]+)\s*["']/i)
    if (!match) return null

    const width = Number(match[1])
    const height = Number(match[2])

    return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 ? { width, height } : null
}

export function isMermaidLinkTarget(target: unknown): boolean {
    if (!target || typeof target !== 'object' || !('closest' in target)) return false

    const closest = target.closest
    return typeof closest === 'function' && Boolean(closest.call(target, 'a'))
}

export function openMermaidLinksInNewTab(svg: string): string {
    return svg.replace(/<a\b[^>]*>/gi, (openingTag) => {
        const attributes = openingTag
            .slice(2, -1)
            .replace(/\s(?:target|rel)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')

        return `<a${attributes} target="_blank" rel="noopener noreferrer">`
    })
}

export function getMermaidImageSource(svg: string): string {
    const viewBox = getMermaidViewBox(svg)
    const sizedSvg = viewBox
        ? svg.replace(/<svg\b[^>]*>/i, (openingTag) => {
              const attributes = openingTag
                  .slice(4, -1)
                  .replace(/\s(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')

              return `<svg width="${viewBox.width}" height="${viewBox.height}"${attributes}>`
          })
        : svg
    const imageSvg = sizedSvg.replace(
        /<svg\b[^>]*>/i,
        (openingTag) => `${openingTag}<rect width="100%" height="100%" fill="#fff"/>`,
    )

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(imageSvg)}`
}
