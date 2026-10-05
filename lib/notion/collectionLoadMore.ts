type CollectionLoadMoreButton = {
    childNodes: ArrayLike<{ nodeType: number; textContent: string | null }>
    tabIndex: number
    setAttribute(name: string, value: string): void
}

export function prepareCollectionLoadMoreButtons(
    buttons: Iterable<CollectionLoadMoreButton>,
    label: string,
): void {
    for (const button of buttons) {
        const labelNode = Array.from(button.childNodes).find((node) => node.nodeType === 3 && node.textContent?.trim())
        if (labelNode) labelNode.textContent = label
        button.tabIndex = 0
        button.setAttribute('role', 'button')
        button.setAttribute('aria-label', label)
    }
}
