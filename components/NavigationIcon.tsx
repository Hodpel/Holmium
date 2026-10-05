import type { ComponentType, SVGProps } from 'react'

import { CloudIcon, HomeIcon, LinkIcon, SearchIcon, SparklesIcon } from '@/components/Icons'
import type { NavigationIconName } from '@/lib/types'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const navigationIcons = {
    home: HomeIcon,
    sparkles: SparklesIcon,
    cloud: CloudIcon,
    link: LinkIcon,
    search: SearchIcon,
} satisfies Record<NavigationIconName, IconComponent>

export default function NavigationIcon({ name }: { name: NavigationIconName }) {
    const Icon = navigationIcons[name]

    return <Icon className="h-5 w-5" />
}
