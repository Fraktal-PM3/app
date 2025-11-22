'use client';

import Link from 'next/link';
import React from 'react';
import { TransportTimeline, Stage } from '@/components/TransportTimeline';
import { Clock, Package, Flag, CheckCircle2 } from 'lucide-react';

export default function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  
  // Define demo stages
  const STAGES: Stage[] = [
    { key: 'waiting_pickup', label: 'Waiting for pickup', icon: Clock },
    { key: 'picked_up', label: 'Picked up', icon: Package },
    { key: 'arrived_destination', label: 'Reached destination', icon: Flag },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  ];

  // Local state for demo progression and data
  const [currentStage, setCurrentStage] = React.useState(STAGES[0].key);
  const [packageData, setPackageData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  // Fetch package data on mount
  React.useEffect(() => {
    const fetchPackageData = async () => {
      try {
        setLoading(true);
        
        // First, get all packages from MongoDB to find the one with matching packageID
        const mongoResponse = await fetch('/api/packages');
        if (!mongoResponse.ok) {
          throw new Error('Failed to fetch packages from MongoDB');
        }
        
        const packages = await mongoResponse.json();
        const targetPackage = packages.find((pkg: any) => pkg.packageID === unwrappedParams.id);
        
        if (!targetPackage) {
          throw new Error('Package not found');
        }
        
        //externalId exists, fetch detailed info from blockchain
        if (targetPackage.externalId) {
          const infoResponse = await fetch(`/api/packages/getInfo?externalId=${targetPackage.externalId}`);
          if (!infoResponse.ok) {
            throw new Error('Failed to fetch package details');
          }
          
          const infoData = await infoResponse.json();
          console.log('Fetched package info data:', infoData);
          if (infoData.success) {
            setPackageData({ ...targetPackage, ...infoData.package });
          } else {
            setPackageData(targetPackage);
          }
        } else {
          // no externalId, throw error
          throw new Error('Package has no external ID');
        }
      } catch (err: any) {
        console.error('Error fetching package data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPackageData();
  }, [unwrappedParams.id]);

  const nextStage = () => {
    if (currentIndex < STAGES.length - 1) setCurrentStage(STAGES[currentIndex + 1].key);
  };

  const prevStage = () => {
    if (currentIndex > 0) setCurrentStage(STAGES[currentIndex - 1].key);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <p className="text-center">Loading package details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <p className="text-center text-red-500">Error: {error}</p>
        <Link href="/dashboard" className="block text-center mt-4 text-blue-500 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
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
      {/* --- Transport Timeline Demo Section (BOTTOM) --- */}
        <div className="text-center">
          <p className="text-xl font-semibold mb-6">
            Package detail page for ID: {unwrappedParams.id}
          </p>
         

          <div className="flex flex-col items-center gap-7 mb-10">
            <TransportTimeline
              stages={STAGES}
              currentKey={currentStage}
              onStageChange={setCurrentStage}
            />
          </div>
        </div>
      {/* Package Overview */}
      <div className="space-y-  8 mt-10">
        {/* Package Info + Delivery Info */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Package Information</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>{packageData?.packageDetails?.urgency || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span>
                  {packageData?.packageDetails?.size 
                    ? `${packageData.packageDetails.size.width}x${packageData.packageDetails.size.height}x${packageData.packageDetails.size.depth} cm`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight:</span>
                <span>{packageData?.packageDetails?.weightKg ? `${packageData.packageDetails.weightKg} kg` : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Delivery Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pickup:</span>
                <span>{packageData?.packageDetails?.pickupLocation?.address || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Drop-off:</span>
                <span>{packageData?.packageDetails?.dropLocation?.address || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reward:</span>
                <span>{packageData?.price ? `${packageData.price} units` : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={prevStage}
                className="px-4 py-2 bg-transparent border rounded-lg hover:bg-gray-100"
              >
                Back
              </button>
              <button
                onClick={nextStage}
                className="px-4 py-2 bg-transparent border rounded-lg hover:opacity-90"
              >
                Next
              </button>
            </div>
      </div>
    </div>
  );
}