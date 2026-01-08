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

        if (themeToggle) {
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
        }
    });
})();

document.addEventListener('DOMContentLoaded', function () {
    const newChatBtns = document.querySelectorAll('#newChatBtn, #newChatBtnMain');
    const dropdownMenu = document.getElementById('chatDropdownMenu');
    const renameDialog = document.getElementById('renameDialog');
    const newChatTitleInput = document.getElementById('newChatTitle');
    let currentChatId = null;

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.chat-menu-btn') && !e.target.closest('#chatDropdownMenu')) {
            dropdownMenu.classList.remove('active');
        }
    });

    newChatBtns.forEach(btn => {
        btn.addEventListener('click', async function () {
            try {
                const response = await fetch('/new_chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                const data = await response.json();
                if (data.success) {
                    window.location.href = data.redirect;
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    });

    function addChatMenuListeners() {
        document.querySelectorAll('.chat-menu-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                currentChatId = this.getAttribute('data-chat-id');

                const rect = this.getBoundingClientRect();
                dropdownMenu.style.top = `${rect.bottom + window.scrollY}px`;
                dropdownMenu.style.left = `${rect.left + window.scrollX - 150 + rect.width}px`;

                dropdownMenu.classList.add('active');
            });
        });
    }

    document.getElementById('renameChatBtn').addEventListener('click', function () {
        dropdownMenu.classList.remove('active');

        const chatItem = document.querySelector(`.chat-menu-btn[data-chat-id="${currentChatId}"]`)
            ?.closest('div')?.querySelector('a');

        if (chatItem) {
            newChatTitleInput.value = chatItem.textContent.trim();
            renameDialog.classList.remove('hidden');
        }
    });

    document.getElementById('cancelRenameBtn').addEventListener('click', function () {
        renameDialog.classList.add('hidden');
    });

    document.getElementById('confirmRenameBtn').addEventListener('click', async function () {
        const newTitle = newChatTitleInput.value.trim();
        if (!newTitle) return;

        try {
            const response = await fetch(`/chat/${currentChatId}/rename`, {
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
                renameDialog.classList.add('hidden');
                updateChatList();
            } else {
                alert(data.error || 'Rename failed.');
            }
        } catch (error) {
            console.error('Error renaming chat:', error);
            alert('Error renaming chat.');
        }
    });

    document.getElementById('deleteChatBtn').addEventListener('click', async function () {
        dropdownMenu.classList.remove('active');

        if (!confirm('Are you sure you want to delete this chat?')) return;

        try {
            const response = await fetch(`/chat/${currentChatId}/delete`, {
                method: 'POST'
            });

            const data = await response.json();
            if (data.success) {
                updateChatList();
            } else {
                alert(data.error || 'Chat deletion failed.');
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            alert('Error deleting chat.');
        }
    });

    function updateChatList() {
        fetch('/get_chats')
            .then(response => {
                return response.json();
            })
            .then(data => {
                const chatListElement = document.getElementById('chatList');
                let chatListHTML = '';

                if (data.chats && data.chats.length > 0) {
                    data.chats.forEach(chat => {
                        chatListHTML += `
                            <div class="flex items-center justify-between bg-gray-800 hover:bg-gray-700 rounded mb-1 px-1 w-full">
                                <a href="/chat/${chat.id}" class="block py-2 px-2 truncate flex-grow">
                                    ${chat.title}
                                </a>
                                <button class="chat-menu-btn text-gray-300 hover:text-white px-2 py-1 focus:outline-none" data-chat-id="${chat.id}">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                </button>
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

    updateChatList();
    setInterval(updateChatList, 2000);
});
