from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, join_room
import asyncio
import sys
import os
import time
import uuid
from io import StringIO
from functools import wraps
from app.agent.manus import Manus
from app.logger import logger, CustomHandler

app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24).hex())
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024  # 1MB max request size

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Global dictionary to store log handlers by session
log_handlers = {}

# Rate limiting
request_history = {}

def rate_limit(limit=5, per=60):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # Get client identifier
            client_id = request.remote_addr
            
            # Initialize if this is a new client
            if client_id not in request_history:
                request_history[client_id] = []
            
            # Clean old requests
            now = time.time()
            request_history[client_id] = [t for t in request_history[client_id] 
                                         if now - t < per]
            
            # Check if limit is reached
            if len(request_history[client_id]) >= limit:
                logger.warning(f"Rate limit exceeded for {client_id}")
                return jsonify({
                    'error': f'Rate limit exceeded. Please try again in {per} seconds.'
                }), 429
            
            # Add current request timestamp
            request_history[client_id].append(now)
            
            # Process the request
            return f(*args, **kwargs)
        return wrapped
    return decorator

class OutputCapture:
    def __init__(self):
        self.value = ""
    
    def write(self, text):
        self.value += text
        # 确保标准输出也能被捕获为日志
        logger.info(text.strip())
    
    def flush(self):
        pass

class LogCapture(CustomHandler):
    def __init__(self, session_id):
        super().__init__()
        self.session_id = session_id
        self.logs = []
        
    def emit(self, record):
        try:
            # 标准化日志记录格式
            if isinstance(record, dict):
                # Dictionary format
                log_entry = {
                    'level': record['level'].name if hasattr(record['level'], 'name') else str(record['level']),
                    'message': str(record['message']),
                    'time': record['time'].strftime('%H:%M:%S') if hasattr(record['time'], 'strftime') else str(record['time'])
                }
            else:
                # String format or custom format
                import datetime
                log_entry = {
                    'level': record.levelname if hasattr(record, 'levelname') else 'INFO',
                    'message': record.getMessage() if hasattr(record, 'getMessage') else str(record),
                    'time': datetime.datetime.now().strftime('%H:%M:%S')
                }
                
            self.logs.append(log_entry)
            # 确保实时将日志推送到前端
            socketio.emit('log_update', log_entry, room=self.session_id)
            return log_entry
        except Exception as e:
            print(f"Error in log handling: {e}")
            return None

async def process_prompt_async(prompt, session_id):
    agent = Manus()
    output_capture = OutputCapture()
    
    # Save the original stdout
    original_stdout = sys.stdout
    
    try:
        # Redirect stdout to capture agent output
        sys.stdout = output_capture
        
        # Set up log capturing for this session
        log_handler = LogCapture(session_id)
        log_handlers[session_id] = log_handler
        logger.add(log_handler)
        
        # 添加一条初始日志以测试日志系统
        logger.info(f"Starting to process prompt for session {session_id}")
        
        # Run the agent
        await agent.run(prompt)
        
        # 添加一条完成日志
        logger.info(f"Completed processing prompt for session {session_id}")
        
        # Return the captured output and logs
        return {
            'output': output_capture.value,
            'logs': log_handler.logs if log_handler and hasattr(log_handler, 'logs') else []
        }
    except Exception as e:
        logger.error(f"Error in agent execution: {str(e)}")
        raise
    finally:
        # Clean up
        sys.stdout = original_stdout
        if session_id in log_handlers:
            try:
                logger.remove(log_handlers[session_id])
            except Exception as e:
                print(f"Error removing log handler: {e}")
            del log_handlers[session_id]

@app.route('/')
def index():
    # Create a unique session ID for the user if they don't have one
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    user_id = session.get('user_id', 'anonymous')
    socketio.emit('connected', {'status': 'connected', 'session_id': user_id})

@socketio.on('join')
def on_join(data):
    room = data.get('session_id')
    if room:
        join_room(room)

@app.route('/api/prompt', methods=['POST'])
@rate_limit(limit=5, per=60)  # 5 requests per minute
def process_prompt():
    data = request.json
    prompt = data.get('prompt', '')
    
    if not prompt.strip():
        return jsonify({'error': 'Empty prompt provided.'}), 400
    
    try:
        # Get the user's session ID
        user_id = session.get('user_id', str(uuid.uuid4()))
        
        # Process the prompt asynchronously
        result = asyncio.run(process_prompt_async(prompt, user_id))
        
        # Log the interaction (optional, for analytics)
        logger.info(f"User {user_id} prompt processed successfully.")
        
        return jsonify({
            'response': result['output'],
            'logs': result['logs']
        })
    except Exception as e:
        logger.error(f"Error processing prompt: {e}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
