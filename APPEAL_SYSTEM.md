# Appeal System Documentation

## Overview
The appeal system allows banned users to request an unban by submitting an appeal with their reasoning. Admins can then review and approve or deny these appeals.

## User Commands

### `/appeal [reason]`
**For banned users only**
- Submit a ban appeal with reasoning
- Must provide at least 10 characters of text
- Maximum 500 characters
- Can only have one pending appeal at a time

**Example:**
```
/appeal I was banned by mistake. I was not spamming, just trying to help other users find matches. I promise to follow all community guidelines.
```

**Features:**
- ✅ Automatic validation (length, banned status check)
- ✅ Prevents duplicate appeals
- ✅ Notifies admins immediately
- ✅ Provides clear feedback to user

## Admin Commands

### `/appeals`
**Admin only**
- Lists all appeals (pending and reviewed)
- Shows appeal text preview
- Displays submission dates
- Grouped by status for easy review

### `/approve [USER_ID]`
**Admin only**
- Approves a pending appeal
- Automatically unbans the user
- Notifies user of approval
- Records review details

**Example:**
```
/approve 123456789
```

### `/deny [USER_ID] [reason]`
**Admin only**
- Denies a pending appeal
- Requires reason for denial
- Notifies user with reason
- User can appeal again after 7 days

**Example:**
```
/deny 123456789 Appeal does not provide sufficient justification for the violation
```

## Admin Panel Integration

The appeal system is integrated into the main admin panel (`/admin`):

```
⚖️ Appeal Management:
• /appeals - List pending appeals
• /approve USER_ID - Approve ban appeal
• /deny USER_ID reason - Deny ban appeal
```

## Appeal Workflow

1. **User Submits Appeal**
   - User runs `/appeal [reason]`
   - System validates appeal
   - Admin receives notification

2. **Admin Reviews**
   - Admin checks `/appeals` for pending reviews
   - Can view user details with `/user USER_ID`
   - Makes decision: approve or deny

3. **Decision Notification**
   - User receives notification of decision
   - If approved: account restored, can use bot normally
   - If denied: ban remains, can appeal again in 7 days

## Database Schema

New fields added to user profiles:
- `appealText` - The appeal message
- `appealedAt` - When appeal was submitted
- `appealStatus` - 'pending', 'approved', or 'denied'
- `appealReviewedBy` - Admin ID who reviewed
- `appealReviewedAt` - When appeal was reviewed
- `appealDenyReason` - Reason for denial (if denied)

## Security Features

- ✅ Appeals only available to banned users
- ✅ One appeal per user at a time
- ✅ Admin-only review commands
- ✅ All actions logged with timestamps
- ✅ Automatic user notifications
- ✅ Ban history preserved

## Usage Examples

### For Banned Users:
```
/appeal I believe I was banned unfairly. I was only trying to help new users understand how the bot works. I had no intention of spamming and will be more careful with my messages in the future.
```

### For Admins:
```
/appeals                    # View all pending appeals
/user 123456789            # Review user details
/approve 123456789         # Approve the appeal
/deny 123456789 Violation was severe and recent  # Deny with reason
```

## Best Practices

### For Users:
- Be honest and respectful in appeals
- Clearly explain what happened
- Acknowledge any mistakes
- Promise to follow guidelines
- Keep appeals concise but detailed

### For Admins:
- Review user history before deciding
- Provide clear reasons for denials
- Be consistent with decisions
- Consider the severity of original violation
- Monitor appeal patterns for abuse

## Technical Notes

- Appeals are stored in the same user collection
- System supports MongoDB, Redis, and memory storage
- Automatic admin notifications via Telegram
- All timestamps in UTC
- Appeal text limited to 500 characters for performance
