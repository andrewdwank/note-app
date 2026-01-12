let notes = [];
    let editingNoteId = null;

    // DOM Helpers
    function $(selector) { return document.querySelector(selector); }
    function $$(selector) { return document.querySelectorAll(selector); }

    // Escape HTML
    function escapeHtml(str) {
      if (typeof str !== 'string') return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Toggle note type fields
    function updateNoteTypeFields() {
      const type = $('input[name="noteType"]:checked').value;
      const textFields = $('#textNoteFields');
      const checklistFields = $('#checklistNoteFields');

      if (type === 'text') {
        textFields.classList.remove('hidden');
        checklistFields.classList.add('hidden');
      } else {
        textFields.classList.add('hidden');
        checklistFields.classList.remove('hidden');
      }
    }

    // Add checklist item
    function addChecklistItem(text = '', checked = false) {
      const container = $('#checklistItemsContainer');
      const id = 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
      
      const itemDiv = document.createElement('div');
      itemDiv.className = 'checklist-item';
      itemDiv.dataset.id = id;
      itemDiv.innerHTML = `
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleChecklistItem(this)">
        <input type="text" value="${escapeHtml(text)}" placeholder="e.g. Buy milk" 
               oninput="updateChecklistItemText(this)" 
               onkeydown="handleChecklistKeydown(event)" />
        <button type="button" class="delete-item-btn" onclick="removeChecklistItem(this)" title="Remove item">×</button>
      `;
      container.appendChild(itemDiv);
      itemDiv.querySelector('input[type="text"]').focus();
    }

    function removeChecklistItem(button) {
      button.closest('.checklist-item').remove();
    }

    function toggleChecklistItem(checkbox) {
      const itemDiv = checkbox.closest('.checklist-item');
      if (checkbox.checked) {
        itemDiv.classList.add('completed');
      } else {
        itemDiv.classList.remove('completed');
      }
    }

    function updateChecklistItemText(input) {
      // Optional: real-time sync if needed
    }

    function handleChecklistKeydown(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        addChecklistItem();
      }
    }

    // Initialize checklist items when editing
    function initChecklistItems(items = []) {
      const container = $('#checklistItemsContainer');
      container.innerHTML = '';
      if (items.length === 0) {
        addChecklistItem(); // start with one empty item
      } else {
        items.forEach(item => addChecklistItem(item.text, item.checked));
      }
    }

    // Dialog Functions
    function openNoteDialog(noteId = null) {
      const dialog = $('#noteDialog');
      const titleInput = $('#noteTitle');

      // Reset type selection
      $$('input[name="noteType"]').forEach(radio => {
        if (radio.value === 'text') radio.checked = true;
      });
      updateNoteTypeFields();

      if (noteId) {
        const noteToEdit = notes.find(note => note.id === noteId);
        editingNoteId = noteId;
        $('#dialogTitle').textContent = 'Edit Note';
        titleInput.value = noteToEdit.title || '';

        if (noteToEdit.type === 'checklist') {
          $$('input[value="checklist"]')[0].checked = true;
          updateNoteTypeFields();
          initChecklistItems(noteToEdit.items);
        } else {
          $$('input[value="text"]')[0].checked = true;
          updateNoteTypeFields();
          $('#noteContent').value = noteToEdit.content || '';
        }
      } else {
        editingNoteId = null;
        $('#dialogTitle').textContent = 'Add New Note';
        titleInput.value = '';
        $('#noteContent').value = '';
        initChecklistItems();
      }

      dialog.showModal();
      titleInput.focus();
    }

    function closeNoteDialog() {
      $('#noteDialog').close();
    }

    // Save Note
    function saveNote(event) {
      event.preventDefault();

      const title = $('#noteTitle').value.trim();
      const noteType = $('input[name="noteType"]:checked').value;

      let newNote;
      if (noteType === 'text') {
        const content = $('#noteContent').value.trim();
        newNote = {
          id: editingNoteId || generateId(),
          type: 'text',
          title: title,
          content: content,
          createdAt: editingNoteId 
            ? (notes.find(n => n.id === editingNoteId)?.createdAt || Date.now()) 
            : Date.now(),
          updatedAt: Date.now()
        };
      } else { // checklist
        const itemElements = $$('#checklistItemsContainer .checklist-item');
        const items = Array.from(itemElements)
          .map(el => {
            const checkbox = el.querySelector('input[type="checkbox"]');
            const textInput = el.querySelector('input[type="text"]');
            return {
              text: textInput.value.trim(),
              checked: checkbox.checked
            };
          })
          .filter(item => item.text); // Skip empty

        if (items.length === 0 && !title) {
          alert('Please add a title or at least one checklist item.');
          return;
        }

        newNote = {
          id: editingNoteId || generateId(),
          type: 'checklist',
          title: title,
          items: items,
          createdAt: editingNoteId 
            ? (notes.find(n => n.id === editingNoteId)?.createdAt || Date.now()) 
            : Date.now(),
          updatedAt: Date.now()
        };
      }

      if (editingNoteId) {
        const index = notes.findIndex(note => note.id === editingNoteId);
        if (index !== -1) notes[index] = newNote;
      } else {
        notes.unshift(newNote);
      }

      closeNoteDialog();
      saveNotes();
      renderNotes();
    }

    // CRUD
    function generateId() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    }

    function deleteNote(noteId) {
      if (confirm('Are you sure you want to delete this note?')) {
        notes = notes.filter(note => note.id !== noteId);
        saveNotes();
        renderNotes();
      }
    }

    // Storage
    function saveNotes() {
      localStorage.setItem('quicknotes_v2', JSON.stringify(notes));
    }

    function loadNotes() {
      const saved = localStorage.getItem('quicknotes_v2');
      return saved ? JSON.parse(saved) : [];
    }

    // Render
    function renderNotes() {
      const container = $('#notesContainer');

      if (notes.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h2>No notes yet</h2>
            <p>Create your first note to get started!</p>
            <button class="add-note-btn" onclick="openNoteDialog()">+ Add New Note</button>
          </div>`;
        return;
      }

      container.innerHTML = notes.map(note => {
        if (note.type === 'checklist') {
          const itemsHtml = note.items.length 
            ? note.items.map(item => `
                <div class="checklist-item ${item.checked ? 'completed' : ''}">
                  <input type="checkbox" ${item.checked ? 'checked' : ''} disabled>
                  <label>${escapeHtml(item.text)}</label>
                </div>
              `).join('')
            : '<p class="empty-list">No items yet</p>';

          return `
            <div class="note-card">
              <h3 class="note-title">${escapeHtml(note.title || 'Untitled Checklist')}</h3>
              <div class="note-content checklist-preview">
                ${itemsHtml}
              </div>
              <div class="note-actions">
                <button class="edit-btn" title="Edit Note" onclick="openNoteDialog('${note.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button class="delete-btn" title="Delete Note" onclick="deleteNote('${note.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.88c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/>
                  </svg>
                </button>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="note-card">
              <h3 class="note-title">${escapeHtml(note.title || 'Untitled')}</h3>
              <p class="note-content">${escapeHtml(note.content || '')}</p>
              <div class="note-actions">
                <button class="edit-btn" title="Edit Note" onclick="openNoteDialog('${note.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button class="delete-btn" title="Delete Note" onclick="deleteNote('${note.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.88c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/>
                  </svg>
                </button>
              </div>
            </div>
          `;
        }
      }).join('');
    }

    // Theme
    function toggleTheme() {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      $('#themeToggleBtn').textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // Init
    document.addEventListener('DOMContentLoaded', function() {
      // Load theme
      if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        $('#themeToggleBtn').textContent = '☀️';
      }

      // Load notes
      notes = loadNotes();
      renderNotes();

      // Events
      $('#noteForm').addEventListener('submit', saveNote);
      $('#themeToggleBtn').addEventListener('click', toggleTheme);
      
      // Close dialog on backdrop click
      $('#noteDialog').addEventListener('click', function(e) {
        if (e.target === this) closeNoteDialog();
      });

      // Note type change
      $$('input[name="noteType"]').forEach(radio => {
        radio.addEventListener('change', updateNoteTypeFields);
      });

      // Initialize fields
      updateNoteTypeFields();
    });