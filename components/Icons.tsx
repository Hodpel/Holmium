import React from 'react'
import {
    ArrowLeft,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    Cloud,
    House,
    Search,
    Sparkles,
    SquareText,
    UserRound,
} from 'lucide-react'

type IconProps = React.SVGProps<SVGSVGElement>

export const ArrowLeftIcon = ArrowLeft
export const ArrowRightIcon = ArrowRight
export const ChevronDownIcon = ChevronDown
export const ChevronUpIcon = ChevronUp
export const CloudIcon = Cloud
export const HomeIcon = House
export const SearchIcon = Search
export const SparklesIcon = Sparkles
export const SquareTextIcon = SquareText
export const UserRoundIcon = UserRound

export const LinkIcon: React.FC<IconProps> = ({ className = 'right-3 top-3 h-5 w-5 text-gray-600 dark:text-gray-300', ...props }) => {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" {...props}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m10 13 4-4m-6 7-1 1a3.54 3.54 0 0 1-5-5l4-4a3.54 3.54 0 0 1 5 0m2 8a3.54 3.54 0 0 0 5 0l4-4a3.54 3.54 0 0 0-5-5l-1 1"
            />
        </svg>
    )
}
