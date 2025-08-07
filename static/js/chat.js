let isWaiting = false;
let abortController = null;
let currentChatId = null;
let currentModel = localStorage.getItem('selectedModel') || 'deepseek-r1:7b';
let typingAnimation = null;

document.addEventListener('DOMContentLoaded', function() {
    const modelSelector = document.getElementById('modelSelector');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const submitButton = document.getElementById('submitButton');
    const buttonText = document.getElementById('buttonText');
    const messagesContainer = document.getElementById('messages');

    currentChatId = window.location.pathname.split('/').pop();

    markLoadedModelsAndConfigureSelector();

    messageForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (isWaiting) return;

        const message = messageInput.value.trim();
        if (!message) return;

        isWaiting = true;
        messageInput.disabled = true;
        submitButton.disabled = true;

        appendMessage('user', message);
        messageInput.value = '';

        startTypingAnimation();

        try {
            const response = await fetch('/chat/' + currentChatId + '/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    model: currentModel
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'An error occurred');
            }

            stopTypingAnimation();

            if (data.has_think) {
                appendMessage('ai', data.response, data.think);
            } else {
                appendMessage('ai', data.response);
            }

            if (data.chat_title) {
                document.querySelector('h1').textContent = data.chat_title;
            }

        } catch (error) {
            stopTypingAnimation();
            appendMessage('ai', `Error: ${error.message}`);
        } finally {
            isWaiting = false;
            messageInput.disabled = false;
            submitButton.disabled = false;
        }
    });

    submitButton.addEventListener('click', async function() {
        if (isWaiting) {
            try {
                const response = await fetch('/chat/' + currentChatId + '/cancel', {
                    method: 'POST'
                });

                const data = await response.json();

                if (data.success) {
                    stopTypingAnimation();
                    appendMessage('ai', 'Canceled', null, true);
                }
            } catch (error) {
                console.error('Cancel error:', error);
            }
        }
    });

    function startTypingAnimation() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message ai-typing flex justify-start';
        messageDiv.innerHTML = `
          <div class="message-content">
            <div class="loading-dots">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        typingAnimation = messageDiv;
    }

    function stopTypingAnimation() {
        if (typingAnimation) {
            typingAnimation.remove();
            typingAnimation = null;
        }
    }

    function appendMessage(sender, content, think = null, canceled = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;

        let messageContent = `
          <div class="message-content ${sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'} rounded-lg p-3">
        `;

        if (canceled) {
            messageContent += `<div class="prose text-sm text-gray-500 italic">Canceled</div>`;
        } else {
            messageContent += `<div class="prose">${content}</div>`;
        }

        if (think) {
            messageContent += `
            <div class="mt-2 pt-2 border-t border-gray-200">
                <button class="think-toggle-btn text-xs text-blue-600 hover:text-blue-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Show Thinking Process
                </button>
                <div class="think-content hidden mt-2 p-2 bg-gray-100 rounded text-sm">
                  <div class="font-semibold mb-1 text-gray-700">Think:</div>
                  ${think}
                </div>
            </div>
            `;
        }

        messageContent += '</div>';
        messageDiv.innerHTML = messageContent;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const thinkBtn = messageDiv.querySelector('.think-toggle-btn');
        if (thinkBtn) {
            thinkBtn.addEventListener('click', function() {
                const thinkContent = this.nextElementSibling;
                if (thinkContent.classList.contains('hidden')) {
                    thinkContent.classList.remove('hidden');
                    this.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Hide Thinking Process
                    `;
                } else {
                    thinkContent.classList.add('hidden');
                    this.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Show Thinking Process
                    `;
                }
            });
        }
    }

});

async function markLoadedModelsAndConfigureSelector() {
    const modelSelector = document.getElementById('modelSelector');
    if (!modelSelector) return;

    let loadedModels = [];
    try {
        const response = await fetch('/get_ollama_models');
        const data = await response.json();

        if (data.success && data.models) {
            loadedModels = data.models;
            console.log('Loaded models:', loadedModels);
        } else if (data.error) {
            console.error('Models not loaded:', data.error);
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Ollama connection error";
            modelSelector.insertBefore(option, modelSelector.firstChild);
            modelSelector.value = "";
            modelSelector.disabled = true;
            return;
        }
    } catch (error) {
        console.error('Error loading models:', error);
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Ollama connection error";
        modelSelector.insertBefore(option, modelSelector.firstChild);
        modelSelector.value = "";
        modelSelector.disabled = true;
        return;
    }

    const options = modelSelector.querySelectorAll('option');
    options.forEach(option => {
        const modelFullName = option.value;
        const isInstalled = loadedModels.some(model =>
            model.full_name === modelFullName && model.is_installed
        );

        if (isInstalled) {
            if (!option.textContent.includes('✓')) {
                option.textContent = option.textContent.replace(' ✗', '') + ' ✓';
            }
            option.classList.add('text-green-500');
        } else {
            if (!option.textContent.includes('✗')) {
                option.textContent = option.textContent.replace(' ✓', '') + ' ✗';
            }
            option.classList.add('text-red-500');
        }
    });

    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
        modelSelector.value = savedModel;
        if (modelSelector.value !== savedModel) {
            console.warn('Saved model ', savedModel, ' not found in current model list');
        }
    } else {
        const firstLoadedOption = modelSelector.querySelector('option[value]');
        if (firstLoadedOption && firstLoadedOption.textContent.includes('✓')) {
            modelSelector.value = firstLoadedOption.value;
            localStorage.setItem('selectedModel', modelSelector.value);
        } else if (options.length > 0) {
            modelSelector.value = options[0].value;
            localStorage.setItem('selectedModel', modelSelector.value);
        }
    }
}

document.getElementById('modelSelector').addEventListener('change', function() {
    currentModel = this.value;
    localStorage.setItem('selectedModel', currentModel);
    console.log('Model changed to:', currentModel);
});

function updateChatList() {
    const currentPath = window.location.pathname;
    const currentChatId = currentPath.startsWith('/chat/') ? currentPath.split('/').pop() : null;
    fetch('/get_chats')
        .then(response => response.json())
        .then(data => {
            const chatListElement = document.getElementById('chatList');
            let chatListHTML = '';

            if (data.chats && data.chats.length > 0) {
                data.chats.forEach(chat => {
                    const isActive = chat.id === currentChatId;
                    chatListHTML += `
                        <div class="flex items-center justify-between ${isActive ? 'bg-gray-700' : 'bg-gray-800'} hover:bg-gray-700 rounded mb-1 px-1 w-full">
                            <a href="/chat/${chat.id}" class="block py-2 px-2 truncate flex-grow">
                                ${chat.title}
                            </a>
                            <div class="relative">
                                <button class="chat-menu-btn text-gray-300 hover:text-white px-2 py-1 focus:outline-none" data-chat-id="${chat.id}">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                </button>
                                <div class="chat-menu hidden absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10">
                                    <div class="py-1">
                                        <button onclick="renameChat('${chat.id}')" class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                                            Yeniden Adlandır
                                        </button>
                                        <button onclick="deleteChat('${chat.id}')" class="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-700">
                                            Sil
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                chatListHTML = '<p class="text-gray-500 text-sm italic">No chats yet</p>';
            }

            chatListElement.innerHTML = chatListHTML;
            addChatMenuListeners();
        })
        .catch(error => {
            console.error("Error updating chat list:", error);
        });
}

