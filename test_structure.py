"""Quick test to verify project structure"""

import os
import sys

def check_structure():
    """Check if all required files exist"""
    
    required_files = [
        "pyproject.toml",
        "docker-compose.yml",
        ".env",
        "app/__init__.py",
        "app/main.py",
        "app/core/config.py",
        "app/core/celery_app.py",
        "app/database/connection.py",
        "app/models/post.py",
        "app/models/comment.py",
        "app/schemas/post.py",
        "app/schemas/comment.py",
        "app/services/reddit_monitor.py",
        "app/tasks/reddit_tasks.py",
        "app/api/posts.py",
        "app/api/monitoring.py",
    ]
    
    missing = []
    for file in required_files:
        if not os.path.exists(file):
            missing.append(file)
    
    if missing:
        print("❌ Missing files:")
        for f in missing:
            print(f"  - {f}")
        return False
    else:
        print("✅ All required files present!")
        print(f"\n📁 Total files checked: {len(required_files)}")
        return True

def check_imports():
    """Test if Python files can be imported (syntax check)"""
    
    print("\n🔍 Checking Python syntax...")
    
    test_files = [
        "app/core/config.py",
        "app/models/post.py",
        "app/schemas/post.py",
    ]
    
    for file in test_files:
        try:
            with open(file) as f:
                compile(f.read(), file, 'exec')
            print(f"  ✅ {file}")
        except SyntaxError as e:
            print(f"  ❌ {file}: {e}")
            return False
    
    return True

if __name__ == "__main__":
    print("🚀 Reddit AI Platform - Structure Verification\n")
    
    structure_ok = check_structure()
    syntax_ok = check_imports()
    
    if structure_ok and syntax_ok:
        print("\n✨ Project structure is valid!")
        print("\nNext steps:")
        print("  1. Install dependencies: poetry install")
        print("  2. Start Docker: docker compose up -d")
        print("  3. Run API: make run-api")
        print("  4. Run Celery: make run-celery")
        sys.exit(0)
    else:
        print("\n❌ Project structure has issues!")
        sys.exit(1)
