export async function waitForEntryAnimations(header: Element | null, signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
        const running = (header?.getAnimations?.({ subtree: true }) ?? [])
            .filter(animation => animation.playState === 'running' || animation.pending)
        if (running.length === 0) return
        // A canceled CSS transition rejects finished; it must not strand loading.
        await Promise.allSettled(running.map(animation => animation.finished))
    }
}
