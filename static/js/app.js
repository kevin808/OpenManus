document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    const promptInput = document.getElementById('promptInput');
    const submitButton = document.getElementById('submitPrompt');
    const submitButtonText = submitButton.querySelector('.button-text');
    const submitButtonSpinner = submitButton.querySelector('.spinner-border');
    const clearButton = document.getElementById('clearPrompt');
    const logsDiv = document.getElementById('logs');
    const clearLogsButton = document.getElementById('clearLogs');
    const toggleLogsButton = document.getElementById('toggleLogs');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const logContainer = document.getElementById('logContainer');
    
    // 保存会话ID用于socket.io房间
    let sessionId = '';
    
    // 连接到socket.io
    socket.on('connect', function() {
        console.log('Socket connected');
    });
    
    // 接收会话ID
    socket.on('connected', function(data) {
        sessionId = data.session_id;
        socket.emit('join', { session_id: sessionId });
        console.log('Joined session:', sessionId);
    });
    
    // 接收实时日志更新
    socket.on('log_update', function(logData) {
        addLogToDisplay(logData);
    });
    
    // 提交按钮点击事件
    submitButton.addEventListener('click', function() {
        const prompt = promptInput.value.trim();
        if (prompt) {
            setButtonLoading(true);
            clearLogs(); // 每次提交前清空日志
            
            // 添加一条信息表明正在处理
            addLogToDisplay({
                level: 'INFO',
                message: '正在处理您的请求...',
                time: new Date().toTimeString().split(' ')[0]
            });
            
            // 调用API
            fetch('/api/prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt }),
            })
            .then(response => response.json())
            .then(data => {
                setButtonLoading(false);
                if (data.error) {
                    addLogToDisplay({
                        level: 'ERROR',
                        message: `错误: ${data.error}`,
                        time: new Date().toTimeString().split(' ')[0]
                    });
                } else {
                    // 如果后端返回了日志，显示它们
                    if (data.logs && data.logs.length > 0) {
                        data.logs.forEach(addLogToDisplay);
                    }
                    
                    // 如果有响应但没有显示在日志中，也添加到日志
                    if (data.response && data.response.trim()) {
                        addLogToDisplay({
                            level: 'INFO',
                            message: data.response,
                            time: new Date().toTimeString().split(' ')[0]
                        });
                    }
                }
            })
            .catch(error => {
                setButtonLoading(false);
                addLogToDisplay({
                    level: 'ERROR',
                    message: `请求失败: ${error.message}`,
                    time: new Date().toTimeString().split(' ')[0]
                });
                console.error('Error:', error);
            });
        } else {
            alert('请输入内容再提交！');
        }
    });
    
    // 设置按钮加载状态
    function setButtonLoading(isLoading) {
        if (isLoading) {
            submitButton.disabled = true;
            submitButtonText.textContent = "处理中";
            submitButtonSpinner.classList.remove('d-none');
        } else {
            submitButton.disabled = false;
            submitButtonText.textContent = "提交";
            submitButtonSpinner.classList.add('d-none');
        }
    }
    
    // 清空输入按钮事件
    clearButton.addEventListener('click', function() {
        promptInput.value = '';
    });
    
    // 清空日志按钮事件
    clearLogsButton.addEventListener('click', clearLogs);
    
    // 切换显示/隐藏日志
    toggleLogsButton.addEventListener('click', function() {
        if (logContainer.style.display === 'none') {
            logContainer.style.display = 'block';
            toggleLogsButton.textContent = '隐藏日志';
        } else {
            logContainer.style.display = 'none';
            toggleLogsButton.textContent = '显示日志';
        }
    });
    
    // 添加日志到显示区域
    function addLogToDisplay(log) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-level-${log.level}`;
        logEntry.innerHTML = `<small class="log-time">${log.time}</small> <span class="log-level">[${log.level}]</span> ${log.message}`;
        logsDiv.appendChild(logEntry);
        
        // 自动滚动到最新日志
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    
    // 清空日志
    function clearLogs() {
        logsDiv.innerHTML = '';
    }
});
