let isWaiting = false;
let abortController = null;
let currentChatId = null;
let targetChatIdForAction = null;
let typingAnimation = null;

(function () {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    document.addEventListener('DOMContentLoaded', () => {
        const themeToggle = document.getElementById('themeToggle');
        const sunIcon = document.getElementById('sunIcon');
        const moonIcon = document.getElementById('moonIcon');
        const themeText = document.getElementById('themeText');

        function updateUI(theme) {
            if (theme === 'dark') {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
                themeText.textContent = 'Light Mode';
            } else {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
                themeText.textContent = 'Dark Mode';
            }
        }

        updateUI(savedTheme);

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            document.documentElement.classList.add('no-transition');

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateUI(newTheme);

            setTimeout(() => {
                document.documentElement.classList.remove('no-transition');
            }, 0);
        });
    });
})();

try {
    marked.setOptions({
        highlight: function (code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-'
    });
} catch (e) { }

document.addEventListener('DOMContentLoaded', function () {
    const modelSelector = document.getElementById('modelSelector');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const submitButton = document.getElementById('submitButton');
    const buttonText = document.getElementById('buttonText');
    const messagesContainer = document.getElementById('messages');

    currentChatId = window.location.pathname.split('/').pop();
    if (currentChatId === 'chat' || currentChatId === '') currentChatId = null;

    markLoadedModelsAndConfigureSelector();

    function adjustInputHeight() {
        messageInput.style.height = 'auto';
        let newHeight = messageInput.scrollHeight;

        const maxHeight = window.innerHeight * 0.3;

        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            messageInput.style.overflowY = 'auto';
        } else {
            messageInput.style.overflowY = 'hidden';
        }

        messageInput.style.height = newHeight + 'px';

        const threshold = 100;
        const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < threshold;
        if (isNearBottom) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    messageInput.addEventListener('input', adjustInputHeight);

    adjustInputHeight();
    messageInput.addEventListener('paste', () => {
        setTimeout(adjustInputHeight, 0);
    });

    messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            messageForm.dispatchEvent(new Event('submit'));
        }
    });

    messageForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (isWaiting) return;

        const message = messageInput.value.trim();
        if (!message) return;

        isWaiting = true;
        messageInput.disabled = true;
        submitButton.disabled = true;

        document.getElementById('newChatBtn').classList.add('waiting-state');
        document.getElementById('chatList').classList.add('waiting-state');

        appendMessage('user', message);
        messageInput.value = '';
        messageInput.style.height = 'auto';

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

            document.getElementById('newChatBtn').classList.remove('waiting-state');
            document.getElementById('chatList').classList.remove('waiting-state');
        }
    });

    submitButton.addEventListener('click', async function () {
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
            messageContent += `<div class="prose">${marked.parse(content)}</div>`;
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
                  <div class="think-body">${marked.parse(think)}</div>
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
            thinkBtn.addEventListener('click', function () {
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

        processCodeBlocks(messageDiv);
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
        } else {
            throw new Error(data.error || 'Failed to load models');
        }
    } catch (error) {
        console.error('Error loading models:', error);
        modelSelector.innerHTML = '<option value="">Ollama connection error</option>';
        modelSelector.disabled = true;
        return;
    }

    if (loadedModels.length === 0) {
        modelSelector.innerHTML = '<option value="">No models installed</option>';
        modelSelector.disabled = true;
        return;
    }

    const groups = {};
    loadedModels.forEach(model => {
        const groupName = model.full_name.split(':')[0].split('-')[0].toUpperCase();
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(model);
    });

    const savedModel = localStorage.getItem('selectedModel');
    let modelToSelect = savedModel;

    dropdownMenu.innerHTML = '';

    Object.keys(groups).sort().forEach(groupName => {
        const groupLabel = document.createElement('div');
        groupLabel.className = 'dropdown-group-label';
        groupLabel.textContent = groupName + ' Models';
        dropdownMenu.appendChild(groupLabel);

        groups[groupName].forEach(model => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.setAttribute('data-model', model.full_name);
            item.innerHTML = `
                <span>${model.full_name}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="check-icon h-4 w-4 hidden" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
            `;

            item.addEventListener('click', () => updateSelectedModel(model.full_name));
            dropdownMenu.appendChild(item);
        });
    });

    if (!modelToSelect || !loadedModels.find(m => m.full_name === modelToSelect)) {
        modelToSelect = loadedModels[0].full_name;
    }

    updateSelectedModel(modelToSelect);
}

const customDropdown = document.getElementById('customModelDropdown');
const dropdownTrigger = document.getElementById('dropdownTrigger');
const dropdownMenu = document.getElementById('dropdownMenu');
const selectedModelName = document.getElementById('selectedModelName');

if (dropdownTrigger) {
    dropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        customDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!customDropdown.contains(e.target)) {
            customDropdown.classList.remove('active');
        }
    });
}

