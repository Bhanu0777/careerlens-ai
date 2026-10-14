import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFitBadge(score: number): { label: string; className: string; color: string } {
  if (score >= 90) return { label: 'APPLY FIRST', className: 'badge-apply-first', color: '#34d399' }
  if (score >= 75) return { label: 'GOOD MATCH', className: 'badge-good-match', color: '#818cf8' }
  if (score >= 60) return { label: 'STRETCH', className: 'badge-stretch', color: '#fbbf24' }
  return { label: 'LOW FIT', className: 'badge-low-fit', color: '#94a3b8' }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 65) return '#6366f1'
  if (score >= 50) return '#f59e0b'
  return '#f43f5e'
}

export function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 3600) return `${Math.round(diff / 60)} mins ago`
  if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`
  return `${Math.round(diff / 86400)} days ago`
}
