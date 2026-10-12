export type MediaPresentation = {
    surface: 'preview' | 'poster' | 'frame'
    error: boolean
}
export type MediaPresentationEvent = 'poster-decoded' | 'frame-presented' | 'error' | 'retry'

export function reduceMediaPresentation(state: MediaPresentation, event: MediaPresentationEvent): MediaPresentation {
    switch (event) {
        case 'poster-decoded': return state.surface === 'preview' ? { ...state, surface: 'poster' } : state
        case 'frame-presented': return state.error || state.surface === 'frame' ? state : { ...state, surface: 'frame' }
        case 'error': return state.error ? state : { ...state, error: true }
        case 'retry': return state.error ? { ...state, error: false } : state
    }
}