function updateSelectedModel(modelName) {
    currentModel = modelName;
    localStorage.setItem('selectedModel', currentModel);
    selectedModelName.textContent = modelName;

    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.classList.remove('selected');
        const check = item.querySelector('.check-icon');
        if (check) check.classList.add('hidden');

        if (item.getAttribute('data-model') === modelName) {
            item.classList.add('selected');
            if (check) check.classList.remove('hidden');
        }
    });

    customDropdown.classList.remove('active');
}

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
                    const disabledClass = isWaiting ? 'opacity-50 pointer-events-none cursor-not-allowed' : '';
                    chatListHTML += `
                        <div class="flex items-center justify-between ${isActive ? 'bg-gray-700' : 'bg-gray-800'} hover:bg-gray-700 rounded mb-1 px-1 w-full ${disabledClass}">
                            <a href="/chat/${chat.id}" class="block py-2 px-2 truncate flex-grow ${isWaiting ? 'pointer-events-none' : ''}">
                                ${chat.title}
                            </a>
                            <div class="relative">
                                <button class="chat-menu-btn text-gray-300 hover:text-white px-2 py-1 focus:outline-none ${isWaiting ? 'opacity-50 pointer-events-none' : ''}" data-chat-id="${chat.id}">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                </button>
                                <div class="chat-menu absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10">
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
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            targetChatIdForAction = this.getAttribute('data-chat-id');

            const rect = this.getBoundingClientRect();
            const contextMenu = document.getElementById('chatContextMenu');
            contextMenu.style.top = `${rect.bottom + window.scrollY}px`;
            contextMenu.style.left = `${rect.left + window.scrollX - 150 + rect.width}px`;

            contextMenu.classList.add('active');
        });
    });
}
document.addEventListener('click', function (e) {
    if (!e.target.closest('.chat-menu-btn') && !e.target.closest('#chatContextMenu')) {
        document.getElementById('chatContextMenu').classList.remove('active');
    }
});

document.getElementById('renameChatButton').addEventListener('click', function () {
    targetChatIdForAction = window.location.pathname.split('/').pop();
    if (targetChatIdForAction === 'chat' || targetChatIdForAction === '') targetChatIdForAction = null;

    document.getElementById('newChatTitle').value = document.querySelector('h1.text-xl').textContent.trim();
    document.getElementById('renameDialog').classList.remove('hidden');
});

document.getElementById('renameChatBtn').addEventListener('click', function () {
    document.getElementById('chatContextMenu').classList.remove('active');

    let chatTitle = '';
    const chatElement = document.querySelector(`.chat-menu-btn[data-chat-id="${targetChatIdForAction}"]`)
        ?.closest('div')?.querySelector('a');

    if (chatElement) {
        chatTitle = chatElement.textContent.trim();
    } else {
        chatTitle = document.querySelector('h1.text-xl').textContent.trim();
    }

    document.getElementById('newChatTitle').value = chatTitle;
    document.getElementById('renameDialog').classList.remove('hidden');
});

document.getElementById('cancelRenameBtn').addEventListener('click', function () {
    document.getElementById('renameDialog').classList.add('hidden');
});

document.getElementById('confirmRenameBtn').addEventListener('click', async function () {
    const newTitle = document.getElementById('newChatTitle').value.trim();
    if (!newTitle) return;

    if (!targetChatIdForAction) return;

    try {
        const response = await fetch('/chat/' + targetChatIdForAction + '/rename', {
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

            const currentPathId = window.location.pathname.split('/').pop();
            if (targetChatIdForAction === currentPathId) {
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

document.getElementById('deleteChatBtnContext').addEventListener('click', async function () {
    document.getElementById('chatContextMenu').classList.remove('active');

    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
        const response = await fetch('/chat/' + targetChatIdForAction + '/delete', {
            method: 'POST'
        });

        const data = await response.json();
        if (data.success) {
            const currentPathId = window.location.pathname.split('/').pop();
            if (targetChatIdForAction === currentPathId) {
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

document.addEventListener('DOMContentLoaded', function () {
    updateChatList();
    setInterval(updateChatList, 2000);

    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    document.querySelectorAll('.think-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function () {
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

    renderExistingMessages();
    addChatMenuListeners();
});

function renderExistingMessages() {
    document.querySelectorAll('.prose').forEach(el => {
        if (el.textContent.trim() === 'Canceled') return;

        const rawContent = el.getAttribute('data-raw') || el.innerHTML;
        el.innerHTML = marked.parse(rawContent);
    });

    document.querySelectorAll('.think-body').forEach(el => {
        const rawThink = el.getAttribute('data-raw') || el.innerHTML;
        el.innerHTML = marked.parse(rawThink);
    });

    processCodeBlocks(document);
}

function processCodeBlocks(container) {
    container.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);

        const pre = block.parentElement;
        if (pre.parentElement && pre.parentElement.classList.contains('code-block-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;

        copyBtn.addEventListener('click', () => {
            const code = block.innerText;
            navigator.clipboard.writeText(code).then(() => {
                copyBtn.classList.add('copied');
                copyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" stroke="#10b981">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `;

                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.innerHTML = `
                        <svg viewBox="0 0 24 24">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    `;
                }, 2000);
            });
        });

        wrapper.appendChild(copyBtn);
    });
}

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

document.addEventListener('DOMContentLoaded', function () {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

async function deleteChat(chatId) {
    if (isWaiting) return;
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

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.chat-menu-btn').forEach(button => {
        button.addEventListener('click', function (e) {
            e.stopPropagation();
            const menu = this.nextElementSibling;
            const allMenus = document.querySelectorAll('.chat-menu');

            allMenus.forEach(m => {
                if (m !== menu) m.classList.remove('active');
            });

            menu.classList.toggle('active');
        });
    });

    document.addEventListener('click', function () {
        document.querySelectorAll('.chat-menu').forEach(menu => {
            menu.classList.remove('active');
        });
    });
});

async function renameChat(chatId) {
    if (isWaiting) return;
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
