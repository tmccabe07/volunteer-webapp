import { ResetPasswordForm } from '@/components/forms/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
