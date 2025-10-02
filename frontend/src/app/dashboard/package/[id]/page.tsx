'use client';

import Link from 'next/link';

export default function PackageDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard"
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Package Content */}
      <div className="space-y-6">
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <div className="text-6xl mb-4">📦</div>
          <h1 className="text-2xl font-bold mb-4">Package Details</h1>
          <p className="text-muted-foreground mb-6">
            Package detail page for ID: {params.id}
          </p>
          <p className="text-sm text-muted-foreground">
            This page will be implemented with detailed package information, 
            tracking details, delivery instructions, and customer contact information.
          </p>
        </div>

        {/* Placeholder sections */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Package Information</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>Coming soon...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span>Coming soon...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight:</span>
                <span>Coming soon...</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Delivery Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distance:</span>
                <span>Coming soon...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reward:</span>
                <span>Coming soon...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deadline:</span>
                <span>Coming soon...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}