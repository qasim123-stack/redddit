# PRAW (Python Reddit API Wrapper) - Complete Endpoints Reference

## Overview
This document provides a comprehensive list of all PRAW endpoints for building a Reddit database. PRAW is organized around object-oriented models that map to Reddit's API endpoints.

---

## 1. Reddit Instance (Main Entry Point)

### Authentication & Basic Info
- `reddit.read_only` - Check if instance is read-only
- `reddit.user.me()` - Get authenticated user information

### Core Object Access
- `reddit.comment(id)` - Get a comment by ID
- `reddit.submission(id)` or `reddit.submission(url)` - Get a submission by ID or URL
- `reddit.redditor(name)` or `reddit.redditor(fullname)` - Get a redditor
- `reddit.subreddit(display_name)` - Get a subreddit
- `reddit.multireddit(redditor, name)` - Get a multireddit
- `reddit.domain(domain)` - Get domain-specific submissions
- `reddit.info(fullnames, subreddits, url)` - Batch fetch objects

### Inbox & Messages
- `reddit.inbox.all()` - All inbox items
- `reddit.inbox.unread()` - Unread messages
- `reddit.inbox.messages()` - Direct messages
- `reddit.inbox.comment_replies()` - Comment replies
- `reddit.inbox.submission_replies()` - Submission replies
- `reddit.inbox.mentions()` - Username mentions
- `reddit.inbox.sent()` - Sent messages
- `reddit.inbox.mark_read(items)` - Mark as read
- `reddit.inbox.mark_unread(items)` - Mark as unread

### Discovery Helpers
- `reddit.subreddits.default()` - Default subreddits
- `reddit.subreddits.gold()` - Gold/Premium subreddits
- `reddit.subreddits.new()` - Newest subreddits
- `reddit.subreddits.popular()` - Popular subreddits
- `reddit.subreddits.search(query)` - Search subreddits
- `reddit.redditors.new()` - Newest redditors
- `reddit.redditors.popular()` - Popular redditors
- `reddit.redditors.search(query)` - Search redditors

### User Profile
- `reddit.user.me()` - Current user info
- `reddit.user.karma()` - Karma breakdown
- `reddit.user.preferences()` - User preferences
- `reddit.user.subreddits()` - Subscribed subreddits
- `reddit.user.friends()` - Friends list
- `reddit.user.blocked()` - Blocked users
- `reddit.user.multireddits()` - User's multireddits

---

## 2. Subreddit Endpoints

### Basic Subreddit Info
- `subreddit.display_name` - Subreddit name
- `subreddit.title` - Subreddit title
- `subreddit.description` - Description
- `subreddit.public_description` - Public description
- `subreddit.subscribers` - Subscriber count
- `subreddit.active_user_count` - Active users
- `subreddit.created_utc` - Creation timestamp
- `subreddit.over18` - NSFW flag
- `subreddit.quarantine` - Quarantine status

### Submission Listings (Support time_filter and limit)
- `subreddit.hot(limit)` - Hot posts
- `subreddit.new(limit)` - New posts
- `subreddit.rising(limit)` - Rising posts
- `subreddit.top(time_filter, limit)` - Top posts (hour/day/week/month/year/all)
- `subreddit.controversial(time_filter, limit)` - Controversial posts
- `subreddit.gilded(limit)` - Gilded posts
- `subreddit.random()` - Random submission
- `subreddit.random_rising(limit)` - Random rising posts

### Comments & Discussions
- `subreddit.comments(limit)` - All comments stream
- `subreddit.stream.submissions()` - Real-time submission stream
- `subreddit.stream.comments()` - Real-time comment stream

### Search
- `subreddit.search(query, sort, time_filter, limit)` - Search within subreddit

### Subreddit Wiki
- `subreddit.wiki` - Wiki access
- `subreddit.wiki.page(name)` - Get wiki page
- `subreddit.wiki[page_name]` - Alternative wiki access

### Moderation (Requires Permissions)
- `subreddit.moderator()` - List of moderators
- `subreddit.mod.log(limit, action, mod)` - Moderation log
- `subreddit.mod.reports(limit)` - Reported items
- `subreddit.mod.spam(limit)` - Spam queue
- `subreddit.mod.edited(limit)` - Edited items
- `subreddit.mod.unmoderated(limit)` - Unmoderated items
- `subreddit.mod.modqueue(limit)` - Moderation queue
- `subreddit.mod.inbox()` - Modmail inbox
- `subreddit.mod.unread()` - Unread modmail
- `subreddit.mod.settings()` - Subreddit settings

