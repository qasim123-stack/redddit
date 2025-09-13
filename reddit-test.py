import praw

# Fill these with your details
client_id = "2Qxpf5cew5Cg4pkw3eiP5g"
client_secret = "26Oc357AwvkDF0We8uOQRoFiXH4wHA"
user_agent = "qasim-scrapper"

# Authenticate
reddit = praw.Reddit(
    client_id=client_id,
    client_secret=client_secret,
    user_agent=user_agent
)

# Example: Get top 5 posts from r/Python
subreddit = reddit.subreddit("Python")

print("Top 5 posts in r/Python:")
for post in subreddit.hot(limit=5):
    print(f"{post.title} (score: {post.score})")
