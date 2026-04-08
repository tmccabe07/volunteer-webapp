# Admin-Assisted Password Reset

This feature allows pack administrators to reset passwords for volunteers who have forgotten theirs, without requiring email infrastructure.

## How It Works

### For Pack Administrators

1. **Navigate to Admin Panel**
   - Log in with an ADMIN tier account
   - Go to `/admin/volunteers`

2. **Find the Volunteer**
   - Use the search bar to find the volunteer by name or email
   - Or scroll through the volunteer list

3. **Reset Password**
   - Click the "Reset Password" button next to the volunteer's name
   - Confirm the action
   - A temporary password will be displayed (example: `blue-tiger-4729`)

4. **Share Password**
   - **IMPORTANT**: Copy and share this password with the volunteer immediately
   - This password is only shown once
   - You can share it via text, phone call, or in person

### For Volunteers (After Reset)

1. **Receive Temporary Password**
   - The pack administrator will give you a temporary password
   - It will look like: `word-word-1234`

2. **Log In**
   - Go to the login page
   - Enter your email and the temporary password
   - You'll be automatically redirected to the change password page

3. **Change Password**
   - Enter the temporary password as your "current password"
   - Create a new strong password that meets requirements:
     - At least 8 characters
     - Contains uppercase letter
     - Contains lowercase letter
     - Contains number
     - Contains special character
   - Confirm your new password
   - Click "Change Password"

4. **Success!**
   - You'll be logged out automatically
   - Log in again with your new password
   - Continue using the app normally

## Security Features

- ✅ Temporary passwords are randomly generated (32 bits of entropy)
- ✅ Users are forced to change password on first login
- ✅ Password changes are logged in audit trail
- ✅ Admins cannot reset their own passwords this way (prevents abuse)
- ✅ Old password must be confirmed when changing

## Admin Privileges Required

Only users with `authTier: ADMIN` can access the volunteer management page and reset passwords.

## Alternative Methods

If you prefer, you can still implement email-based password reset later. The infrastructure is already in place - you just need to configure an email service provider (see [`backend/src/api/auth.controller.ts`](c:\\Users\\tmccabe\\OneDrive\\Documents\\Cub Scouts\\volunteer-webapp\\backend\\src\\api\\auth.controller.ts) line 263).