### Flair
- `subreddit.flair()` - List all user flair
- `subreddit.flair.templates` - Flair templates
- `subreddit.flair.link_templates` - Link flair templates

### Relationships
- `subreddit.banned()` - Banned users
- `subreddit.contributor()` - Approved users
- `subreddit.moderator()` - Moderator list
- `subreddit.muted()` - Muted users
- `subreddit.wikiban()` - Wiki banned users
- `subreddit.wikicontributor()` - Wiki contributors

### Collections
- `subreddit.collections()` - All collections
- `subreddit.collections(collection_id)` - Specific collection

### Emoji & Styling
- `subreddit.emoji` - Subreddit emoji
- `subreddit.stylesheet()` - Subreddit stylesheet
- `subreddit.widgets` - Widget configuration

### Filters
- `subreddit.filters()` - Subreddit filters

---

## 3. Submission (Post) Endpoints

### Basic Submission Info
- `submission.id` - Submission ID
- `submission.title` - Post title
- `submission.selftext` - Text content
- `submission.url` - Link URL
- `submission.author` - Author (Redditor object)
- `submission.subreddit` - Subreddit (Subreddit object)
- `submission.score` - Current score
- `submission.upvote_ratio` - Upvote ratio
- `submission.num_comments` - Comment count
- `submission.created_utc` - Creation timestamp
- `submission.edited` - Edit timestamp
- `submission.is_self` - Is self post
- `submission.is_video` - Is video post
- `submission.over_18` - NSFW flag
- `submission.spoiler` - Spoiler flag
- `submission.stickied` - Stickied status
- `submission.locked` - Locked status
- `submission.distinguished` - Distinguished by mod/admin
- `submission.gilded` - Gold count
- `submission.permalink` - Permalink to submission
- `submission.shortlink` - Short URL

### Comments
- `submission.comments` - CommentForest object
- `submission.comments.replace_more(limit)` - Load more comments
- `submission.comments.list()` - Flatten comment tree
- `submission.comment_sort` - Set comment sort order

### Interactions (Requires Authentication)
- `submission.upvote()` - Upvote
- `submission.downvote()` - Downvote
- `submission.clear_vote()` - Remove vote
- `submission.save()` - Save post
- `submission.unsave()` - Unsave post
- `submission.hide()` - Hide post
- `submission.unhide()` - Unhide post
- `submission.reply(body)` - Add comment
- `submission.edit(body)` - Edit self post
- `submission.delete()` - Delete post
- `submission.mark_visited()` - Mark as visited

### Moderation
- `submission.mod.approve()` - Approve submission
- `submission.mod.remove()` - Remove submission
- `submission.mod.distinguish()` - Distinguish as mod
- `submission.mod.undistinguish()` - Remove distinction
- `submission.mod.sticky()` - Sticky submission
- `submission.mod.ignore_reports()` - Ignore reports
- `submission.mod.lock()` - Lock comments
- `submission.mod.unlock()` - Unlock comments
- `submission.mod.nsfw()` - Mark NSFW
- `submission.mod.sfw()` - Mark SFW
- `submission.mod.spoiler()` - Mark spoiler
- `submission.mod.unspoiler()` - Remove spoiler
- `submission.mod.contest_mode()` - Enable contest mode
- `submission.mod.suggested_sort()` - Set suggested sort

### Awards & Gilding
- `submission.gild()` - Give gold (deprecated)
- `submission.award()` - Give award

---

## 4. Comment Endpoints

### Basic Comment Info
- `comment.id` - Comment ID
- `comment.body` - Comment text
- `comment.body_html` - HTML version
- `comment.author` - Author (Redditor object)
- `comment.subreddit` - Subreddit (Subreddit object)
- `comment.submission` - Parent submission
- `comment.score` - Current score
- `comment.created_utc` - Creation timestamp
- `comment.edited` - Edit timestamp
- `comment.is_submitter` - Is OP
- `comment.distinguished` - Distinguished by mod/admin
- `comment.stickied` - Stickied status
- `comment.gilded` - Gold count
- `comment.permalink` - Permalink to comment
- `comment.depth` - Comment depth in tree

