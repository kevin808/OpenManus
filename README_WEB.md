# OpenManus Web Interface

This is a web interface for OpenManus, allowing users to interact with the AI assistant through a browser.

## Features

- Simple and intuitive UI
- Real-time interaction with OpenManus
- Responsive design for desktop and mobile devices

## Getting Started

### Prerequisites

Make sure you have all the dependencies installed:

```bash
pip install flask
```

### Running the Web Interface

To start the web server, run:

```bash
python run_web.py
```

This will start a Flask server on http://localhost:5000.

## Usage

1. Open your browser and navigate to http://localhost:5000
2. Enter your prompt in the text area
3. Click "Submit" to process your request
4. View the response from OpenManus

## Deployment

For production deployment, consider using a WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 app:app
```

Or deploy to platforms like Heroku, AWS, or Google Cloud.

## License

MIT
