const collapsedLines = 3

export function getSummaryViewport(fullHeight: number, lineHeight: number, expanded: boolean) {
    const collapsedHeight = Math.min(fullHeight, lineHeight * collapsedLines)
    const canExpand = fullHeight > collapsedHeight + 1

    return {
        canExpand,
        collapsedHeight,
        targetHeight: expanded ? fullHeight : collapsedHeight,
    }
}