### Relationships
- `comment.parent()` - Parent comment or submission
- `comment.replies` - Replies (CommentForest)
- `comment.reply_sort` - Set reply sort order
- `comment.reply_limit` - Set reply limit
- `comment.refresh()` - Reload comment with replies

### Interactions (Requires Authentication)
- `comment.upvote()` - Upvote
- `comment.downvote()` - Downvote
- `comment.clear_vote()` - Remove vote
- `comment.save()` - Save comment
- `comment.unsave()` - Unsave comment
- `comment.reply(body)` - Reply to comment
- `comment.edit(body)` - Edit comment
- `comment.delete()` - Delete comment

### Moderation
- `comment.mod.approve()` - Approve comment
- `comment.mod.remove()` - Remove comment
- `comment.mod.distinguish()` - Distinguish as mod
- `comment.mod.undistinguish()` - Remove distinction
- `comment.mod.ignore_reports()` - Ignore reports
- `comment.mod.lock()` - Lock comment
- `comment.mod.unlock()` - Unlock comment

### Awards
- `comment.gild()` - Give gold (deprecated)
- `comment.award()` - Give award

---

## 5. Redditor (User) Endpoints

### Basic User Info
- `redditor.name` - Username
- `redditor.id` - User ID
- `redditor.created_utc` - Account creation date
- `redditor.comment_karma` - Comment karma
- `redditor.link_karma` - Link karma
- `redditor.is_employee` - Reddit employee flag
- `redditor.is_mod` - Moderator flag
- `redditor.is_gold` - Premium status
- `redditor.verified` - Verified email
- `redditor.has_verified_email` - Email verification
- `redditor.icon_img` - Profile image URL

### User Content Listings
- `redditor.submissions.new(limit)` - New submissions
- `redditor.submissions.hot(limit)` - Hot submissions
- `redditor.submissions.top(time_filter, limit)` - Top submissions
- `redditor.submissions.controversial(time_filter, limit)` - Controversial submissions
- `redditor.comments.new(limit)` - New comments
- `redditor.comments.hot(limit)` - Hot comments
- `redditor.comments.top(time_filter, limit)` - Top comments
- `redditor.comments.controversial(time_filter, limit)` - Controversial comments
- `redditor.gilded(limit)` - Gilded posts
- `redditor.upvoted(limit)` - Upvoted posts (own account only)
- `redditor.downvoted(limit)` - Downvoted posts (own account only)
- `redditor.hidden(limit)` - Hidden posts (own account only)
- `redditor.saved(limit)` - Saved posts (own account only)

### Subreddit Relationships
- `redditor.moderated()` - Moderated subreddits
- `redditor.multireddits()` - User's multireddits
- `redditor.subreddits()` - Subscribed subreddits (own account only)

### Interactions (Requires Authentication)
- `redditor.message(subject, message)` - Send message
- `redditor.friend()` - Add as friend
- `redditor.unfriend()` - Remove friend
- `redditor.friend_info()` - Get friend info
- `redditor.block()` - Block user
- `redditor.unblock()` - Unblock user

### Trophies
- `redditor.trophies()` - User trophies

### Moderation Notes
- `redditor.notes` - Mod notes (if moderator)

### Streams
- `redditor.stream.submissions()` - Real-time submission stream
- `redditor.stream.comments()` - Real-time comment stream

---

## 6. Multireddit Endpoints

### Basic Multireddit Info
- `multireddit.name` - Multireddit name
- `multireddit.display_name` - Display name
- `multireddit.description_md` - Description
- `multireddit.subreddits` - List of subreddits
- `multireddit.visibility` - Public/private
- `multireddit.path` - URL path
- `multireddit.created_utc` - Creation timestamp

### Content Listings
- `multireddit.hot(limit)` - Hot posts
- `multireddit.new(limit)` - New posts
- `multireddit.rising(limit)` - Rising posts
- `multireddit.top(time_filter, limit)` - Top posts
- `multireddit.controversial(time_filter, limit)` - Controversial posts
- `multireddit.gilded(limit)` - Gilded posts
- `multireddit.comments(limit)` - All comments
- `multireddit.random()` - Random submission

