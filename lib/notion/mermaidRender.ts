export type MermaidRenderTheme = 'dark' | 'neutral'

export type MermaidRenderState =
    | { key: string; source: string; status: 'failed' }
    | { key: string; source: string; status: 'ready'; svg: string }
    | null

interface MermaidEngine {
    initialize(options: { startOnLoad: false; theme: MermaidRenderTheme }): void
    render(id: string, source: string): Promise<{ svg: string }>
}

export function getVisibleMermaidSvg(state: MermaidRenderState, source: string): string {
    return state?.status === 'ready' && state.source === source ? state.svg : ''
}

export function createMermaidRenderer(engine: MermaidEngine) {
    let renderId = 0
    let queue = Promise.resolve()

    return (source: string, theme: MermaidRenderTheme, signal?: AbortSignal): Promise<string> => {
        const id = `holmium-mermaid-${++renderId}`
        const task = queue.then(async () => {
            signal?.throwIfAborted()
            // Promise chains alone stay in the microtask queue. Give input and
            // animation work a task boundary between expensive SVG layouts.
            await new Promise<void>((resolve) => setTimeout(resolve, 0))
            signal?.throwIfAborted()
            engine.initialize({ startOnLoad: false, theme })
            const result = await engine.render(id, source)
            return result.svg
        })

        queue = task.then(
            () => undefined,
            () => undefined,
        )
        return task
    }
}
