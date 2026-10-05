const PANEL_DURATION = 200
const PANEL_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'
const EXPANSION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'

function motionIsReduced(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getEventElement(target: EventTarget | null): Element | null {
    return target instanceof Element ? target : null
}

function getVisiblePlugin(panel: HTMLElement): HTMLElement | null {
    return Array.from(panel.children).find((child) => getComputedStyle(child).display !== 'none') as HTMLElement | null
}

function waitForAnimation(animation: Animation): Promise<void> {
    return animation.finished.then(
        () => undefined,
        () => undefined
    )
}

/**
 * Adds visual transitions around Artalk's synchronous display toggles while
 * leaving the actual plugin and comment state changes to Artalk itself.
 */
export function installArtalkMotion(root: HTMLElement): () => void {
    root.classList.add('holmium-artalk-motion')

    const runningAnimations = new Set<Animation>()
    let disposed = false
    let replayingClick = false
    let closingPlugin = false
    let switchingPlugin = false
    let switchingEmoticonGroup = false
    let pendingEmoticonGroup: HTMLElement | null = null
    let expandingComment = false

    const trackAnimation = (animation: Animation): Animation => {
        runningAnimations.add(animation)
        void waitForAnimation(animation).then(() => runningAnimations.delete(animation))
        return animation
    }

    const play = (element: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation =>
        trackAnimation(element.animate(keyframes, options))

    const animatePluginOpen = () => {
        window.requestAnimationFrame(() => {
            if (disposed || motionIsReduced()) return

            const panel = root.querySelector<HTMLElement>('.atk-plug-panel-wrap')
            if (!panel || getComputedStyle(panel).display === 'none') return

            const plugin = getVisiblePlugin(panel)
            if (!plugin) return

            const panelHeight = panel.getBoundingClientRect().height
            play(
                panel,
                [
                    { height: '0px', opacity: 0 },
                    { height: `${panelHeight}px`, opacity: 1 },
                ],
                { duration: PANEL_DURATION, easing: PANEL_EASING }
            )
            play(
                plugin,
                [
                    { opacity: 0, transform: 'translateY(0.25rem)' },
                    { opacity: 1, transform: 'translateY(0)' },
                ],
                { duration: PANEL_DURATION, easing: PANEL_EASING }
            )
        })
    }

    const animatePluginClose = async (button: HTMLElement, panel: HTMLElement) => {
        if (closingPlugin) return
        closingPlugin = true

        const plugin = getVisiblePlugin(panel)
        const animations: Animation[] = []
        if (plugin) {
            const panelHeight = panel.getBoundingClientRect().height
            animations.push(
                play(
                    panel,
                    [
                        { height: `${panelHeight}px`, opacity: 1 },
                        { height: '0px', opacity: 0 },
                    ],
                    { duration: PANEL_DURATION, easing: 'ease-in-out', fill: 'forwards' }
                ),
                play(
                    plugin,
                    [
                        { opacity: 1, transform: 'translateY(0)' },
                        { opacity: 0, transform: 'translateY(-0.25rem)' },
                    ],
                    { duration: 160, easing: 'ease-in', fill: 'forwards' }
                )
            )
        }

        await Promise.all(animations.map(waitForAnimation))

        if (!disposed && button.isConnected) {
            replayingClick = true
            button.click()
            replayingClick = false
        }

        for (const animation of animations) animation.cancel()
        closingPlugin = false
    }

    const animatePluginSwitch = async (button: HTMLElement, panel: HTMLElement) => {
        if (switchingPlugin) return
        switchingPlugin = true

        const currentPlugin = getVisiblePlugin(panel)
        const exitAnimation = currentPlugin
            ? play(
                  currentPlugin,
                  [
                      { opacity: 1, transform: 'translateY(0)' },
                      { opacity: 0, transform: 'translateY(-0.2rem)' },
                  ],
                  { duration: 100, easing: 'ease-in', fill: 'forwards' }
              )
            : null

        if (exitAnimation) await waitForAnimation(exitAnimation)

        if (!disposed && button.isConnected) {
            replayingClick = true
            button.click()
            replayingClick = false
        }
        exitAnimation?.cancel()

        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))

        if (!disposed) {
            const nextPlugin = getVisiblePlugin(panel)
            if (nextPlugin) {
                const enterAnimation = play(
                    nextPlugin,
                    [
                        { opacity: 0, transform: 'translateY(0.2rem)' },
                        { opacity: 1, transform: 'translateY(0)' },
                    ],
                    { duration: 160, easing: PANEL_EASING }
                )
                await waitForAnimation(enterAnimation)
            }
        }

        switchingPlugin = false
    }

    const animateEmoticonGroupSwitch = async (button: HTMLElement) => {
        if (switchingEmoticonGroup) {
            pendingEmoticonGroup = button
            return
        }
        switchingEmoticonGroup = true

        const panel = button.closest<HTMLElement>('.atk-editor-plug-emoticons')
        const currentGroup = panel ? getVisiblePlugin(panel.querySelector<HTMLElement>('.atk-grp-wrap') ?? panel) : null
        const exitAnimation = currentGroup
            ? play(
                  currentGroup,
                  [
                      { opacity: 1, transform: 'translateY(0)' },
                      { opacity: 0, transform: 'translateY(-0.2rem)' },
                  ],
                  { duration: 80, easing: 'ease-in', fill: 'forwards' }
              )
            : null

        if (exitAnimation) await waitForAnimation(exitAnimation)

        if (!disposed && button.isConnected) {
            replayingClick = true
            button.click()
            replayingClick = false
        }
        exitAnimation?.cancel()

        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))

        if (!disposed && panel) {
            const groupWrap = panel.querySelector<HTMLElement>('.atk-grp-wrap')
            const nextGroup = groupWrap ? getVisiblePlugin(groupWrap) : null
            if (nextGroup) {
                const enterAnimation = play(
                    nextGroup,
                    [
                        { opacity: 0, transform: 'translateY(0.2rem)' },
                        { opacity: 1, transform: 'translateY(0)' },
                    ],
                    { duration: 140, easing: PANEL_EASING }
                )
                await waitForAnimation(enterAnimation)
            }
        }

        switchingEmoticonGroup = false
        const pendingButton = pendingEmoticonGroup
        pendingEmoticonGroup = null
        if (!disposed && pendingButton?.isConnected && !pendingButton.classList.contains('active')) {
            void animateEmoticonGroupSwitch(pendingButton)
        }
    }

    const animateCommentExpansion = async (button: HTMLElement) => {
        if (expandingComment) return

        const content = button.closest<HTMLElement>('.atk-height-limit')
        if (!content) return

        expandingComment = true
        const startHeight = content.getBoundingClientRect().height
        const targetHeight = content.scrollHeight
        const distance = Math.max(0, targetHeight - startHeight)
        const duration = Math.min(800, Math.max(360, 260 + distance * 0.14))
        const previousMaxHeight = content.style.maxHeight
        content.style.maxHeight = `${targetHeight}px`
        content.style.setProperty('--holmium-artalk-expand-duration', `${duration}ms`)
        content.classList.add('holmium-artalk-expanding')

        const contentAnimation = play(
            content,
            [{ height: `${startHeight}px` }, { height: `${targetHeight}px` }],
            { duration, easing: EXPANSION_EASING, fill: 'forwards' }
        )
        const buttonAnimation = play(button, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.72 }, { opacity: 0, offset: 1 }], {
            duration,
            easing: 'linear',
            fill: 'forwards',
        })

        await Promise.all([waitForAnimation(contentAnimation), waitForAnimation(buttonAnimation)])

        if (!disposed && button.isConnected) {
            replayingClick = true
            button.click()
            replayingClick = false
        }

        contentAnimation.cancel()
        buttonAnimation.cancel()
        content.classList.remove('holmium-artalk-expanding')
        content.style.removeProperty('--holmium-artalk-expand-duration')
        if (content.classList.contains('atk-height-limit')) content.style.maxHeight = previousMaxHeight
        expandingComment = false
    }

    const handleClickCapture = (event: MouseEvent) => {
        if (disposed || replayingClick || motionIsReduced()) return

        const target = getEventElement(event.target)
        if (!target) return

        const pluginButton = target.closest<HTMLElement>('.atk-plug-btn')
        if (pluginButton) {
            if (closingPlugin || switchingPlugin) {
                event.preventDefault()
                event.stopPropagation()
                return
            }

            const panel = root.querySelector<HTMLElement>('.atk-plug-panel-wrap')
            const panelIsOpen = Boolean(panel && getComputedStyle(panel).display !== 'none')
            const isOpenButton = pluginButton.classList.contains('active') && panelIsOpen
            const isSwitchingButton = !pluginButton.classList.contains('active') && panelIsOpen

            if (isOpenButton && panel) {
                event.preventDefault()
                event.stopPropagation()
                void animatePluginClose(pluginButton, panel)
            } else if (isSwitchingButton && panel) {
                event.preventDefault()
                event.stopPropagation()
                void animatePluginSwitch(pluginButton, panel)
            } else {
                animatePluginOpen()
            }
            return
        }

        const emoticonGroupButton = target.closest<HTMLElement>('.atk-grp-switcher > span')
        if (emoticonGroupButton && !emoticonGroupButton.classList.contains('active')) {
            event.preventDefault()
            event.stopPropagation()
            void animateEmoticonGroupSwitch(emoticonGroupButton)
            return
        }

        const readMoreButton = target.closest<HTMLElement>('.atk-height-limit-btn')
        if (!readMoreButton) return

        event.preventDefault()
        event.stopPropagation()
        void animateCommentExpansion(readMoreButton)
    }

    root.addEventListener('click', handleClickCapture, true)

    return () => {
        disposed = true
        root.removeEventListener('click', handleClickCapture, true)
        for (const animation of runningAnimations) animation.cancel()
        runningAnimations.clear()
        root.classList.remove('holmium-artalk-motion')
    }
}
