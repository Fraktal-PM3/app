'use client';

import Link from 'next/link';
import React from 'react';
import { TransportTimeline, Stage } from '@/components/TransportTimeline';
import { Clock, Package, Flag, CheckCircle2 } from 'lucide-react';

// Map blockchain status to stage keys
const STATUS_TO_STAGE: Record<string, string> = {
  'pending': 'waiting_pickup',
  'picked_up': 'picked_up',
  'delivered': 'arrived_destination',
  'succeeded': 'completed',
};

export default function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  
  const STAGES: Stage[] = [
    { key: 'waiting_pickup', label: 'Waiting for pickup', icon: Clock },
    { key: 'picked_up', label: 'Picked up', icon: Package },
    { key: 'arrived_destination', label: 'Reached destination', icon: Flag },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  ];

  const [currentStage, setCurrentStage] = React.useState(STAGES[0].key);
  const [packageData, setPackageData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  React.useEffect(() => {
    const fetchPackageData = async () => {
      try {
        setLoading(true);
        
        //get all packages from MongoDB
        const mongoResponse = await fetch('/api/packages');
        if (!mongoResponse.ok) {
          throw new Error('Failed to fetch packages from MongoDB');
        }
        
        const packages = await mongoResponse.json();
        const targetPackage = packages.find((pkg: any) => pkg.packageID === unwrappedParams.id);
        
        if (!targetPackage) {
          throw new Error('Package not found');
        }
        
        if (targetPackage.externalId) {
          // Fetch blockchain info
          const blockchainResponse = await fetch(`/api/packages/blockchainInfo?externalId=${targetPackage.externalId}`);
          if (!blockchainResponse.ok) {
            throw new Error('Failed to fetch blockchain info');
          }
          
          const blockchainData = await blockchainResponse.json();
          console.log('Fetched blockchain data:', blockchainData);
          
          // Fetch private details
          const detailsResponse = await fetch(`/api/packages/detailsAndPII?externalId=${targetPackage.externalId}`);
          if (!detailsResponse.ok) {
            throw new Error('Failed to fetch package details');
          }
          
          const detailsData = await detailsResponse.json();
          console.log('Fetched private details:', detailsData);
          
          if (blockchainData.success && detailsData.success) {
            // Merge MongoDB, blockchain, and private details
            setPackageData({
              ...targetPackage,
              ...blockchainData.package,
              ...detailsData.package,
            });
            
            // update stage based on blockchain status (always available)
            if (blockchainData.package?.status) {
              const mappedStage = STATUS_TO_STAGE[blockchainData.package.status];
              if (mappedStage) {
                setCurrentStage(mappedStage);
              }
            }
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
                <span>{packageData?.packageDetails?.urgency || 'Not in your hand'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span>
                  {packageData?.packageDetails?.size 
                    ? `${packageData.packageDetails.size.width}x${packageData.packageDetails.size.height}x${packageData.packageDetails.size.depth} cm`
                    : 'Not in your hand'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight:</span>
                <span>{packageData?.packageDetails?.weightKg ? `${packageData.packageDetails.weightKg} kg` : 'Not in your hand'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Delivery Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pickup:</span>
                <span>{packageData?.packageDetails?.pickupLocation?.address || 'Not in your hand'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Drop-off:</span>
                <span>{packageData?.packageDetails?.dropLocation?.address || 'Not in your hand'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reward:</span>
                <span>{packageData?.price ? `${packageData.price} kr` : 'Not in your hand'}</span>
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