"""Reddit monitoring service using PRAW"""

import praw
from datetime import datetime
from typing import Dict, Any, List, Generator
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class RedditMonitor:
    """Service for monitoring Reddit posts and comments"""

    def __init__(self):
        """Initialize Reddit API client"""
        self.reddit = praw.Reddit(
            client_id=settings.REDDIT_CLIENT_ID,
            client_secret=settings.REDDIT_CLIENT_SECRET,
            user_agent=settings.REDDIT_USER_AGENT,
        )
        logger.info(f"Reddit API initialized. Read-only: {self.reddit.read_only}")

    def parse_submission(self, submission) -> Dict[str, Any]:
        """Parse PRAW submission object to dictionary"""
        return {
            "reddit_id": submission.id,
            "title": submission.title,
            "selftext": submission.selftext,
            "url": submission.url,
            "permalink": submission.permalink,
            "author": str(submission.author) if submission.author else "[deleted]",
            "author_fullname": submission.author_fullname if hasattr(submission, 'author_fullname') else None,
            "subreddit": str(submission.subreddit),
            "subreddit_id": submission.subreddit_id,
            "subreddit_subscribers": submission.subreddit_subscribers,
            "score": submission.score,
            "ups": submission.ups,
            "downs": submission.downs,
            "upvote_ratio": submission.upvote_ratio,
            "num_comments": submission.num_comments,
            "is_self": submission.is_self,
            "is_video": submission.is_video,
            "over_18": submission.over_18,
            "spoiler": submission.spoiler,
            "locked": submission.locked,
            "stickied": submission.stickied,
            "created_utc": datetime.fromtimestamp(submission.created_utc),
        }

    def parse_comment(self, comment) -> Dict[str, Any]:
        """Parse PRAW comment object to dictionary"""
        return {
            "reddit_id": comment.id,
            "body": comment.body,
            "body_html": comment.body_html,
            "author": str(comment.author) if comment.author else "[deleted]",
            "author_fullname": comment.author_fullname if hasattr(comment, 'author_fullname') else None,
            "link_id": comment.link_id,
            "parent_id": comment.parent_id,
            "depth": comment.depth if hasattr(comment, 'depth') else 0,
            "subreddit": str(comment.subreddit),
            "subreddit_id": comment.subreddit_id,
            "score": comment.score,
            "ups": comment.ups,
            "downs": comment.downs,
            "controversiality": comment.controversiality,
            "is_submitter": comment.is_submitter,
            "stickied": comment.stickied,
            "locked": comment.locked,
            "distinguished": comment.distinguished,
            "created_utc": datetime.fromtimestamp(comment.created_utc),
        }

    def stream_submissions(self, subreddit_name: str) -> Generator[Dict[str, Any], None, None]:
        """
        Stream new submissions from a subreddit in real-time

        Args:
            subreddit_name: Name of the subreddit to monitor

        Yields:
            Dictionary containing submission data
        """
        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            logger.info(f"Starting submission stream for r/{subreddit_name}")

            for submission in subreddit.stream.submissions(skip_existing=True):
                yield self.parse_submission(submission)

        except Exception as e:
            logger.error(f"Error streaming submissions from r/{subreddit_name}: {e}")
            raise

    def stream_comments(self, subreddit_name: str) -> Generator[Dict[str, Any], None, None]:
        """
        Stream new comments from a subreddit in real-time

        Args:
            subreddit_name: Name of the subreddit to monitor

        Yields:
            Dictionary containing comment data
        """
        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            logger.info(f"Starting comment stream for r/{subreddit_name}")

            for comment in subreddit.stream.comments(skip_existing=True):
                yield self.parse_comment(comment)

        except Exception as e:
            logger.error(f"Error streaming comments from r/{subreddit_name}: {e}")
            raise

    def fetch_hot_posts(self, subreddit_name: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch hot posts from a subreddit

        Args:
            subreddit_name: Name of the subreddit
            limit: Number of posts to fetch

        Returns:
            List of post dictionaries
        """
        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            posts = []

            for submission in subreddit.hot(limit=limit):
                posts.append(self.parse_submission(submission))

            logger.info(f"Fetched {len(posts)} hot posts from r/{subreddit_name}")
            return posts

        except Exception as e:
            logger.error(f"Error fetching hot posts from r/{subreddit_name}: {e}")
            raise

    def fetch_post_with_comments(self, post_id: str) -> Dict[str, Any]:
        """
        Fetch a specific post with all its comments

        Args:
            post_id: Reddit post ID

        Returns:
            Dictionary containing post and comments
        """
        try:
            submission = self.reddit.submission(id=post_id)
            submission.comments.replace_more(limit=None)  # Expand all "load more" comments

            post_data = self.parse_submission(submission)
            comments_data = []

            for comment in submission.comments.list():
                comments_data.append(self.parse_comment(comment))

            logger.info(f"Fetched post {post_id} with {len(comments_data)} comments")

            return {
                "post": post_data,
                "comments": comments_data
            }

        except Exception as e:
            logger.error(f"Error fetching post {post_id}: {e}")
            raise