function addChatMenuListeners() {
    document.querySelectorAll('.chat-menu-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            currentChatId = this.getAttribute('data-chat-id');

            const rect = this.getBoundingClientRect();
            const contextMenu = document.getElementById('chatContextMenu');
            contextMenu.style.top = `${rect.bottom + window.scrollY}px`;
            contextMenu.style.left = `${rect.left + window.scrollX - 150 + rect.width}px`;

            contextMenu.classList.remove('hidden');
        });
    });
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.chat-menu-btn') && !e.target.closest('#chatContextMenu')) {
        document.getElementById('chatContextMenu').classList.add('hidden');
    }
});

document.getElementById('renameChatButton').addEventListener('click', function() {
    document.getElementById('newChatTitle').value = document.querySelector('h1.text-xl').textContent.trim();
    document.getElementById('renameDialog').classList.remove('hidden');
});

document.getElementById('renameChatBtn').addEventListener('click', function() {
    document.getElementById('chatContextMenu').classList.add('hidden');

    let chatTitle = '';
    if (currentChatId === '{{ chat_id }}') {
        chatTitle = document.querySelector('h1.text-xl').textContent.trim();
    } else {
        const chatElement = document.querySelector(`.chat-menu-btn[data-chat-id="${currentChatId}"]`)
            .closest('div').querySelector('a');
        if (chatElement) {
            chatTitle = chatElement.textContent.trim();
        }
    }

    document.getElementById('newChatTitle').value = chatTitle;
    document.getElementById('renameDialog').classList.remove('hidden');
});

