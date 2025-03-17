import argparse
from app import app

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run the OpenManus web interface')
    parser.add_argument('--host', default='0.0.0.0', help='Host to run the server on')
    parser.add_argument('--port', type=int, default=5000, help='Port to run the server on')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    print(f"Starting OpenManus web interface on http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)
