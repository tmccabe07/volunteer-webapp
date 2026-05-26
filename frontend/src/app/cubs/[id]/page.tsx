'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import ChildScoutProfile from '@/components/child/ChildScoutProfile';
import { childScoutService, type ChildScoutDetail } from '@/services/childScout.service';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChildDetailPageProps {
	params: Promise<{ id: string }>;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
	if (typeof error === 'object' && error !== null && 'response' in error) {
		const maybeResponse = (error as {
			response?: {
				status?: number;
				data?: { error?: string };
			};
		}).response;

		if (maybeResponse?.status === 404) {
			return 'Child scout not found';
		}

		if (maybeResponse?.status === 403) {
			return 'You do not have permission to view this child scout';
		}

		if (maybeResponse?.data?.error) {
			return maybeResponse.data.error;
		}
	}

	return fallback;
}

export default function ChildDetailPage({ params }: ChildDetailPageProps) {
	const router = useRouter();
	const { user, isLoading: authLoading } = useAuth();
	const [child, setChild] = useState<ChildScoutDetail | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [childId, setChildId] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [attendanceHistory, setAttendanceHistory] = useState<Array<{
		event: { id: string; title: string; eventDate: string };
		attendanceStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
		coveredRequirements: Array<{ id: string; adventureName: string; requirementText: string }>;
		notes?: string | null;
	}>>([]);

	useEffect(() => {
		params.then(p => setChildId(p.id));
	}, [params]);

	const loadChild = useCallback(async () => {
		if (!childId) return;

		try {
			setIsLoading(true);
			setError(null);
			const [childData, attendanceData] = await Promise.all([
				childScoutService.getChildScout(childId),
				childScoutService.getChildAttendance(childId),
			]);
			setChild(childData);
			setAttendanceHistory(attendanceData.attendance || []);
		} catch (err: unknown) {
			setError(getApiErrorMessage(err, 'Failed to load child scout'));
		} finally {
			setIsLoading(false);
		}
	}, [childId]);

	useEffect(() => {
		if (!authLoading && !user) {
			router.push('/auth/login');
			return;
		}

		if (user && childId) {
			loadChild();
		}
	}, [user, authLoading, childId, router, loadChild]);

	const handleDelete = async () => {
		if (!child || !isAdmin) return;

		const confirmed = window.confirm(
			`Delete Cub Scout record for ${child.firstName} ${child.lastName}? This cannot be undone.`
		);
		if (!confirmed) return;

		try {
			setIsDeleting(true);
			setError(null);
			await childScoutService.deleteChildScout(child.id);
			router.push('/cubs');
		} catch (err: unknown) {
			setError(getApiErrorMessage(err, 'Failed to delete Cub Scout'));
		} finally {
			setIsDeleting(false);
		}
	};

	if (authLoading || isLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<p>Loading...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto px-4 py-8">
				<Card className="p-6 bg-red-50 border-red-200">
					<p className="text-red-800">{error}</p>
					<div className="mt-4 flex gap-2">
						<Button onClick={() => router.push('/cubs')} variant="outline">
							Back to Cub Scouts
						</Button>
						{error !== 'Child scout not found' && (
							<Button onClick={loadChild}>Try Again</Button>
						)}
					</div>
				</Card>
			</div>
		);
	}

	if (!child) {
		return null;
	}

	const isAdmin = user?.authTier === 'ADMIN';
	const isParentWithLink = child.parentLinks.some(
		link => link.status === 'APPROVED' && user?.id === link.parentEmail
	);
	const canEdit = isAdmin || isParentWithLink;

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-6">
				<div className="flex items-center gap-4 mb-4">
					<Link href="/cubs">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to List
						</Button>
					</Link>
				</div>

				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold">
						{child.firstName} {child.lastName}
					</h1>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => router.push(`/cubs/${child.id}/advancement`)}>
							View Advancement
						</Button>
						{canEdit && (
							<Button variant="outline" onClick={() => router.push(`/cubs/${child.id}/edit`)}>
								<Edit className="h-4 w-4 mr-2" />
								Edit Profile
							</Button>
						)}
						{isAdmin && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleDelete}
								disabled={isDeleting}
								className="border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
							>
								<Trash2 className="h-4 w-4 mr-2" />
								{isDeleting ? 'Removing...' : 'Remove'}
							</Button>
						)}
					</div>
				</div>
			</div>

			<ChildScoutProfile child={child} />

			<Card className="mt-6 p-6">
				<h2 className="text-xl font-semibold mb-4">Attendance History</h2>
				{attendanceHistory.length === 0 ? (
					<p className="text-sm text-gray-600">No attendance has been recorded for this Cub Scout yet.</p>
				) : (
					<div className="space-y-3">
						{attendanceHistory.map((entry, idx) => (
							<div key={`${entry.event.id}-${idx}`} className="border rounded-md p-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<Link href={`/events/${entry.event.id}`} className="font-medium hover:underline">
										{entry.event.title}
									</Link>
									<Badge
										variant="outline"
										className={
											entry.attendanceStatus === 'PRESENT'
												? 'border-green-300 text-green-700'
												: entry.attendanceStatus === 'ABSENT'
												? 'border-red-300 text-red-700'
												: 'border-amber-300 text-amber-700'
										}
									>
										{entry.attendanceStatus}
									</Badge>
								</div>
								<p className="text-xs text-gray-600 mt-1">
									{new Date(entry.event.eventDate).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'short',
										day: 'numeric',
									})}
								</p>
								{entry.coveredRequirements.length > 0 && (
									<p className="text-xs text-gray-600 mt-2">
										Requirements covered: {entry.coveredRequirements.length}
									</p>
								)}
								{entry.notes && (
									<p className="text-xs text-gray-600 mt-1">Notes: {entry.notes}</p>
								)}
							</div>
						))}
					</div>
				)}
			</Card>
		</div>
	);
}