document.getElementById('cancelRenameBtn').addEventListener('click', function() {
    document.getElementById('renameDialog').classList.add('hidden');
});

document.getElementById('confirmRenameBtn').addEventListener('click', async function() {
    const newTitle = document.getElementById('newChatTitle').value.trim();
    if (!newTitle) return;

    const chatIdToRename = currentChatId || '{{ chat_id }}';

    try {
        const response = await fetch('/chat/' + chatIdToRename + '/rename', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: newTitle
            })
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('renameDialog').classList.add('hidden');

            if (chatIdToRename === '{{ chat_id }}') {
                document.title = `${newTitle} - AI Chat`;
                document.querySelector('h1.text-xl').textContent = newTitle;
            }

            updateChatList();
        } else {
            alert(data.error || 'Rename failed.');
        }
    } catch (error) {
        console.error('Error renaming chat:', error);
        alert('Error renaming chat.');
    }
});

document.getElementById('deleteChatBtnContext').addEventListener('click', async function() {
    document.getElementById('chatContextMenu').classList.add('hidden');

    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
        const response = await fetch('/chat/' + currentChatId + '/delete', {
            method: 'POST'
        });

        const data = await response.json();
        if (data.success) {
            if (currentChatId === '{{ chat_id }}') {
                window.location.href = data.redirect;
            } else {
                updateChatList();
            }
        } else {
            alert(data.error || 'Chat deletion failed.');
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
        alert('Error deleting chat.');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    console.log("Page loaded, updating chat list...");
    updateChatList();
    setInterval(updateChatList, 2000);

    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    document.querySelectorAll('.think-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const thinkContent = this.nextElementSibling;
            if (thinkContent.classList.contains('hidden')) {
                thinkContent.classList.remove('hidden');
                this.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Hide Thinking Process
                    `;
            } else {
                thinkContent.classList.add('hidden');
                this.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Show Thinking Process
                    `;
            }
        });
    });

    addChatMenuListeners();
});

document.getElementById('deleteChatBtn').addEventListener('click', async () => {
    if (isWaiting) return;
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
        const currentChatId = window.location.pathname.split('/').pop();
        const res = await fetch('/chat/' + currentChatId + '/delete', {
            method: 'POST'
        });
        const data = await res.json();
        if (data.success) window.location.href = data.redirect;
    } catch {
        alert('Chat deletion failed.');
    }
});

document.getElementById('newChatBtn').addEventListener('click', async () => {
    if (isWaiting) return;
    try {
        const res = await fetch('/new_chat', {
            method: 'POST'
        });
        const data = await res.json();
        if (data.success) window.location.href = data.redirect;
    } catch {
        alert('New chat creation failed.');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

async function deleteChat(chatId) {
    if (confirm('Bu sohbeti silmek istediğinizden emin misiniz?')) {
        try {
            const response = await fetch('/chat/' + chatId + '/delete', {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                window.location.href = data.redirect;
            } else {
                alert('Sohbet silinirken bir hata oluştu: ' + data.error);
            }
        } catch (error) {
            alert('Bir hata oluştu: ' + error.message);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.chat-menu-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const menu = this.nextElementSibling;
            const allMenus = document.querySelectorAll('.chat-menu');

            allMenus.forEach(m => {
                if (m !== menu) m.classList.add('hidden');
            });

            menu.classList.toggle('hidden');
        });
    });

    document.addEventListener('click', function() {
        document.querySelectorAll('.chat-menu').forEach(menu => {
            menu.classList.add('hidden');
        });
    });
});

async function renameChat(chatId) {
    const newTitle = prompt('Yeni sohbet başlığını girin:');
    if (newTitle && newTitle.trim()) {
        try {
            const response = await fetch('/chat/' + chatId + '/rename', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: newTitle.trim()
                })
            });
            const data = await response.json();
            if (data.success) {
                window.location.reload();
            } else {
                alert('Başlık güncellenirken bir hata oluştu: ' + data.error);
            }
        } catch (error) {
            alert('Bir hata oluştu: ' + error.message);
        }
    }
}
