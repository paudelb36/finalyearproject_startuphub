'use client'

// Generic loading skeleton component
export function LoadingSkeleton({ className = '', children, ...props }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

// Profile card skeleton
export function ProfileCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center space-x-4 mb-4">
        <LoadingSkeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1">
          <LoadingSkeleton className="h-4 w-32 mb-2" />
          <LoadingSkeleton className="h-3 w-24" />
        </div>
      </div>
      <LoadingSkeleton className="h-3 w-full mb-2" />
      <LoadingSkeleton className="h-3 w-3/4 mb-4" />
      <div className="flex space-x-2">
        <LoadingSkeleton className="h-6 w-16 rounded-full" />
        <LoadingSkeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  )
}

// Startup card skeleton
export function StartupCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-start space-x-4 mb-4">
        <LoadingSkeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1">
          <LoadingSkeleton className="h-5 w-40 mb-2" />
          <LoadingSkeleton className="h-3 w-32" />
        </div>
      </div>
      <LoadingSkeleton className="h-3 w-full mb-2" />
      <LoadingSkeleton className="h-3 w-5/6 mb-4" />
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <LoadingSkeleton className="h-5 w-16 rounded-full" />
          <LoadingSkeleton className="h-5 w-20 rounded-full" />
        </div>
        <LoadingSkeleton className="h-8 w-24 rounded" />
      </div>
    </div>
  )
}

// Event card skeleton
export function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-start space-x-4 mb-4">
        <LoadingSkeleton className="w-16 h-16 rounded-lg" />
        <div className="flex-1">
          <LoadingSkeleton className="h-5 w-48 mb-2" />
          <LoadingSkeleton className="h-3 w-32 mb-1" />
          <LoadingSkeleton className="h-3 w-24" />
        </div>
      </div>
      <LoadingSkeleton className="h-3 w-full mb-2" />
      <LoadingSkeleton className="h-3 w-4/5 mb-4" />
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-5 w-20 rounded-full" />
        <LoadingSkeleton className="h-8 w-28 rounded" />
      </div>
    </div>
  )
}

// Dashboard stats skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <LoadingSkeleton className="h-4 w-24 mb-2" />
              <LoadingSkeleton className="h-8 w-16" />
            </div>
            <LoadingSkeleton className="w-12 h-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Recommendation card skeleton
export function RecommendationCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-center space-x-3 mb-3">
        <LoadingSkeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <LoadingSkeleton className="h-4 w-28 mb-1" />
          <LoadingSkeleton className="h-3 w-20" />
        </div>
      </div>
      <LoadingSkeleton className="h-3 w-full mb-2" />
      <LoadingSkeleton className="h-3 w-3/4" />
    </div>
  )
}

// List skeleton (for multiple items)
export function ListSkeleton({ count = 3, ItemSkeleton = ProfileCardSkeleton, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <ItemSkeleton key={i} />
      ))}
    </div>
  )
}

// Grid skeleton (for grid layouts)
export function GridSkeleton({ 
  count = 6, 
  ItemSkeleton = ProfileCardSkeleton, 
  className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <ItemSkeleton key={i} />
      ))}
    </div>
  )
}

// Page loading skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <LoadingSkeleton className="h-8 w-64 mb-6" />
        <LoadingSkeleton className="h-4 w-96 mb-8" />
        <GridSkeleton count={6} />
      </div>
    </div>
  )
}

// Spinner component for inline loading
export function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <div className={`inline-block animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}></div>
  )
}

// Loading overlay
export function LoadingOverlay({ show, children }) {
  if (!show) return children

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    </div>
  )
}