'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRequireTier } from '@/lib/auth-context';
import { PackConfigForm, PackConfigData } from '@/components/forms/config/PackConfigForm';
import configService from '@/services/config.service';

export default function AdminConfigPage() {
  const { user, isLoading } = useRequireTier('ADMIN');
  const [packConfig, setPackConfig] = useState<PackConfigData | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!isLoading && user) {
      loadPackConfig();
    }
  }, [isLoading, user]);

  const loadPackConfig = async () => {
    try {
      const config = await configService.getPackConfig();
      setPackConfig(config);
      setError('');
    } catch (err: unknown) {
      console.error('Error loading pack configuration:', err);
      setError('Failed to load pack configuration');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleSubmit = async (data: Partial<PackConfigData>) => {
    try {
      const updated = await configService.updatePackConfig(data);
      setPackConfig(updated);
      setSuccessMessage('Pack configuration updated successfully!');
      setError('');
      
      // Notify other components that config has been updated
      window.dispatchEvent(new CustomEvent('packConfigUpdated'));
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: unknown) {
      throw err; // Let the form handle the error display
    }
  };

  if (isLoading || isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user || !packConfig) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Pack</h1>
          <p className="mt-2 text-gray-600">
            Manage your pack settings and Cub Scout roster in one place.
          </p>
        </div>

        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pack Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage dens, Cub Scouts, volunteer roles, and activity types for your pack.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/dens"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Manage Dens
              </Link>
              <Link
                href="/cubs"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Manage Cub Scouts
              </Link>
              <Link
                href="/admin/roles"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Manage Roles
              </Link>
              <Link
                href="/admin/activities"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Manage Activities
              </Link>
              <Link
                href="/admin/den-chiefs"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Manage Den Chiefs
              </Link>
              <Link
                href="/admin/data-quality"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Data Quality
              </Link>
              <Link
                href="/admin/bulk-operations"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Bulk Operations
              </Link>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <PackConfigForm
            initialData={packConfig}
            onSubmit={handleSubmit}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ℹ️ About Pack Configuration
          </h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              <strong>Pack Name & Number:</strong> Displayed throughout the application header and in reports
            </p>
            <p>
              <strong>Scouting Year Dates:</strong> Defines the active scouting year for point tracking and reporting. 
              Typically runs from September 1st to August 31st.
            </p>
            <p className="text-orange-700 font-medium">
              <strong>⚠️ Important:</strong> Changing the year end date will automatically update all recurring events 
              and administrative tasks to end on the new date.
            </p>
            <p>
              <strong>Active Ranks:</strong> Select which Cub Scout ranks are active in your pack. This affects:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Event creation (which ranks can participate)</li>
              <li>Den leader role assignments</li>
              <li>Reporting and filtering options</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
