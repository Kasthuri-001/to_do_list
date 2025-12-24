// =========================
// ===== RESPONSIVE TASK MANAGER =====
// =========================

// Global variables
let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let currentSortOrder = 'default';
let searchTerm = '';

// DOM elements with null checks
const elements = {
  taskInput: document.getElementById("taskInput"),
  addTaskBtn: document.getElementById("addTaskBtn"),
  taskList: document.getElementById("taskList"),
  noteInput: document.getElementById("noteInput"),
  addNoteBtn: document.getElementById("addNoteBtn"),
  notesDiv: document.getElementById("notes"),
  reminderText: document.getElementById("reminderText"),
  reminderTime: document.getElementById("reminderTime"),
  addReminderBtn: document.getElementById("addReminderBtn"),
  reminderList: document.getElementById("reminderList"),
  calendarDiv: document.getElementById("calendar"),
  pastelBtn: document.getElementById('pastelBtn'),
  neonBtn: document.getElementById('neonBtn'),
  darkBtn: document.getElementById('darkBtn'),
  searchInput: document.getElementById("searchInput") || createSearchInput(),
  sortBtn: document.getElementById("sortBtn") || createSortButton(),
  mobileMenuBtn: document.getElementById("mobileMenuBtn") || createMobileMenuBtn()
};

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupNavigation();
  updateClock();
  setInterval(updateClock, 1000);
  updateDashboardStats();
});

// Handle online/offline status
window.addEventListener('online', () => showNotification('Back online!', 'success'));
window.addEventListener('offline', () => showNotification('You\'re offline. Changes will sync when you\'re back online.', 'warning'));

// Handle resize events with debouncing
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(handleResize, 250);
});

function handleResize() {
  adjustLayoutForScreenSize();
  if (window.innerWidth > 768) {
    closeMobileMenu();
  }
}

function initializeApp() {
  setupEventListeners();
  loadTasks();
  loadNotes();
  loadReminders();
  applySavedTheme();
  renderCalendar();
  adjustLayoutForScreenSize();
  setupTouchGestures();
  setupKeyboardShortcuts();
  checkNotificationPermission();
}

function setupEventListeners() {
  // Task events
  if (elements.addTaskBtn) {
    elements.addTaskBtn.addEventListener("click", handleAddTask);
    elements.addTaskBtn.addEventListener("touchstart", handleAddTask, { passive: true });
  }
  
  if (elements.taskInput) {
    elements.taskInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleAddTask();
    });
  }

  // Note events
  if (elements.addNoteBtn) {
    elements.addNoteBtn.addEventListener("click", handleAddNote);
    elements.addNoteBtn.addEventListener("touchstart", handleAddNote, { passive: true });
  }
  
  if (elements.noteInput) {
    elements.noteInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleAddNote();
    });
  }

  // Reminder events
  if (elements.addReminderBtn) {
    elements.addReminderBtn.addEventListener("click", handleAddReminder);
    elements.addReminderBtn.addEventListener("touchstart", handleAddReminder, { passive: true });
  }

  // Theme switcher events
  if (elements.pastelBtn) elements.pastelBtn.addEventListener('click', () => setTheme(''));
  if (elements.neonBtn) elements.neonBtn.addEventListener('click', () => setTheme('neon'));
  if (elements.darkBtn) elements.darkBtn.addEventListener('click', () => setTheme('dark'));

  // Search and sort events
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", debounce(handleSearch, 300));
  }
  if (elements.sortBtn) {
    elements.sortBtn.addEventListener("click", handleSort);
  }

  // Mobile menu
  if (elements.mobileMenuBtn) {
    elements.mobileMenuBtn.addEventListener("click", toggleMobileMenu);
  }
}

function handleAddTask() {
  const taskText = elements.taskInput.value.trim();
  if (taskText !== "") {
    addTask(taskText);
    elements.taskInput.value = "";
    saveTasks();
    showNotification('Task added successfully!', 'success');
  } else {
    showNotification('Please enter a task', 'error');
  }
}

