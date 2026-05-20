import uvicorn
import os
import sys

# Change to the server directory
server_dir = r"c:\Users\bikas\OneDrive\Desktop\supply_demand-final\server"
os.chdir(server_dir)

# Add the server directory to path
sys.path.insert(0, server_dir)

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