### Search
- `multireddit.search(query, sort, time_filter, limit)` - Search within multireddit

### Management (Requires Authentication)
- `multireddit.add(subreddit)` - Add subreddit
- `multireddit.remove(subreddit)` - Remove subreddit
- `multireddit.update()` - Update multireddit
- `multireddit.delete()` - Delete multireddit
- `multireddit.copy()` - Copy multireddit

---

## 7. Message Endpoints

### Basic Message Info
- `message.id` - Message ID
- `message.subject` - Message subject
- `message.body` - Message body
- `message.author` - Sender (Redditor object)
- `message.dest` - Recipient
- `message.created_utc` - Creation timestamp
- `message.new` - Unread flag
- `message.distinguished` - Distinguished status
- `message.parent_id` - Parent message ID

### Interactions
- `message.reply(body)` - Reply to message
- `message.mark_read()` - Mark as read
- `message.mark_unread()` - Mark as unread
- `message.delete()` - Delete message

### Modmail Specific
- `message.mute()` - Mute sender (modmail)
- `message.unmute()` - Unmute sender (modmail)

---

## 8. WikiPage Endpoints

### Basic Wiki Info
- `wikipage.name` - Page name
- `wikipage.content_md` - Markdown content
- `wikipage.content_html` - HTML content
- `wikipage.revision_by` - Last editor
- `wikipage.revision_date` - Last edit date

### Management (Requires Permissions)
- `wikipage.edit(content, reason)` - Edit page
- `wikipage.discussions(limit)` - Page discussions
- `wikipage.revisions(limit)` - Page revisions

---

## 9. LiveThread Endpoints

### Basic LiveThread Info
- `livethread.id` - Thread ID
- `livethread.title` - Thread title
- `livethread.description` - Description
- `livethread.state` - Thread state
- `livethread.created_utc` - Creation timestamp

### Updates
- `livethread.updates(limit)` - Get updates
- `livethread.stream.updates()` - Real-time updates

### Management (Requires Permissions)
- `livethread.contribute()` - Request contributor status
- `livethread.contributors()` - List contributors

---

## 10. Modmail (New System) Endpoints

### Conversations
- `reddit.subreddit(name).modmail.conversations()` - List conversations
- `reddit.subreddit(name).modmail.conversation(id)` - Get specific conversation
- `reddit.subreddit(name).modmail.create(subject, body, recipient)` - Create conversation

### Conversation Actions
- `conversation.archive()` - Archive conversation
- `conversation.unarchive()` - Unarchive conversation
- `conversation.highlight()` - Highlight conversation
- `conversation.unhighlight()` - Remove highlight
- `conversation.mute()` - Mute participant
- `conversation.unmute()` - Unmute participant
- `conversation.reply(body)` - Reply to conversation

---

## 11. Draft Endpoints

### Draft Management
- `reddit.drafts()` - List all drafts
- `reddit.drafts.create()` - Create draft
- `draft.submit()` - Submit draft
- `draft.update()` - Update draft
- `draft.delete()` - Delete draft

---

## 12. Special Subreddit Combinations

### Combined Subreddits
- `reddit.subreddit("sub1+sub2+sub3")` - Multiple subreddits
- `reddit.subreddit("all")` - All subreddits
- `reddit.subreddit("popular")` - Popular content
- `reddit.subreddit("friends")` - Friend posts

### Filtered Subreddits
- `reddit.subreddit("all-sub1-sub2")` - Exclude subreddits from r/all

---

## 13. Domain Endpoints

### Domain-Specific Content
- `reddit.domain(domain).hot(limit)` - Hot posts from domain
- `reddit.domain(domain).new(limit)` - New posts from domain
- `reddit.domain(domain).rising(limit)` - Rising posts from domain
- `reddit.domain(domain).top(time_filter, limit)` - Top posts from domain
- `reddit.domain(domain).controversial(time_filter, limit)` - Controversial posts

---

## 14. Front Page Endpoints

### Personal Front Page
- `reddit.front.hot(limit)` - Hot posts on front page
- `reddit.front.new(limit)` - New posts on front page
- `reddit.front.rising(limit)` - Rising posts on front page
- `reddit.front.top(time_filter, limit)` - Top posts on front page
- `reddit.front.controversial(time_filter, limit)` - Controversial posts
- `reddit.front.gilded(limit)` - Gilded posts

