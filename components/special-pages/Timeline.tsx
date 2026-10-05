import type { ReactNode } from 'react'

function withVariant(base: string, variant?: string) {
    return variant ? `${base} ${variant}` : base
}

export function Timeline({ label, children }: {
    label: string
    children: ReactNode
}) {
    return <section aria-label={label} className="holmium-prose-scope holmium-timeline">{children}</section>
}

export function TimelineYear({ id, title, className, contentClassName, contentId, contentHidden, children }: {
    id: string
    title: ReactNode
    className?: string
    contentClassName?: string
    contentId?: string
    contentHidden?: boolean
    children: ReactNode
}) {
    return (
        <section className={withVariant('holmium-timeline-year', className)}>
            <h2 className="holmium-timeline-year-title" id={id}>{title}</h2>
            <span aria-hidden="true" className="holmium-timeline-year-node" />
            <div
                aria-hidden={contentHidden}
                className={withVariant('holmium-timeline-year-content', contentClassName)}
                id={contentId}
                inert={contentHidden}
            >
                {children}
            </div>
        </section>
    )
}

export function TimelineMonth({ title, className, children }: {
    title: string
    className?: string
    children: ReactNode
}) {
    return (
        <section className={withVariant('holmium-timeline-month', className)}>
            <h3 className="holmium-timeline-month-title">{title}</h3>
            {children}
        </section>
    )
}