function addTask(taskText) {
  const li = document.createElement("li");
  li.className = "task-item";
  li.setAttribute('data-text', taskText.toLowerCase());

  const taskContent = document.createElement("div");
  taskContent.className = "task-content";

  // Checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.addEventListener("change", () => {
    li.classList.toggle("completed", checkbox.checked);
    saveTasks();
    updateTaskStats();
    updateDashboardStats();
    addActivityItem(checkbox.checked ? 'Task completed' : 'Task marked as incomplete');
  });

  // Task text
  const span = document.createElement("span");
  span.className = "task-text";
  span.textContent = taskText;

  // Priority selector
  const priority = document.createElement("select");
  priority.className = "task-priority";
  priority.innerHTML = `
    <option value="low">Low</option>
    <option value="medium" selected>Medium</option>
    <option value="high">High</option>
  `;
  priority.addEventListener("change", () => {
    li.setAttribute('data-priority', priority.value);
    saveTasks();
  });

  taskContent.appendChild(checkbox);
  taskContent.appendChild(span);
  taskContent.appendChild(priority);

  // Action buttons
  const actions = document.createElement("div");
  actions.className = "task-actions";

  // Edit button
  const editBtn = document.createElement("button");
  editBtn.textContent = "✏️";
  editBtn.className = "edit-btn";
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    editTask(li);
  });

  // Delete button
  const delBtn = document.createElement("button");
  delBtn.textContent = "🗑️";
  delBtn.className = "delete-btn";
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteTask(li);
  });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  li.appendChild(taskContent);
  li.appendChild(actions);

  // Touch events for mobile
  if (isTouchDevice) {
    setupTouchEvents(li);
  }

  elements.taskList.appendChild(li);
  animateTaskEntry(li);
  addActivityItem('Task added');
}

function setupTouchEvents(element) {
  let touchStartX = 0;
  let touchStartY = 0;
  
  element.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  element.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Swipe left to delete
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50) {
      const deleteBtn = element.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.click();
      }
    }
    // Swipe right to complete
    else if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 50) {
      const checkbox = element.querySelector('.task-checkbox');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    }
  }, { passive: true });
}

function animateTaskEntry(element) {
  element.style.opacity = '0';
  element.style.transform = 'translateY(-20px)';
  
  requestAnimationFrame(() => {
    element.style.transition = 'all 0.3s ease';
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  });
}

function editTask(taskElement) {
  const span = taskElement.querySelector('.task-text');
  const currentText = span.textContent;
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  input.className = 'task-edit-input';
  
  span.replaceWith(input);
  input.focus();
  input.select();

  const saveEdit = () => {
    const newText = input.value.trim();
    if (newText && newText !== currentText) {
      const newSpan = document.createElement('span');
      newSpan.className = 'task-text';
      newSpan.textContent = newText;
      input.replaceWith(newSpan);
      taskElement.setAttribute('data-text', newText.toLowerCase());
      saveTasks();
      showNotification('Task updated!', 'success');
    } else {
      const newSpan = document.createElement('span');
      newSpan.className = 'task-text';
      newSpan.textContent = currentText;
      input.replaceWith(newSpan);
    }
  };

  input.addEventListener('blur', saveEdit);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEdit();
  });
}

function deleteTask(taskElement) {
  taskElement.style.transition = 'all 0.3s ease';
  taskElement.style.opacity = '0';
  taskElement.style.transform = 'translateX(100%)';
  
  setTimeout(() => {
    taskElement.remove();
    saveTasks();
    updateTaskStats();
    updateDashboardStats();
    showNotification('Task deleted', 'info');
    addActivityItem('Task deleted');
  }, 300);
}

function handleAddNote() {
  const noteText = elements.noteInput.value.trim();
  if (noteText !== "") {
    addNote(noteText);
    elements.noteInput.value = "";
    saveNotes();
    showNotification('Note added!', 'success');
  }
}

