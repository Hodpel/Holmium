'use client'

import Form from 'next/form'
import type { ComponentProps } from 'react'

import { clearPostOrigin } from '@/lib/navigation/post-origin'
import { scrollToPageTop } from '@/lib/navigation/scroll'

type SmoothFormProps = Omit<ComponentProps<typeof Form>, 'onSubmit' | 'scroll'>

export default function SmoothForm(props: SmoothFormProps) {
    return (
        <Form
            {...props}
            scroll={false}
            onSubmit={() => {
                clearPostOrigin()
                scrollToPageTop()
            }}
        />
    )
}
