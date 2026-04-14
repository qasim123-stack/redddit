"""Safe utility to delete all reddit posts and dependent references.

WARNING: This permanently deletes data. Run from project root:

    poetry run python -m scripts.clear_reddit_posts

The script will print counts, ask for confirmation, then perform operations
inside a single transaction. It nulls array columns that may reference post
IDs and deletes `ai_analysis` (FK) before removing `reddit_posts`.
"""

from sqlmodel import Session, text
from app.database import engine


def get_counts(session: Session):
    counts = {}
    counts['reddit_posts'] = session.exec(text("SELECT count(*) FROM reddit_posts")).one()
    counts['ai_analysis'] = session.exec(text("SELECT count(*) FROM ai_analysis")).one()
    return counts


def main():
    print("Connecting to database...")
    with Session(engine) as session:
        counts = get_counts(session)
        print(f"reddit_posts rows: {counts['reddit_posts']}")
        print(f"ai_analysis rows: {counts['ai_analysis']}")

        confirm = input("This will DELETE ALL reddit posts and dependent rows (type YES to continue): ")
        if confirm.strip() != "YES":
            print("Aborted by user.")
            return

        print("Starting deletion transaction...")
        try:
            session.execute(text("BEGIN"))

            # Delete dependent rows that have FK to reddit_posts
            session.execute(text("DELETE FROM ai_analysis"))

            # Clear any array fields that may reference post ids (strings)
            session.execute(text("UPDATE crisis_alerts SET sample_post_ids = NULL WHERE sample_post_ids IS NOT NULL"))
            session.execute(text("UPDATE competitor_analysis SET sample_post_ids = NULL WHERE sample_post_ids IS NOT NULL"))
            session.execute(text("UPDATE influencers SET sample_post_ids = NULL WHERE sample_post_ids IS NOT NULL"))
            session.execute(text("UPDATE search_history SET clicked_post_ids = NULL WHERE clicked_post_ids IS NOT NULL"))

            # Finally delete posts
            session.execute(text("DELETE FROM reddit_posts"))

            session.execute(text("COMMIT"))
            print("Deletion completed successfully.")
        except Exception as e:
            session.execute(text("ROLLBACK"))
            print(f"Error during deletion: {e}")


if __name__ == '__main__':
    main()