function addNote(noteText) {
  const div = document.createElement("div");
  div.className = "note";
  div.setAttribute('data-text', noteText.toLowerCase());

  const noteContent = document.createElement("div");
  noteContent.className = "note-content";

  const span = document.createElement("span");
  span.className = "note-text";
  span.textContent = noteText;

  const timestamp = document.createElement("small");
  timestamp.className = "note-timestamp";
  timestamp.textContent = new Date().toLocaleString();

  noteContent.appendChild(span);
  noteContent.appendChild(timestamp);

  const delBtn = document.createElement("button");
  delBtn.textContent = "🗑️";
  delBtn.className = "note-delete-btn";
  delBtn.addEventListener("click", () => {
    div.style.transition = 'all 0.3s ease';
    div.style.opacity = '0';
    div.style.transform = 'scale(0.8)';
    setTimeout(() => {
      div.remove();
      saveNotes();
      updateDashboardStats();
    }, 300);
  });

  div.appendChild(noteContent);
  div.appendChild(delBtn);
  elements.notesDiv.appendChild(div);
  addActivityItem('Note added');
}

function handleAddReminder() {
  const text = elements.reminderText.value.trim();
  const time = elements.reminderTime.value;

  if (text !== "" && time !== "") {
    addReminder(text, time);
    elements.reminderText.value = "";
    elements.reminderTime.value = "";
    saveReminders();
    showNotification('Reminder set!', 'success');
  }
}

function addReminder(text, time) {
  const li = document.createElement("li");
  li.className = "reminder-item";

  const reminderContent = document.createElement("div");
  reminderContent.className = "reminder-content";
  reminderContent.textContent = `${text} 🕐 ${formatDateTime(time)}`;

  const delBtn = document.createElement("button");
  delBtn.textContent = "🗑️";
  delBtn.className = "reminder-delete-btn";
  delBtn.addEventListener("click", () => {
    li.remove();
    saveReminders();
    updateDashboardStats();
  });

  li.appendChild(reminderContent);
  li.appendChild(delBtn);
  elements.reminderList.appendChild(li);

  // Set up notification
  scheduleReminderNotification(text, new Date(time));
  addActivityItem('Reminder set');
}

function scheduleReminderNotification(text, date) {
  const now = Date.now();
  const reminderTime = date.getTime();
  const delay = reminderTime - now;

  if (delay > 0 && navigator.serviceWorker && 'Notification' in window) {
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('Task Reminder', {
          body: text,
          icon: '/icon-192x192.png',
          tag: 'task-reminder'
        });
      } else {
        showNotification(`Reminder: ${text}`, 'info', 5000);
      }
    }, delay);
  }
}

function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// =========================
// ===== CALENDAR =====
// =========================
function renderCalendar() {
  if (!elements.calendarDiv) return;

  const date = new Date();
  const month = date.getMonth();
  const year = date.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = date.getDate();

  let html = "<div class='calendar-header'>";
  html += `<h3>${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>`;
  html += "</div><div class='calendar-grid'><div class='calendar-weekdays'>";

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  days.forEach(d => html += `<div class='calendar-weekday'>${d}</div>`);
  
  html += "</div><div class='calendar-days'>";

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    html += "<div class='calendar-day empty'></div>";
  }

  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today;
    const weekend = new Date(year, month, d).getDay() === 0 || new Date(year, month, d).getDay() === 6;
    html += `<div class='calendar-day ${isToday ? 'today' : ''} ${weekend ? 'weekend' : ''}'>${d}</div>`;
  }

  html += "</div></div>";
  elements.calendarDiv.innerHTML = html;
}

// =========================
// ===== SEARCH AND FILTER =====
// =========================
function handleSearch(e) {
  searchTerm = e.target.value.toLowerCase();
  filterTasks();
}

function filterTasks() {
  const tasks = document.querySelectorAll('.task-item');
  tasks.forEach(task => {
    const taskText = task.getAttribute('data-text');
    const matchesSearch = taskText.includes(searchTerm);
    task.style.display = matchesSearch ? 'flex' : 'none';
  });
}

function handleSort() {
  const tasks = Array.from(elements.taskList.children);
  
  tasks.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.getAttribute('data-priority')] || 1;
    const bPriority = priorityOrder[b.getAttribute('data-priority')] || 1;
    
    if (currentSortOrder === 'priority') {
      return aPriority - bPriority;
    } else if (currentSortOrder === 'alphabetical') {
      return a.getAttribute('data-text').localeCompare(b.getAttribute('data-text'));
    }
    return 0;
  });
  
  elements.taskList.innerHTML = '';
  tasks.forEach(task => elements.taskList.appendChild(task));
  
  // Toggle sort order
  currentSortOrder = currentSortOrder === 'default' ? 'priority' : 
                    currentSortOrder === 'priority' ? 'alphabetical' : 'default';
  
  updateSortButtonText();
}

