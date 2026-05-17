'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchInput({ placeholder = 'Rechercher…' }: { placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = ref.current?.value.trim()
    router.push(q ? `/catalogue?q=${encodeURIComponent(q)}` : '/catalogue')
  }

  return (
    <form onSubmit={handleSubmit} className="sb-wrap" style={{ display: 'contents' }}>
      <div className="sb-wrap">
        <span className="sb-icon">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input ref={ref} className="search-in" placeholder={placeholder} />
      </div>
    </form>
  )
}