---

## 15. Streaming Endpoints

All streaming endpoints provide real-time access to new content:

### Submission Streams
- `subreddit.stream.submissions()` - New submissions
- `reddit.subreddit("all").stream.submissions()` - All Reddit submissions
- `redditor.stream.submissions()` - User submissions

### Comment Streams
- `subreddit.stream.comments()` - New comments
- `reddit.subreddit("all").stream.comments()` - All Reddit comments
- `redditor.stream.comments()` - User comments

---

## 16. Rate Limiting & Batch Operations

### Rate Limit Info
- Reddit API: 60 requests per minute
- PRAW automatically handles rate limiting

### Batch Operations
- `reddit.info(fullnames=[...])` - Batch fetch up to 100 items
- Use generators with `limit=None` for pagination

---

## 17. Common Listing Parameters

Most listing methods support these parameters:
- `limit` - Number of items (max 100 per request, None for all)
- `time_filter` - "hour", "day", "week", "month", "year", "all"
- `sort` - "hot", "new", "rising", "top", "controversial"
- `after` - Pagination cursor (fullname)
- `before` - Pagination cursor (fullname)

---

## 18. Authentication Types

### Read-Only (No Login)
```python
reddit = praw.Reddit(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
    user_agent="YOUR_USER_AGENT"
)
```

### Script/Personal Use (Full Access)
```python
reddit = praw.Reddit(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
    user_agent="YOUR_USER_AGENT",
    username="YOUR_USERNAME",
    password="YOUR_PASSWORD"
)
```

### Web Application (OAuth)
Uses refresh tokens and authorization codes

---

## 19. Object Fullnames

Reddit uses fullnames for object identification:
- `t1_` - Comment
- `t2_` - Redditor
- `t3_` - Submission
- `t4_` - Message
- `t5_` - Subreddit
- `t6_` - Award

---

## 20. Collections

### Subreddit Collections
- `subreddit.collections()` - List all collections
- `subreddit.collections(collection_id)` - Get specific collection
- `collection.follow()` - Follow collection
- `collection.unfollow()` - Unfollow collection

### Collection Items
- `collection.reorder(ids)` - Reorder items
- `collection.mod.add_post(submission)` - Add post
- `collection.mod.remove_post(submission)` - Remove post

---

## Database Schema Recommendations

### Core Tables
1. **subreddits** - Store subreddit metadata
2. **submissions** - Store all posts
3. **comments** - Store all comments (with parent relationships)
4. **redditors** - Store user information
5. **messages** - Store messages and modmail
6. **relationships** - Store user-user/user-sub relationships
7. **moderation_actions** - Store mod log entries
8. **awards** - Store award information
9. **wiki_pages** - Store wiki content
10. **collections** - Store collection data

### Key Relationships
- Submissions → Subreddit (many-to-one)
- Comments → Submission (many-to-one)
- Comments → Comment (parent, self-referential)
- Comments → Redditor (many-to-one)
- Submissions → Redditor (many-to-one)

---

## Useful Patterns for Database Building

### Pagination Pattern
```python
for submission in subreddit.new(limit=None):
    # Process and store submission
    store_submission(submission)
```

### Comment Tree Traversal
```python
submission.comments.replace_more(limit=0)
for comment in submission.comments.list():
    # Process each comment in flattened tree
    store_comment(comment)
```

### Rate Limit Handling
PRAW automatically handles rate limits, but you can monitor:
```python
import time
# PRAW will automatically sleep when necessary
```

### Error Handling
```python
from prawcore.exceptions import ResponseException, RequestException

try:
    # Your API calls
except ResponseException as e:
    # Handle HTTP errors
except RequestException as e:
    # Handle network errors
```

---

## Notes
- All listing methods return generators for memory efficiency
- Use `limit=None` to retrieve all available items (be careful with rate limits)
- Most objects are "lazy" - data is only fetched when accessed
- Call `.refresh()` on objects to update their data
- Use `vars(object)` to see all available attributes

## Documentation
Official PRAW documentation: https://praw.readthedocs.io/
Reddit API documentation: https://www.reddit.com/dev/api/

---

*Last Updated: November 2025*
*PRAW Version: 7.7+*