function updateSortButtonText() {
  if (elements.sortBtn) {
    const sortLabels = {
      'default': 'Sort: Default',
      'priority': 'Sort: Priority',
      'alphabetical': 'Sort: A-Z'
    };
    elements.sortBtn.textContent = sortLabels[currentSortOrder];
  }
}

// =========================
// ===== RESPONSIVE UI HELPERS =====
// =========================
function adjustLayoutForScreenSize() {
  const isMobile = window.innerWidth <= 768;
  const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
  
  document.body.className = '';
  if (isMobile) document.body.classList.add('mobile-view');
  if (isTablet) document.body.classList.add('tablet-view');
  
  // Adjust container sizes
  const containers = document.querySelectorAll('.todo-container, .notes-container, .reminders-container');
  containers.forEach(container => {
    if (isMobile) {
      container.style.margin = '20px 10px';
      container.style.padding = '20px 15px';
    } else if (isTablet) {
      container.style.margin = '40px 20px';
      container.style.padding = '30px 25px';
    } else {
      container.style.margin = '60px auto';
      container.style.padding = '40px 30px';
    }
  });
}

function toggleMobileMenu() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

function closeMobileMenu() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.remove('open');
  }
}

// =========================
// ===== NOTIFICATION SYSTEM =====
// =========================
function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.style.transform = 'translateY(0)';
    notification.style.opacity = '1';
  });
  
  // Remove after duration
  setTimeout(() => {
    notification.style.transform = 'translateY(-100%)';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

async function checkNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showNotification('Notifications enabled!', 'success');
      }
    } catch (error) {
      console.log('Notification permission denied');
    }
  }
}

// =========================
// ===== KEYBOARD SHORTCUTS =====
// =========================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (elements.searchInput) {
        elements.searchInput.focus();
      }
    }
    
    // Ctrl/Cmd + N for new task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      if (elements.taskInput) {
        elements.taskInput.focus();
      }
    }
    
    // Escape to close mobile menu
    if (e.key === 'Escape') {
      closeMobileMenu();
    }
  });
}

// =========================
// ===== TOUCH GESTURES =====
// =========================
function setupTouchGestures() {
  if (!isTouchDevice) return;
  
  let touchStartY = 0;
  let touchEndY = 0;
  
  document.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  
  document.addEventListener('touchend', (e) => {
    touchEndY = e.changedTouches[0].screenY;
    handleSwipeGesture();
  }, { passive: true });
  
  function handleSwipeGesture() {
    const swipeDistance = touchStartY - touchEndY;
    
    // Swipe down to refresh
    if (swipeDistance > 100 && window.scrollY === 0) {
      location.reload();
    }
  }
}

// =========================
// ===== UTILITY FUNCTIONS =====
// =========================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function updateTaskStats() {
  const totalTasks = document.querySelectorAll('.task-item').length;
  const completedTasks = document.querySelectorAll('.task-item.completed').length;
  
  const statsElement = document.getElementById('taskStats');
  if (statsElement) {
    statsElement.textContent = `${completedTasks} / ${totalTasks} completed`;
  }
}

// =========================
// ===== STORAGE FUNCTIONS =====
// =========================
function saveTasks() {
  const tasks = [];
  document.querySelectorAll("#taskList .task-item").forEach(li => {
    tasks.push({
      text: li.querySelector('.task-text').textContent,
      completed: li.classList.contains("completed"),
      priority: li.getAttribute('data-priority') || 'medium'
    });
  });
  localStorage.setItem("tasks", JSON.stringify(tasks));
  updateTaskStats();
}

function loadTasks() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks.forEach(t => {
    addTask(t.text);
    const lastTask = elements.taskList.lastChild;
    if (t.completed) {
      lastTask.classList.add("completed");
      lastTask.querySelector('.task-checkbox').checked = true;
    }
    lastTask.setAttribute('data-priority', t.priority);
    lastTask.querySelector('.task-priority').value = t.priority;
  });
  updateTaskStats();
  updateDashboardStats();
}

