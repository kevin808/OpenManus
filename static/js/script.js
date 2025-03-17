document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('prompt-form');
    const promptInput = document.getElementById('prompt-input');
    const responseArea = document.getElementById('response-area');
    const welcomeMessage = document.querySelector('.welcome-message');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const prompt = promptInput.value.trim();
        if (!prompt) {
            showError('Please enter a prompt.');
            return;
        }
        
        // Show loading state
        form.querySelector('.submit-btn').classList.add('loading');
        
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        // Create response placeholder
        const responseContent = document.createElement('div');
        responseContent.className = 'response-content';
        responseContent.innerHTML = '<p>Processing your request...</p>';
        responseArea.innerHTML = '';
        responseArea.appendChild(responseContent);
        
        // Send the request to the API
        fetch('/api/prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Format and display the response
            const formattedResponse = formatResponse(data.response || '');
            responseContent.innerHTML = formattedResponse;
            
            // Scroll to response
            responseArea.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            console.error('Error:', error);
            showError('An error occurred while processing your request. Please try again.');
        })
        .finally(() => {
            // Hide loading state
            form.querySelector('.submit-btn').classList.remove('loading');
        });
    });
    
    // Helper function to show errors
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.color = '#e74c3c';
        errorDiv.style.marginTop = '10px';
        
        // Remove any existing error messages
        const existingError = form.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        form.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    // Format the response with Markdown-like syntax
    function formatResponse(text) {
        // Basic formatting
        let formatted = text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Detect code blocks
        formatted = formatted.replace(/```([\s\S]*?)```/g, function(match, code) {
            return `<pre><code>${code}</code></pre>`;
        });
        
        return formatted;
    }
});
