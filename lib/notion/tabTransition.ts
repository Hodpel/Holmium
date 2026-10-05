type TabPanelTransitionScheduler = {
    requestFrame(callback: FrameRequestCallback): number
    cancelFrame(frameId: number): void
    scheduleCleanup(callback: () => void, delay: number): number
    clearCleanup(cleanupId: number): void
}

type TabPanelExitScheduler = {
    scheduleExit(callback: () => void, delay: number): number
    clearExit(exitId: number): void
}

const TAB_PANEL_TRANSITION_DURATION = 300
const TAB_PANEL_EXIT_DURATION = 100

const defaultScheduler: TabPanelTransitionScheduler = {
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (frameId) => cancelAnimationFrame(frameId),
    scheduleCleanup: (callback, delay) => window.setTimeout(callback, delay),
    clearCleanup: (cleanupId) => window.clearTimeout(cleanupId),
}

const defaultExitScheduler: TabPanelExitScheduler = {
    scheduleExit: (callback, delay) => window.setTimeout(callback, delay),
    clearExit: (exitId) => window.clearTimeout(exitId),
}

export function startTabPanelExit(
    panel: HTMLElement,
    onExited: () => void,
    schedulerOverrides: Partial<TabPanelExitScheduler> = {},
): () => void {
    const scheduler = { ...defaultExitScheduler, ...schedulerOverrides }
    let stopped = false

    panel.dataset.holmiumTabContentExiting = 'true'
    const exitId = scheduler.scheduleExit(() => {
        if (stopped) return
        stopped = true
        delete panel.dataset.holmiumTabContentExiting
        onExited()
    }, TAB_PANEL_EXIT_DURATION)

    return () => {
        if (stopped) return
        stopped = true
        scheduler.clearExit(exitId)
        delete panel.dataset.holmiumTabContentExiting
    }
}

export function startTabPanelTransition(
    panel: HTMLElement,
    startHeight: number,
    schedulerOverrides: Partial<TabPanelTransitionScheduler> = {},
): () => void {
    const scheduler = { ...defaultScheduler, ...schedulerOverrides }
    let cleanupId: number | null = null
    let stopped = false

    const cleanup = () => {
        if (stopped) return
        stopped = true
        panel.style.height = ''
        delete panel.dataset.holmiumTabTransition
        delete panel.dataset.holmiumTabContentEntering
    }

    panel.style.height = `${startHeight}px`
    panel.dataset.holmiumTabTransition = 'true'

    const frameId = scheduler.requestFrame(() => {
        if (stopped) return
        panel.style.height = ''
        const endHeight = panel.getBoundingClientRect().height
        panel.style.height = `${startHeight}px`
        panel.getBoundingClientRect()
        panel.dataset.holmiumTabContentEntering = 'true'
        panel.style.height = `${endHeight}px`
        cleanupId = scheduler.scheduleCleanup(cleanup, TAB_PANEL_TRANSITION_DURATION)
    })

    return () => {
        if (stopped) return
        scheduler.cancelFrame(frameId)
        if (cleanupId !== null) scheduler.clearCleanup(cleanupId)
        cleanup()
    }
}