function saveNotes() {
  const notes = [];
  document.querySelectorAll("#notes .note .note-text").forEach(span => {
    notes.push({
      text: span.textContent,
      timestamp: span.nextElementSibling?.textContent || new Date().toLocaleString()
    });
  });
  localStorage.setItem("notes", JSON.stringify(notes));
}

function loadNotes() {
  const notes = JSON.parse(localStorage.getItem("notes")) || [];
  notes.forEach(n => addNote(n.text));
  updateDashboardStats();
}

function saveReminders() {
  const reminders = [];
  document.querySelectorAll("#reminderList .reminder-item").forEach(li => {
    const content = li.querySelector('.reminder-content').textContent;
    reminders.push(content);
  });
  localStorage.setItem("reminders", JSON.stringify(reminders));
}

function loadReminders() {
  const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
  reminders.forEach(r => {
    // Extract text and time from reminder format
    const match = r.match(/(.+?)\s+🕐\s+(.+)/);
    if (match) {
      const [, text, timeStr] = match;
      addReminder(text.trim(), timeStr.trim());
    }
  });
}

// =========================
// ===== THEME SWITCHER =====
// =========================
function clearThemes() {
  document.body.classList.remove('neon', 'dark');
}

function setTheme(theme) {
  clearThemes();
  if (theme) document.body.classList.add(theme);
  localStorage.setItem('theme', theme);
  showNotification(`Theme changed to ${theme || 'pastel'}`, 'success');
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.body.classList.add(savedTheme);
  }
}

// =========================
// ===== NAVIGATION SYSTEM =====
// =========================
function setupNavigation() {
  // Navigation item clicks
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageName = item.getAttribute('data-page');
      navigateToPage(pageName);
    });
  });

  // Mobile menu toggle
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const sidebar = document.getElementById('sidebar');
  
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024) {
      if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });
}

function navigateToPage(pageName) {
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));
  
  // Remove active class from all nav items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  
  // Show selected page
  const targetPage = document.getElementById(pageName + 'Page');
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  // Add active class to selected nav item
  const targetNavItem = document.querySelector(`.nav-item[data-page="${pageName}"]`);
  if (targetNavItem) {
    targetNavItem.classList.add('active');
  }
  
  // Update page-specific content
  updatePageContent(pageName);
  
  // Close mobile menu
  if (window.innerWidth <= 1024) {
    document.getElementById('sidebar').classList.remove('open');
  }
  
  // Track navigation
  addActivityItem(`Navigated to ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`);
}

function updatePageContent(pageName) {
  switch(pageName) {
    case 'home':
      updateDashboardStats();
      break;
    case 'calendar':
      renderCalendar();
      break;
    case 'settings':
      loadSettings();
      break;
  }
}

// =========================
// ===== DASHBOARD FUNCTIONALITY =====
// =========================
function updateDashboardStats() {
  // Update task counts
  const totalTasks = document.querySelectorAll('#taskList .task-item').length;
  const completedTasks = document.querySelectorAll('#taskList .task-item.completed').length;
  const totalNotes = document.querySelectorAll('#notes .note').length;
  const totalReminders = document.querySelectorAll('#reminderList .reminder-item').length;
  
  // Update display
  const totalTasksEl = document.getElementById('totalTasksCount');
  const completedTasksEl = document.getElementById('completedTasksCount');
  const totalNotesEl = document.getElementById('totalNotesCount');
  const activeRemindersEl = document.getElementById('activeRemindersCount');
  
  if (totalTasksEl) totalTasksEl.textContent = totalTasks;
  if (completedTasksEl) completedTasksEl.textContent = completedTasks;
  if (totalNotesEl) totalNotesEl.textContent = totalNotes;
  if (activeRemindersEl) activeRemindersEl.textContent = totalReminders;
}

