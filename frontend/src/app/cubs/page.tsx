'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import ChildScoutList from '@/components/child/ChildScoutList';
import CreateChildScoutForm from '@/components/child/CreateChildScoutForm';
import { useAuth } from '@/lib/auth-context';

export default function CubsListPage() {
	const router = useRouter();
	const { user, isLoading: authLoading } = useAuth();
	const [showCreateForm, setShowCreateForm] = useState(false);

	useEffect(() => {
		if (!authLoading && !user) {
			router.push('/auth/login');
		}
	}, [user, authLoading, router]);

	if (authLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<p>Loading...</p>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	const isAdmin = user.authTier === 'ADMIN';

	const handleCreateSuccess = (childId: string) => {
		setShowCreateForm(false);
		router.push(`/cubs/${childId}`);
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-6">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold">Cub Scouts</h1>
					{isAdmin && !showCreateForm && (
						<Button onClick={() => setShowCreateForm(true)}>
							<UserPlus className="h-4 w-4 mr-2" />
							Add Cub Scout
						</Button>
					)}
				</div>
				<p className="text-gray-600 mt-2">
					Manage and view information about Cub Scouts in your pack
				</p>
			</div>

			{showCreateForm ? (
				<div className="mb-6">
					<CreateChildScoutForm
						onSuccess={handleCreateSuccess}
						onCancel={() => setShowCreateForm(false)}
					/>
				</div>
			) : (
				<ChildScoutList showFilters={true} />
			)}
		</div>
	);
}
