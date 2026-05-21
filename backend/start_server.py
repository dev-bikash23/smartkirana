"""
SmartKirana Backend — Start Server
Run: cd backend && python start_server.py
"""
import uvicorn
import os
import sys

# Ensure we're running from the backend directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("Starting SmartKirana Backend...")
    print(f"Working directory: {backend_dir}")
    print(f"Server will run at: http://localhost:8000")
    print("-" * 50)
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
