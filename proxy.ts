import { NextResponse, type NextRequest } from 'next/server'

// Next's route matcher attempts to decode an already-decoded literal percent
// and returns 500 for paths containing %25. Percent signs are outside the blog
// slug contract, so reject those requests before App Router matching.
export function proxy(request: NextRequest) {
    if (/%25/i.test(new URL(request.url).pathname)) {
        return new NextResponse(null, { status: 404 })
    }
    return NextResponse.next()
}