function updateClock() {
  const now = new Date();
  const currentDateEl = document.getElementById('currentDate');
  const currentTimeEl = document.getElementById('currentTime');
  const dateFactsEl = document.getElementById('dateFacts');
  
  if (currentDateEl) {
    currentDateEl.textContent = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  if (currentTimeEl) {
    currentTimeEl.textContent = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }
  
  if (dateFactsEl) {
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const weekOfYear = Math.ceil(dayOfYear / 7);
    dateFactsEl.textContent = `Day ${dayOfYear} of ${now.getFullYear()} • Week ${weekOfYear}`;
  }
}

function addActivityItem(text) {
  const activityList = document.getElementById('recentActivityList');
  if (!activityList) return;
  
  const activityItem = document.createElement('div');
  activityItem.className = 'activity-item';
  activityItem.innerHTML = `
    <i class="fas fa-info-circle"></i>
    <span>${text}</span>
    <small>Just now</small>
  `;
  
  // Add to top of list
  activityList.insertBefore(activityItem, activityList.firstChild);
  
  // Keep only last 5 activities
  const activities = activityList.querySelectorAll('.activity-item');
  if (activities.length > 5) {
    activities[activities.length - 1].remove();
  }
}

// =========================
// ===== SETTINGS FUNCTIONALITY =====
// =========================
function loadSettings() {
  const themeSelect = document.getElementById('themeSelect');
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const notificationToggle = document.getElementById('notificationToggle');
  const soundToggle = document.getElementById('soundToggle');
  
  // Load saved settings
  const savedTheme = localStorage.getItem('theme') || 'pastel';
  const savedFontSize = localStorage.getItem('fontSize') || '16';
  const savedNotifications = localStorage.getItem('notifications') !== 'false';
  const savedSound = localStorage.getItem('sound') === 'true';
  
  if (themeSelect) themeSelect.value = savedTheme;
  if (fontSizeSlider) {
    fontSizeSlider.value = savedFontSize;
    if (fontSizeValue) fontSizeValue.textContent = savedFontSize + 'px';
    document.documentElement.style.fontSize = savedFontSize + 'px';
  }
  if (notificationToggle) notificationToggle.checked = savedNotifications;
  if (soundToggle) soundToggle.checked = savedSound;
  
  // Event listeners
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      setTheme(e.target.value);
    });
  }
  
  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', (e) => {
      const size = e.target.value;
      if (fontSizeValue) fontSizeValue.textContent = size + 'px';
      document.documentElement.style.fontSize = size + 'px';
      localStorage.setItem('fontSize', size);
    });
  }
  
  if (notificationToggle) {
    notificationToggle.addEventListener('change', (e) => {
      localStorage.setItem('notifications', e.target.checked);
    });
  }
  
  if (soundToggle) {
    soundToggle.addEventListener('change', (e) => {
      localStorage.setItem('sound', e.target.checked);
    });
  }
}

function clearAllData() {
  if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
    localStorage.clear();
    location.reload();
  }
}

function exportData() {
  const data = {
    tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
    notes: JSON.parse(localStorage.getItem('notes') || '[]'),
    reminders: JSON.parse(localStorage.getItem('reminders') || '[]'),
    theme: localStorage.getItem('theme'),
    fontSize: localStorage.getItem('fontSize'),
    timestamp: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('Data exported successfully!', 'success');
}

// =========================
// ===== CREATE UI ELEMENTS =====
// =========================
function createSearchInput() {
  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'searchInput';
  searchInput.placeholder = '🔍 Search tasks...';
  searchInput.className = 'search-input';
  
  searchContainer.appendChild(searchInput);
  
  const todoContainer = document.querySelector('.todo-container');
  if (todoContainer) {
    todoContainer.insertBefore(searchContainer, todoContainer.firstChild);
  }
  
  return searchInput;
}

function createSortButton() {
  const sortBtn = document.createElement('button');
  sortBtn.id = 'sortBtn';
  sortBtn.className = 'sort-btn';
  sortBtn.textContent = 'Sort: Default';
  
  const searchContainer = document.querySelector('.search-container');
  if (searchContainer) {
    searchContainer.appendChild(sortBtn);
  }
  
  return sortBtn;
}

function createMobileMenuBtn() {
  const menuBtn = document.createElement('button');
  menuBtn.id = 'mobileMenuBtn';
  menuBtn.className = 'mobile-menu-btn';
  menuBtn.innerHTML = '☰';
  menuBtn.setAttribute('aria-label', 'Toggle menu');
  
  document.body.appendChild(menuBtn);
  return menuBtn;
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addTask,
    addNote,
    addReminder,
    showNotification,
    setTheme
  };
}
