'use client'

import React, { Component, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

interface PdfProps {
    file: string
}

function PdfFallback({ file }: PdfProps) {
    return (
        <a className="notion-link holmium-pdf-fallback" href={file} target="_blank" rel="noreferrer">
            PDF
        </a>
    )
}

type PdfBoundaryProps = PdfProps & {
    children: ReactNode
}

interface PdfBoundaryState {
    failed: boolean
}

class PdfBoundary extends Component<PdfBoundaryProps, PdfBoundaryState> {
    state: PdfBoundaryState = { failed: false }

    static getDerivedStateFromError(): PdfBoundaryState {
        return { failed: true }
    }

    render() {
        if (this.state.failed) return <PdfFallback file={this.props.file} />

        return this.props.children
    }
}

const LazyPdf = dynamic(
    () =>
        import('react-notion-x/build/third-party/pdf').then((module) => {
            const PdfRenderer = module.Pdf as React.ComponentType<
                PdfProps & {
                    error?: ReactNode
                    loading?: ReactNode
                }
            >

            return function PdfWithFallback({ file }: PdfProps) {
                return <PdfRenderer file={file} loading={null} error={<PdfFallback file={file} />} />
            }
        }),
    { ssr: false, loading: () => null },
)

const subscribe = () => () => {}

export default function Pdf({ file }: PdfProps) {
    const hydrated = React.useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    )

    if (!hydrated) return null

    return (
        <PdfBoundary key={file} file={file}>
            <LazyPdf file={file} />
        </PdfBoundary>
    )
}
